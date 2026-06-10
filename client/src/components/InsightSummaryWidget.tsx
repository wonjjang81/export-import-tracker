import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';

export interface InsightData {
  lastUpdate: Date;
  topTheme: string;
  topIndustry: string;
  exportTrend: 'up' | 'down' | 'stable';
  exportChange: number; // 퍼센트
  importTrend: 'up' | 'down' | 'stable';
  importChange: number; // 퍼센트
  tradeBalance: number; // 백만 달러
  alerts: Array<{
    type: 'warning' | 'info' | 'success';
    message: string;
  }>;
  keyInsights: string[];
  nextExpectedUpdate: Date;
}

interface InsightSummaryWidgetProps {
  data?: InsightData;
  isLoading?: boolean;
}

export function InsightSummaryWidget({ data, isLoading = false }: InsightSummaryWidgetProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">핵심 인사이트</CardTitle>
          <CardDescription>분석 중...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-slate-700 rounded animate-pulse w-1/2" />
            <div className="h-4 bg-slate-700 rounded animate-pulse w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">핵심 인사이트</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">분석 데이터가 없습니다</p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 text-slate-400">→</div>;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getAlertColor = (type: 'warning' | 'info' | 'success') => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-slate-700 overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              핵심 인사이트
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              최종 업데이트: {data.lastUpdate.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
            실시간
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        {/* 주요 지표 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 수출 트렌드 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">수출</span>
              {getTrendIcon(data.exportTrend)}
            </div>
            <div className={`text-lg font-bold ${getTrendColor(data.exportTrend)}`}>
              {data.exportChange > 0 ? '+' : ''}{data.exportChange.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {data.exportTrend === 'up' ? '증가 추세' : data.exportTrend === 'down' ? '감소 추세' : '안정적'}
            </div>
          </div>

          {/* 수입 트렌드 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">수입</span>
              {getTrendIcon(data.importTrend)}
            </div>
            <div className={`text-lg font-bold ${getTrendColor(data.importTrend)}`}>
              {data.importChange > 0 ? '+' : ''}{data.importChange.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {data.importTrend === 'up' ? '증가 추세' : data.importTrend === 'down' ? '감소 추세' : '안정적'}
            </div>
          </div>

          {/* 무역수지 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-lg p-3 border border-slate-700/50 col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">무역수지</span>
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            <div className={`text-lg font-bold ${data.tradeBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${data.tradeBalance > 0 ? '+' : ''}
              {(data.tradeBalance / 1000).toFixed(1)}B
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {data.tradeBalance > 0 ? '흑자' : '적자'}
            </div>
          </div>
        </div>

        {/* 주요 테마/업종 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-3 border border-slate-700/50 space-y-2">
          <div className="text-xs font-semibold text-slate-300">주목 분야</div>
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
              {data.topTheme}
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs">
              {data.topIndustry}
            </Badge>
          </div>
        </div>

        {/* 주요 인사이트 */}
        {data.keyInsights.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">주요 인사이트</div>
            <div className="space-y-1.5">
              {data.keyInsights.slice(0, 3).map((insight, idx) => (
                <div key={idx} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-blue-400 flex-shrink-0">•</span>
                  <span className="line-clamp-2">{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 알림 */}
        {data.alerts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">주의사항</div>
            <div className="space-y-1.5">
              {data.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 text-xs p-2 rounded border ${getAlertColor(alert.type)}`}
                >
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다음 업데이트 예상 시간 */}
        <div className="bg-slate-800/50 backdrop-blur rounded-lg p-2 border border-slate-700/50 text-xs text-slate-400">
          다음 업데이트: {data.nextExpectedUpdate.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
      </CardContent>
    </Card>
  );
}
