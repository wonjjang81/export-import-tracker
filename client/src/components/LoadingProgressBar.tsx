import { useLoading } from '@/contexts/LoadingContext';
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LoadingProgressBar() {
  const { isLoading, progress, currentStep, steps } = useLoading();
  const [displayProgress, setDisplayProgress] = useState(0);

  // 부드러운 진행률 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 50);
    return () => clearTimeout(timer);
  }, [progress]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-slate-700 shadow-2xl">
        {/* 헤더 */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">데이터 분석 중</h3>
          <p className="text-slate-400 text-sm">
            {currentStep?.label || '준비 중...'}
          </p>
        </div>

        {/* 메인 프로그레스 바 */}
        <div className="mb-8">
          {/* 백그라운드 바 */}
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden mb-3">
            {/* 진행 바 */}
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>

          {/* 퍼센트 표시 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">진행률</span>
            <span className="text-2xl font-bold text-white">{displayProgress}%</span>
          </div>
        </div>

        {/* 단계별 진행 상황 */}
        <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3">
              {/* 아이콘 */}
              <div className="flex-shrink-0 mt-1">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : step.status === 'in-progress' ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : step.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500" />
                )}
              </div>

              {/* 텍스트 및 진행률 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-400' :
                    step.status === 'in-progress' ? 'text-blue-400' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                  <span className="text-xs text-slate-500">{step.progress}%</span>
                </div>

                {/* 단계별 미니 프로그레스 바 */}
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      step.status === 'completed' ? 'bg-green-500' :
                      step.status === 'in-progress' ? 'bg-blue-500' :
                      step.status === 'error' ? 'bg-red-500' :
                      'bg-slate-600'
                    }`}
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 예상 시간 */}
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-400">
            예상 완료 시간: <span className="text-slate-300 font-medium">
              {Math.max(1, Math.round((100 - displayProgress) / 2))}초
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoadingProgressBar;
