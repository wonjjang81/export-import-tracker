import React, { createContext, useContext, useState, useCallback } from 'react';

export interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number; // 0-100
}

interface LoadingContextType {
  isLoading: boolean;
  progress: number; // 0-100
  currentStep: LoadingStep | null;
  steps: LoadingStep[];
  
  // 로딩 시작
  startLoading: (initialSteps: LoadingStep[]) => void;
  
  // 단계 업데이트
  updateStep: (stepId: string, updates: Partial<LoadingStep>) => void;
  
  // 전체 진행률 업데이트
  setProgress: (progress: number) => void;
  
  // 로딩 완료
  completeLoading: () => void;
  
  // 로딩 취소
  cancelLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgressState] = useState(0);
  const [steps, setSteps] = useState<LoadingStep[]>([]);

  const startLoading = useCallback((initialSteps: LoadingStep[]) => {
    setIsLoading(true);
    setProgressState(0);
    setSteps(initialSteps.map(step => ({ ...step, status: 'pending' as const, progress: 0 })));
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<LoadingStep>) => {
    setSteps(prevSteps => {
      const newSteps = prevSteps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      );
      
      // 전체 진행률 계산
      const totalProgress = newSteps.reduce((sum, step) => sum + step.progress, 0) / newSteps.length;
      setProgressState(Math.round(totalProgress));
      
      return newSteps;
    });
  }, []);

  const setProgress = useCallback((newProgress: number) => {
    setProgressState(Math.min(100, Math.max(0, newProgress)));
  }, []);

  const completeLoading = useCallback(() => {
    setProgressState(100);
    setSteps(prevSteps => 
      prevSteps.map(step => ({ ...step, status: 'completed' as const, progress: 100 }))
    );
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  const cancelLoading = useCallback(() => {
    setIsLoading(false);
    setProgressState(0);
    setSteps([]);
  }, []);

  const currentStep = steps.find(s => s.status === 'in-progress') || steps[0];

  const value: LoadingContextType = {
    isLoading,
    progress,
    currentStep: currentStep || null,
    steps,
    startLoading,
    updateStep,
    setProgress,
    completeLoading,
    cancelLoading,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
