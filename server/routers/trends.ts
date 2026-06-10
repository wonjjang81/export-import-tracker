/**
 * 수출입 동향 분석 라우터
 * 시계열 분석, 예측, 시각화 데이터 제공
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { timeSeriesAnalyzer } from '../timeSeriesAnalyzer';
import { generateInsights } from '../insightGenerator';
import { getRecentExportImportTrends } from '../db';

export const trendsRouter = router({
  /**
   * 최근 트렌드 데이터 조회 (대시보드용)
   */
  getLatestTrends: publicProcedure
    .input(z.object({
      months: z.number().min(3).max(36).default(12),
    }))
    .query(async ({ input }) => {
      try {
        const trends = await getRecentExportImportTrends(input.months);
        
        return {
          success: true,
          data: trends.map(t => ({
            yearMonth: t.yearMonth,
            totalExport: typeof t.totalExport === 'string' ? parseFloat(t.totalExport) : t.totalExport,
            totalImport: typeof t.totalImport === 'string' ? parseFloat(t.totalImport) : t.totalImport,
            tradingBalance: typeof t.tradingBalance === 'string' ? parseFloat(t.tradingBalance) : t.tradingBalance,
            exportYoYGrowth: typeof t.exportYoYGrowth === 'string' ? parseFloat(t.exportYoYGrowth) : t.exportYoYGrowth,
            importYoYGrowth: typeof t.importYoYGrowth === 'string' ? parseFloat(t.importYoYGrowth) : t.importYoYGrowth,
            createdAt: t.createdAt,
          })),
          count: trends.length,
        };
      } catch (error) {
        console.error('[trendsRouter] Error getting latest trends:', error);
        return {
          success: false,
          data: [],
          count: 0,
          error: 'Failed to fetch trends',
        };
      }
    }),

  /**
   * 시계열 분석 결과 조회
   */
  analyzeTimeSeries: publicProcedure
    .input(z.object({
      theme: z.string().min(1),
      industry: z.string().min(1),
      months: z.number().min(12).max(36).default(36),
    }))
    .query(async ({ input }) => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - input.months);

        const analysis = await timeSeriesAnalyzer.analyzeTimeSeries(
          input.theme,
          input.industry,
          startDate,
          endDate
        );

        return {
          success: true,
          data: {
            theme: analysis.theme,
            industry: analysis.industry,
            
            // 통계
            statistics: {
              mean: Math.round(analysis.mean * 100) / 100,
              stdDev: Math.round(analysis.stdDev * 100) / 100,
              min: Math.round(analysis.min * 100) / 100,
              max: Math.round(analysis.max * 100) / 100,
            },
            
            // 트렌드
            trend: {
              direction: analysis.trend,
              strength: Math.round(analysis.trendStrength * 100),
            },
            
            // 계절성
            seasonality: {
              detected: analysis.seasonality.detected,
              period: analysis.seasonality.period,
              strength: Math.round(analysis.seasonality.strength * 100),
              pattern: analysis.seasonality.pattern.map(p => Math.round(p * 100) / 100),
            },
            
            // 예측
            forecast: {
              next3Months: analysis.forecast.next3Months.map(f => ({
                month: f.month,
                value: Math.round(f.value * 100) / 100,
                ci95: [Math.round(f.ci95[0] * 100) / 100, Math.round(f.ci95[1] * 100) / 100],
                ci80: [Math.round(f.ci80[0] * 100) / 100, Math.round(f.ci80[1] * 100) / 100],
              })),
              next6Months: analysis.forecast.next6Months.map(f => ({
                month: f.month,
                value: Math.round(f.value * 100) / 100,
                ci95: [Math.round(f.ci95[0] * 100) / 100, Math.round(f.ci95[1] * 100) / 100],
                ci80: [Math.round(f.ci80[0] * 100) / 100, Math.round(f.ci80[1] * 100) / 100],
              })),
              next12Months: analysis.forecast.next12Months.map(f => ({
                month: f.month,
                value: Math.round(f.value * 100) / 100,
                ci95: [Math.round(f.ci95[0] * 100) / 100, Math.round(f.ci95[1] * 100) / 100],
                ci80: [Math.round(f.ci80[0] * 100) / 100, Math.round(f.ci80[1] * 100) / 100],
              })),
            },
            
            // 확률 분석
            probability: {
              growthProbability: Math.round(analysis.probability.growthProbability * 100),
              declineProbability: Math.round(analysis.probability.declineProbability * 100),
              volatility: Math.round(analysis.probability.volatility * 100) / 100,
              riskLevel: analysis.probability.riskLevel,
            },
            
            // 메타데이터
            metadata: {
              analysisDate: analysis.analysisDate.toISOString(),
              dataPoints: analysis.dataPoints3Year,
              dataQuality: analysis.dataQuality,
            },
          },
        };
      } catch (error) {
        console.error('[trendsRouter] Error analyzing time series:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Analysis failed',
        };
      }
    }),

  /**
   * 다중 테마/업종 분석
   */
  analyzeMultiple: publicProcedure
    .input(z.object({
      themes: z.array(z.string()).min(1),
      industries: z.array(z.string()).min(1),
      months: z.number().min(12).max(36).default(36),
    }))
    .query(async ({ input }) => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - input.months);

        const results = await timeSeriesAnalyzer.analyzeMultipleTimeSeries(
          input.themes,
          input.industries,
          startDate,
          endDate
        );

        return {
          success: true,
          data: results.map(analysis => ({
            theme: analysis.theme,
            industry: analysis.industry,
            trend: analysis.trend,
            trendStrength: Math.round(analysis.trendStrength * 100),
            probability: {
              growth: Math.round(analysis.probability.growthProbability * 100),
              volatility: Math.round(analysis.probability.volatility * 100) / 100,
              riskLevel: analysis.probability.riskLevel,
            },
            seasonality: {
              detected: analysis.seasonality.detected,
              strength: Math.round(analysis.seasonality.strength * 100),
            },
          })),
          count: results.length,
        };
      } catch (error) {
        console.error('[trendsRouter] Error analyzing multiple:', error);
        return {
          success: false,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : 'Analysis failed',
        };
      }
    }),

  /**
   * 상관관계 분석
   */
  analyzeCorrelation: publicProcedure
    .input(z.object({
      theme1: z.string(),
      industry1: z.string(),
      theme2: z.string(),
      industry2: z.string(),
      months: z.number().min(12).max(36).default(36),
    }))
    .query(async ({ input }) => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - input.months);

        const analysis1 = await timeSeriesAnalyzer.analyzeTimeSeries(
          input.theme1,
          input.industry1,
          startDate,
          endDate
        );

        const analysis2 = await timeSeriesAnalyzer.analyzeTimeSeries(
          input.theme2,
          input.industry2,
          startDate,
          endDate
        );

        const correlation = await timeSeriesAnalyzer.analyzeCorrelations(analysis1, analysis2);

        return {
          success: true,
          data: {
            series1: `${input.theme1} / ${input.industry1}`,
            series2: `${input.theme2} / ${input.industry2}`,
            correlation: Math.round(correlation.correlation * 100) / 100,
            interpretation: correlation.interpretation,
            strength: Math.abs(correlation.correlation) > 0.7 ? 'strong' : 
                     Math.abs(correlation.correlation) > 0.4 ? 'moderate' : 'weak',
          },
        };
      } catch (error) {
        console.error('[trendsRouter] Error analyzing correlation:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Correlation analysis failed',
        };
      }
    }),

  /**
   * 핵심 인사이트 자동 생성
   */
  generateInsights: publicProcedure
    .input(z.object({
      theme: z.string().min(1),
      industry: z.string().min(1),
      months: z.number().min(12).max(36).default(36),
    }))
    .query(async ({ input }) => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - input.months);

        const analysis = await timeSeriesAnalyzer.analyzeTimeSeries(
          input.theme,
          input.industry,
          startDate,
          endDate
        );

        const insights = await generateInsights({
          exportValue: analysis.mean * 1e9,
          importValue: analysis.mean * 1e9 * 0.9,
          exportGrowth: analysis.probability.growthProbability > 50 ? 5 : -3,
          importGrowth: analysis.probability.growthProbability > 50 ? 4 : -2,
          tradeBalance: analysis.mean * 1e9 * 0.1,
          theme: input.theme,
          industry: input.industry,
          trendDirection: analysis.trend as 'increasing' | 'decreasing' | 'stable',
          riskLevel: analysis.probability.riskLevel,
          volatility: analysis.probability.volatility,
          seasonalityDetected: analysis.seasonality.detected,
          growthProbability: analysis.probability.growthProbability,
        });

        return {
          success: true,
          data: insights,
        };
      } catch (error) {
        console.error('[trendsRouter] Error generating insights:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Failed to generate insights',
        };
      }
    }),

  /**
   * 대시보드 요약 데이터
   */
  getDashboardSummary: publicProcedure
    .query(async () => {
      try {
        const trends = await getRecentExportImportTrends(12);
        
        if (trends.length === 0) {
          return {
            success: true,
            data: {
              latestMonth: null,
              totalExport: 0,
              totalImport: 0,
              tradingBalance: 0,
              exportGrowth: 0,
              importGrowth: 0,
              monthlyTrends: [],
            },
          };
        }

        const latest = trends[0];
        const previous = trends[1] || trends[0];

        return {
          success: true,
          data: {
            latestMonth: latest.yearMonth,
            totalExport: typeof latest.totalExport === 'string' ? parseFloat(latest.totalExport) : latest.totalExport,
            totalImport: typeof latest.totalImport === 'string' ? parseFloat(latest.totalImport) : latest.totalImport,
            tradingBalance: typeof latest.tradingBalance === 'string' ? parseFloat(latest.tradingBalance) : latest.tradingBalance,
            exportGrowth: typeof latest.exportYoYGrowth === 'string' ? parseFloat(latest.exportYoYGrowth) : latest.exportYoYGrowth,
            importGrowth: typeof latest.importYoYGrowth === 'string' ? parseFloat(latest.importYoYGrowth) : latest.importYoYGrowth,
            monthlyTrends: trends.map(t => ({
              month: t.yearMonth,
              export: typeof t.totalExport === 'string' ? parseFloat(t.totalExport) : t.totalExport,
              import: typeof t.totalImport === 'string' ? parseFloat(t.totalImport) : t.totalImport,
            })),
          },
        };
      } catch (error) {
        console.error('[trendsRouter] Error getting dashboard summary:', error);
        return {
          success: false,
          data: null,
          error: 'Failed to fetch dashboard summary',
        };
      }
    }),
});
