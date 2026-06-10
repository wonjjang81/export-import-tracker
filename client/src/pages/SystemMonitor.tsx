import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Calendar, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

interface CrawlHistory {
  id: number;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending';
  itemsFound: number;
  itemsAnalyzed: number;
  message: string;
}

interface ScheduleInfo {
  currentMode: 'peak' | 'buffer' | 'idle';
  nextScheduledTime: Date;
  lastExecutionTime: Date | null;
  executionCount: number;
  successRate: number;
}

export default function SystemMonitor() {
  const { user } = useAuth();
  const [crawlHistory, setCrawlHistory] = useState<CrawlHistory[]>([]);
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 모의 데이터 로드 (실제로는 API에서 가져옴)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 실제 API 호출 시 여기에 추가
        // const historyData = await trpc.monitor.getCrawlHistory.useQuery();
        // const scheduleData = await trpc.monitor.getScheduleInfo.useQuery();

        // 모의 데이터
        setCrawlHistory([
          {
            id: 1,
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            status: 'success',
            itemsFound: 3,
            itemsAnalyzed: 3,
            message: '수출입 동향 자료 3건 크롤링 완료',
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            status: 'success',
            itemsFound: 2,
            itemsAnalyzed: 2,
            message: '수출입 동향 자료 2건 크롤링 완료',
          },
          {
            id: 3,
            timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
            status: 'success',
            itemsFound: 1,
            itemsAnalyzed: 1,
            message: '수출입 동향 자료 1건 크롤링 완료',
          },
        ]);

        setScheduleInfo({
          currentMode: 'peak',
          nextScheduledTime: new Date(Date.now() + 5 * 60 * 1000),
          lastExecutionTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
          executionCount: 156,
          successRate: 98.7,
        });
      } catch (error) {
        console.error('Failed to load system monitor data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // 자동 새로고침
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadData, 30000); // 30초마다 새로고침
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatTime = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'peak':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'buffer':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'idle':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'peak':
        return '집중 크롤링 (5분 간격)';
      case 'buffer':
        return '버퍼 모드 (15분 간격)';
      case 'idle':
        return '대기 모드 (12시간 간격)';
      default:
        return '알 수 없음';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-6 flex items-center justify-center">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">시스템 모니터링</h1>
            <p className="text-slate-400">크롤링 스케줄 및 실행 상태 모니터링</p>
          </div>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {autoRefresh ? '자동 새로고침 ON' : '자동 새로고침 OFF'}
          </Button>
        </div>

        {/* 스케줄 정보 */}
        {scheduleInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 현재 모드 */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">현재 모드</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`px-3 py-2 rounded-lg border ${getModeColor(scheduleInfo.currentMode)} inline-block`}>
                  <div className="font-semibold text-sm">{getModeLabel(scheduleInfo.currentMode)}</div>
                </div>
              </CardContent>
            </Card>

            {/* 마지막 실행 */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">마지막 실행</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-white">
                    {scheduleInfo.lastExecutionTime ? getRelativeTime(scheduleInfo.lastExecutionTime) : '없음'}
                  </div>
                  {scheduleInfo.lastExecutionTime && (
                    <div className="text-xs text-slate-500">{formatTime(scheduleInfo.lastExecutionTime)}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 다음 예상 실행 */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">다음 예상 실행</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-blue-400">
                    {getRelativeTime(scheduleInfo.nextScheduledTime)}
                  </div>
                  <div className="text-xs text-slate-500">{formatTime(scheduleInfo.nextScheduledTime)}</div>
                </div>
              </CardContent>
            </Card>

            {/* 성공률 */}
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-400">성공률</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-400">{scheduleInfo.successRate}%</div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                      style={{ width: `${scheduleInfo.successRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 크롤링 이력 */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              크롤링 실행 이력
            </CardTitle>
            <CardDescription>최근 크롤링 작업 결과</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {crawlHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>크롤링 이력이 없습니다</p>
                </div>
              ) : (
                crawlHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    {/* 상태 아이콘 */}
                    <div className="flex-shrink-0 mt-1">
                      {item.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : item.status === 'failed' ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-400 animate-spin" />
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">{item.message}</span>
                        <Badge
                          variant="outline"
                          className={
                            item.status === 'success'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : item.status === 'failed'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }
                        >
                          {item.status === 'success' ? '성공' : item.status === 'failed' ? '실패' : '진행 중'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          찾음: {item.itemsFound}건
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          분석: {item.itemsAnalyzed}건
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {getRelativeTime(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 통계 정보 */}
        {scheduleInfo && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle>통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">총 실행 횟수</div>
                  <div className="text-2xl font-bold text-white">{scheduleInfo.executionCount}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">성공 횟수</div>
                  <div className="text-2xl font-bold text-green-400">
                    {Math.round((scheduleInfo.executionCount * scheduleInfo.successRate) / 100)}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">실패 횟수</div>
                  <div className="text-2xl font-bold text-red-400">
                    {Math.round((scheduleInfo.executionCount * (100 - scheduleInfo.successRate)) / 100)}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">평균 성공률</div>
                  <div className="text-2xl font-bold text-blue-400">{scheduleInfo.successRate.toFixed(1)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
