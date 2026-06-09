import { useLoading } from '@/contexts/LoadingContext';
import { CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';

export function LoadingProgressBar() {
  const { isLoading, progress, currentStep, steps, logs, cancelLoading } = useLoading();
  const [displayProgress, setDisplayProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(() => Date.now());
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 부드러운 진행률 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 50);
    return () => clearTimeout(timer);
  }, [progress]);

  // 경과 시간 업데이트
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  // 로그 자동 스크롤
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // 예상 완료 시간 계산
  const estimatedTimeRemaining = useMemo(() => {
    if (displayProgress === 0) return 0;
    if (displayProgress === 100) return 0;
    
    const estimatedTotalTime = (elapsedTime / displayProgress) * 100;
    const remaining = Math.max(0, Math.ceil(estimatedTotalTime - elapsedTime));
    return remaining;
  }, [displayProgress, elapsedTime]);

  // 시간 포맷팅 함수
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}분 ${secs}초`;
    }
    return `${secs}초`;
  };

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-2xl p-8 max-w-2xl w-full mx-4 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">데이터 분석 중</h3>
            <p className="text-slate-400 text-sm">
              {currentStep?.label || '준비 중...'}
            </p>
          </div>
          <button
            onClick={cancelLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 text-sm flex-shrink-0 ml-4"
          >
            중지
          </button>
        </div>

        {/* 메인 프로그레스 바 */}
        <div className="mb-8">
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">진행률</span>
            <span className="text-2xl font-bold text-white">{displayProgress}%</span>
          </div>
        </div>

        {/* 단계별 진행 상황 */}
        <div className="space-y-3 mb-6 max-h-40 overflow-y-auto">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
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

        {/* 작업 로그 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-2">작업 로그</h4>
          <div className="bg-slate-950 rounded-lg p-3 h-48 overflow-y-auto border border-slate-700 space-y-1.5 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">작업 로그가 없습니다</p>
            ) : (
              <>
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-4 text-center">
                      {log.level === 'success' && <span className="text-green-400">✓</span>}
                      {log.level === 'error' && <span className="text-red-400">✕</span>}
                      {log.level === 'warning' && <span className="text-yellow-400">⚠</span>}
                      {log.level === 'info' && <span className="text-blue-400">ℹ</span>}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <span className={`${
                        log.level === 'success' ? 'text-green-400' :
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'warning' ? 'text-yellow-400' :
                        'text-slate-300'
                      }`}>
                        {log.message}
                      </span>
                      <span className="text-slate-600 ml-2">
                        [{log.timestamp.toLocaleTimeString('ko-KR', { hour12: false })}]
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </div>

        {/* 시간 정보 */}
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">경과 시간</span>
            <span className="text-sm font-bold text-blue-400">{formatTime(elapsedTime)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">예상 남은 시간</span>
            <span className="text-sm font-bold text-green-400">{formatTime(estimatedTimeRemaining)}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            <span className="text-xs text-slate-400">예상 총 시간</span>
            <span className="text-sm font-bold text-purple-400">{formatTime(elapsedTime + estimatedTimeRemaining)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingProgressBar;
