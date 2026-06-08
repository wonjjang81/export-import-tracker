import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, Zap, Bell, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 네비게이션 */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-bold text-white">수출입 동향 분석</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-slate-300">안녕하세요, {user?.name || '사용자'}님</span>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  대시보드 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => window.location.href = `${import.meta.env.VITE_OAUTH_PORTAL_URL}`}
                className="bg-blue-600 hover:bg-blue-700"
              >
                로그인
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              산업부 수출입 동향을
              <span className="text-blue-400"> 실시간 분석</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              AI 기반 시계열 분석으로 수출입 추이를 예측하고, 
              테마별·업종별 인사이트를 한눈에 파악하세요.
            </p>
            <div className="flex gap-4">
              {isAuthenticated ? (
                <Button 
                  onClick={() => navigate('/dashboard')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  분석 시작하기 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={() => window.location.href = `${import.meta.env.VITE_OAUTH_PORTAL_URL}`}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  시작하기 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-8 border border-slate-700">
              <div className="space-y-4">
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">수출액</span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">$500.2B</div>
                  <div className="text-xs text-green-400 mt-1">+15.3% YoY</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">수입액</span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">$450.8B</div>
                  <div className="text-xs text-green-400 mt-1">+12.1% YoY</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">무역수지</span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-green-400">+$49.4B</div>
                  <div className="text-xs text-slate-400 mt-1">흑자 상태</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 기능 소개 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">주요 기능</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 자동 크롤링 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">자동 크롤링</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                산업부 보도자료를 매월 자동으로 수집하고 최신 데이터를 실시간 반영합니다.
              </p>
            </CardContent>
          </Card>

          {/* 시계열 분석 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">시계열 분석</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                3년 이상의 히스토리 데이터를 기반으로 트렌드와 계절성을 분석합니다.
              </p>
            </CardContent>
          </Card>

          {/* 확률 기반 예측 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle className="text-white">확률 예측</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                SES, Holt-Winters 모델로 향후 12개월 수출입 추이를 95% 신뢰도로 예측합니다.
              </p>
            </CardContent>
          </Card>

          {/* 실시간 알림 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">실시간 알림</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                신규 데이터 크롤링 및 분석 완료 시 즉시 푸시 알림을 받습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 분석 대상 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-white mb-12 text-center">분석 대상</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { theme: "🌱 Green Energy", industries: ["Solar", "Wind", "Battery"] },
            { theme: "⚡ Electronics", industries: ["Semiconductors", "Display", "Components"] },
            { theme: "🧪 Chemicals", industries: ["Petrochemical", "Fine Chemical", "Materials"] },
            { theme: "👕 Textiles", industries: ["Fabric", "Apparel", "Home Textiles"] },
            { theme: "🚗 Automotive", industries: ["Vehicles", "Parts", "EV Components"] },
          ].map((item, idx) => (
            <Card key={idx} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">{item.theme}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {item.industries.map((ind, i) => (
                    <li key={i} className="text-sm text-slate-400">• {ind}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">지금 바로 시작하세요</h2>
          <p className="text-xl text-blue-100 mb-8">
            AI 기반 수출입 동향 분석으로 시장 인사이트를 확보하세요.
          </p>
          {isAuthenticated ? (
            <Button 
              onClick={() => navigate('/dashboard')}
              size="lg"
              className="bg-white text-blue-600 hover:bg-slate-100"
            >
              대시보드 열기 <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={() => window.location.href = `${import.meta.env.VITE_OAUTH_PORTAL_URL}`}
              size="lg"
              className="bg-white text-blue-600 hover:bg-slate-100"
            >
              로그인하기 <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-slate-700 bg-slate-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-slate-400">
            <p>&copy; 2026 Export-Import Trends Analyzer. All rights reserved.</p>
            <p className="mt-2 text-sm">산업통상자원부 공식 데이터 기반 분석</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
