import React, { createContext, useContext, useState, useCallback } from 'react';

export interface LoadingStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number; // 0-100
}

export interface LogMessage {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

interface LoadingContextType {
  isLoading: boolean;
  isCancelled: boolean;
  isSuspended: boolean;
  progress: number; // 0-100
  currentStep: LoadingStep | null;
  steps: LoadingStep[];
  logs: LogMessage[];
  
  // 로딩 시작
  startLoading: (initialSteps: LoadingStep[]) => void;
  
  // 단계 업데이트
  updateStep: (stepId: string, updates: Partial<LoadingStep>) => void;
  
  // 전체 진행률 업데이트
  setProgress: (progress: number) => void;
  
  // 로그 메시지 추가
  addLog: (message: string, level?: 'info' | 'success' | 'warning' | 'error') => void;
  
  // 로그 초기화
  clearLogs: () => void;
  
  // 로딩 완료
  completeLoading: () => void;
  
  // 로딩 취소
  cancelLoading: () => void;
  
  // 로딩 일시 중지 (이어서 진행 가능)
  suspendLoading: () => void;
  
  // 처음부터 재시작
  restartFromBeginning: (initialSteps: LoadingStep[]) => void;
  
  // 이어서 재시작
  resumeLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [progress, setProgressState] = useState(0);
  const [steps, setSteps] = useState<LoadingStep[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [suspendedSteps, setSuspendedSteps] = useState<LoadingStep[]>([]);

  const addLog = useCallback((message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const logMessage: LogMessage = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      message,
    };
    setLogs(prevLogs => [...prevLogs, logMessage]);
  }, []);

  const startLoading = useCallback((initialSteps: LoadingStep[]) => {
    setIsLoading(true);
    setProgressState(0);
    setSteps(initialSteps.map(step => ({ ...step, status: 'pending' as const, progress: 0 })));
    setLogs([]);
    setIsCancelled(false);
    setIsSuspended(false);
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

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const cancelLoading = useCallback(() => {
    setIsLoading(false);
    setIsCancelled(true);
    setIsSuspended(true);
    setSuspendedSteps(steps);
    addLog('분석이 중지되었습니다.', 'warning');
  }, [steps, addLog]);

  const suspendLoading = useCallback(() => {
    setIsLoading(false);
    setIsSuspended(true);
    setSuspendedSteps(steps);
    addLog('분석이 일시 중지되었습니다.', 'info');
  }, [steps, addLog]);

  const restartFromBeginning = useCallback((initialSteps: LoadingStep[]) => {
    setIsLoading(true);
    setIsCancelled(false);
    setIsSuspended(false);
    setProgressState(0);
    setSteps(initialSteps.map(step => ({ ...step, status: 'pending' as const, progress: 0 })));
    setLogs([]);
    setSuspendedSteps([]);
    addLog('분석을 처음부터 다시 시작합니다.', 'info');
  }, [addLog]);

  const resumeLoading = useCallback(() => {
    if (suspendedSteps.length > 0) {
      setIsLoading(true);
      setIsSuspended(false);
      setSteps(suspendedSteps);
      addLog('분석을 이어서 진행합니다.', 'info');
      // 로그는 유지
    }
  }, [suspendedSteps, addLog]);

  const currentStep = steps.find(s => s.status === 'in-progress') || steps[0];

  const value: LoadingContextType = {
    isLoading,
    isCancelled,
    isSuspended,
    progress,
    currentStep: currentStep || null,
    steps,
    logs,
    startLoading,
    updateStep,
    setProgress,
    addLog,
    clearLogs,
    completeLoading,
    cancelLoading,
    suspendLoading,
    restartFromBeginning,
    resumeLoading,
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
