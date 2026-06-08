import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useLoading } from '@/contexts/LoadingContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [selectedTheme, setSelectedTheme] = useState('Green Energy');
  const [selectedIndustry, setSelectedIndustry] = useState('Solar');
  const [selectedMonths, setSelectedMonths] = useState('36');
  
  const { startLoading, updateStep, completeLoading } = useLoading();

  // 대시보드 요약 데이터
  const { data: summaryData, isLoading: summaryLoading } = trpc.trends.getDashboardSummary.useQuery();

  // 시계열 분석 데이터
  const { data: analysisData, isLoading: analysisLoading } = trpc.trends.analyzeTimeSeries.useQuery(
    {
      theme: selectedTheme,
      industry: selectedIndustry,
      months: parseInt(selectedMonths),
    },
    { enabled: !!selectedTheme && !!selectedIndustry }
  );

  // 최근 트렌드 데이터
  const { data: trendsData, isLoading: trendsLoading } = trpc.trends.getLatestTrends.useQuery({
    months: parseInt(selectedMonths),
  });

  // 로딩 상태 관리
  useEffect(() => {
    const isAnyLoading = summaryLoading || analysisLoading || trendsLoading;
    
    if (isAnyLoading) {
      startLoading([
        { id: 'summary', label: '대시보드 요약 데이터 로드', status: 'pending', progress: 0 },
        { id: 'analysis', label: '시계열 분석 수행', status: 'pending', progress: 0 },
        { id: 'trends', label: '트렌드 데이터 분석', status: 'pending', progress: 0 },
      ]);

      // 각 데이터 로딩 상태 업데이트
      if (summaryLoading) {
        updateStep('summary', { status: 'in-progress', progress: 30 });
      } else {
        updateStep('summary', { status: 'completed', progress: 100 });
      }

      if (analysisLoading) {
        updateStep('analysis', { status: 'in-progress', progress: 50 });
      } else {
        updateStep('analysis', { status: 'completed', progress: 100 });
      }

      if (trendsLoading) {
        updateStep('trends', { status: 'in-progress', progress: 70 });
      } else {
        updateStep('trends', { status: 'completed', progress: 100 });
      }

      // 모든 로딩이 완료되면
      if (!isAnyLoading) {
        completeLoading();
      }
    }
  }, [summaryLoading, analysisLoading, trendsLoading, startLoading, updateStep, completeLoading]);

  const isLoading = summaryLoading || analysisLoading || trendsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          수출입 동향 분석 대시보드
        </h1>
        <p className="text-slate-400">
          {summaryData?.data?.latestMonth ? `최신 데이터: ${summaryData.data.latestMonth}` : '데이터 로딩 중...'}
        </p>
      </div>

      {/* 핵심 지표 카드 */}
      {summaryData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 수출액 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">총 수출액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${(((summaryData.data.totalExport ?? 0) / 1e9)).toFixed(2)}B
              </div>
              <div className={`text-sm mt-1 flex items-center ${(summaryData.data.exportGrowth ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(summaryData.data.exportGrowth ?? 0) >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                {Math.abs(summaryData.data.exportGrowth ?? 0).toFixed(1)}% YoY
              </div>
            </CardContent>
          </Card>

          {/* 수입액 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">총 수입액</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                ${(((summaryData.data.totalImport ?? 0) / 1e9)).toFixed(2)}B
              </div>
              <div className={`text-sm mt-1 flex items-center ${(summaryData.data.importGrowth ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(summaryData.data.importGrowth ?? 0) >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                {Math.abs(summaryData.data.importGrowth ?? 0).toFixed(1)}% YoY
              </div>
            </CardContent>
          </Card>

          {/* 무역수지 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">무역수지</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summaryData.data.tradingBalance ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${(((summaryData.data.tradingBalance ?? 0) / 1e9)).toFixed(2)}B
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {(summaryData.data.tradingBalance ?? 0) >= 0 ? '흑자' : '적자'}
              </div>
            </CardContent>
          </Card>

          {/* 성장성 */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">평균 성장률</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {(((((summaryData.data.exportGrowth ?? 0) + (summaryData.data.importGrowth ?? 0)) / 2))).toFixed(1)}%
              </div>
              <div className="text-sm text-slate-400 mt-1 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                연평균 성장률
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 및 분석 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* 필터 카드 */}
        <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">분석 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">테마</label>
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="Green Energy">🌱 Green Energy</SelectItem>
                  <SelectItem value="Electronics">⚡ Electronics</SelectItem>
                  <SelectItem value="Chemicals">🧪 Chemicals</SelectItem>
                  <SelectItem value="Textiles">👕 Textiles</SelectItem>
                  <SelectItem value="Automotive">🚗 Automotive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">업종</label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="Solar">Solar</SelectItem>
                  <SelectItem value="Wind">Wind</SelectItem>
                  <SelectItem value="Battery">Battery</SelectItem>
                  <SelectItem value="Semiconductors">Semiconductors</SelectItem>
                  <SelectItem value="Display">Display</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">분석 기간</label>
              <Select value={selectedMonths} onValueChange={setSelectedMonths}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="12">12개월</SelectItem>
                  <SelectItem value="24">24개월</SelectItem>
                  <SelectItem value="36">36개월 (3년)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 분석 결과 요약 */}
        {analysisData?.data && (
          <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">{analysisData.data.theme} / {analysisData.data.industry}</CardTitle>
              <CardDescription className="text-slate-400">
                {analysisData.data.metadata.dataPoints}개월 데이터 분석
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 트렌드 */}
                <div>
                  <div className="text-sm text-slate-400 mb-1">트렌드</div>
                  <div className="text-lg font-semibold text-white">
                    {analysisData.data.trend.direction === 'increasing' ? '📈 상승' : 
                     analysisData.data.trend.direction === 'decreasing' ? '📉 하락' : '➡️ 안정'}
                  </div>
                  <div className="text-xs text-slate-500">강도: {analysisData.data.trend.strength}%</div>
                </div>

                {/* 위험도 */}
                <div>
                  <div className="text-sm text-slate-400 mb-1">위험도</div>
                  <div className="text-lg font-semibold">
                    {analysisData.data.probability.riskLevel === 'low' ? '🟢 낮음' :
                     analysisData.data.probability.riskLevel === 'medium' ? '🟡 중간' : '🔴 높음'}
                  </div>
                  <div className="text-xs text-slate-500">변동성: {analysisData.data.probability.volatility}%</div>
                </div>

                {/* 성장 확률 */}
                <div>
                  <div className="text-sm text-slate-400 mb-1">성장 확률</div>
                  <div className="text-lg font-semibold text-green-400">
                    {analysisData.data.probability.growthProbability}%
                  </div>
                </div>

                {/* 계절성 */}
                <div>
                  <div className="text-sm text-slate-400 mb-1">계절성</div>
                  <div className="text-lg font-semibold text-white">
                    {analysisData.data.seasonality.detected ? '✓ 감지됨' : '✗ 없음'}
                  </div>
                  <div className="text-xs text-slate-500">강도: {analysisData.data.seasonality.strength}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 차트 섹션 */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="trends" className="text-slate-300">월별 추이</TabsTrigger>
          <TabsTrigger value="forecast" className="text-slate-300">예측</TabsTrigger>
          <TabsTrigger value="seasonality" className="text-slate-300">계절성</TabsTrigger>
        </TabsList>

        {/* 월별 추이 차트 */}
        <TabsContent value="trends">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle>월별 수출입 추이</CardTitle>
            </CardHeader>
            <CardContent>
              {trendsData?.data && trendsData.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendsData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="export" stroke="#3b82f6" strokeWidth={2} name="수출" />
                    <Line type="monotone" dataKey="import" stroke="#ef4444" strokeWidth={2} name="수입" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  데이터 로딩 중...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 예측 차트 */}
        <TabsContent value="forecast">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle>향후 12개월 예측</CardTitle>
              <CardDescription className="text-slate-400">
                95% 신뢰도 구간 포함
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysisData?.data?.forecast?.next12Months && analysisData.data.forecast.next12Months.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analysisData.data.forecast.next12Months}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(value: any) => value?.toFixed(2)}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="예측값" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  예측 데이터 로딩 중...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 계절성 패턴 */}
        <TabsContent value="seasonality">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle>계절성 패턴 (월별 계수)</CardTitle>
            </CardHeader>
            <CardContent>
              {analysisData?.data?.seasonality?.pattern && analysisData.data.seasonality.pattern.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysisData.data.seasonality.pattern.map((value, index) => ({
                    month: `${index + 1}월`,
                    coefficient: value,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="month" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(value: any) => value?.toFixed(3)}
                    />
                    <Bar dataKey="coefficient" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  계절성 데이터 로딩 중...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
