/**
 * 시계열 분석 엔진
 * 3년 이상의 수출입 데이터를 기반으로 계절성, 트렌드, 확률적 예측 분석
 */

import { getDb, getExportImportTrendsByDateRange } from './db';

/**
 * 시계열 데이터 포인트
 */
export interface TimeSeriesPoint {
  date: Date;
  value: number;
  theme?: string;
  industry?: string;
  yearMonth: string;
}

/**
 * 시계열 분석 결과
 */
export interface TimeSeriesAnalysis {
  theme: string;
  industry: string;
  dataPoints: TimeSeriesPoint[];
  
  // 기본 통계
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number; // 0-1
  
  // 계절성 분석
  seasonality: {
    detected: boolean;
    period: number; // 월 단위
    strength: number; // 0-1
    pattern: number[]; // 월별 계수
  };
  
  // 자기상관 분석
  autocorrelation: {
    lag1: number;
    lag3: number;
    lag12: number;
  };
  
  // 예측
  forecast: {
    next3Months: Array<{ month: string; value: number; ci95: [number, number]; ci80: [number, number] }>;
    next6Months: Array<{ month: string; value: number; ci95: [number, number]; ci80: [number, number] }>;
    next12Months: Array<{ month: string; value: number; ci95: [number, number]; ci80: [number, number] }>;
  };
  
  // 확률 분석
  probability: {
    growthProbability: number; // 향후 성장 확률
    declineProbability: number; // 향후 감소 확률
    volatility: number; // 변동성 (%)
    riskLevel: 'low' | 'medium' | 'high';
  };
  
  // 메타데이터
  analysisDate: Date;
  dataPoints3Year: number;
  dataQuality: 'high' | 'medium' | 'low';
}

/**
 * 시계열 분석 엔진
 */
export class TimeSeriesAnalyzer {
  /**
   * 선형 회귀를 통한 트렌드 분석
   */
  private calculateTrend(values: number[]): { slope: number; intercept: number; r2: number } {
    const n = values.length;
    if (n < 2) {
      return { slope: 0, intercept: values[0] || 0, r2: 0 };
    }

    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      const dx = i - xMean;
      numerator += dx * (values[i] - yMean);
      denominator += dx * dx;
    }

    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = yMean - slope * xMean;

    // R² 계산
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = intercept + slope * i;
      ssRes += Math.pow(values[i] - predicted, 2);
      ssTot += Math.pow(values[i] - yMean, 2);
    }

    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    return { slope, intercept, r2 };
  }

  /**
   * 계절성 분석 (월별 패턴)
   */
  private analyzeSeasonality(values: number[]): {
    detected: boolean;
    period: number;
    strength: number;
    pattern: number[];
  } {
    if (values.length < 24) {
      return { detected: false, period: 0, strength: 0, pattern: [] };
    }

    // 12개월 주기 계절성 분석
    const period = 12;
    const cycles = Math.floor(values.length / period);

    if (cycles < 2) {
      return { detected: false, period: 0, strength: 0, pattern: [] };
    }

    // 월별 평균 계산
    const monthlyMeans = new Array(12).fill(0);
    for (let i = 0; i < values.length; i++) {
      monthlyMeans[i % 12] += values[i];
    }

    for (let i = 0; i < 12; i++) {
      monthlyMeans[i] /= cycles;
    }

    // 전체 평균
    const overallMean = values.reduce((a, b) => a + b, 0) / values.length;

    // 계절성 강도 계산 (0-1)
    let seasonalVar = 0;
    for (let i = 0; i < 12; i++) {
      seasonalVar += Math.pow(monthlyMeans[i] - overallMean, 2);
    }
    seasonalVar /= 12;

    const totalVar = values.reduce((sum, val) => sum + Math.pow(val - overallMean, 2), 0) / values.length;
    const strength = totalVar === 0 ? 0 : Math.min(1, seasonalVar / totalVar);

    // 계절성 계수 정규화
    const pattern = monthlyMeans.map(m => (overallMean === 0 ? 1 : m / overallMean));

    return {
      detected: strength > 0.15,
      period,
      strength,
      pattern,
    };
  }

  /**
   * 자기상관 분석
   */
  private calculateAutocorrelation(values: number[]): {
    lag1: number;
    lag3: number;
    lag12: number;
  } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const diffs = values.map(v => v - mean);

    const calculateLag = (lag: number): number => {
      if (lag >= values.length) return 0;

      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < values.length - lag; i++) {
        numerator += diffs[i] * diffs[i + lag];
      }

      for (let i = 0; i < values.length; i++) {
        denominator += diffs[i] * diffs[i];
      }

      return denominator === 0 ? 0 : numerator / denominator;
    };

    return {
      lag1: calculateLag(1),
      lag3: calculateLag(3),
      lag12: calculateLag(12),
    };
  }

  /**
   * 지수 평활 기반 예측 (Simple Exponential Smoothing)
   */
  private forecastSES(values: number[], periods: number, alpha: number = 0.3): number[] {
    if (values.length === 0) return [];

    const forecast: number[] = [];
    let level = values[0];

    // 역사 데이터로 레벨 업데이트
    for (let i = 1; i < values.length; i++) {
      level = alpha * values[i] + (1 - alpha) * level;
    }

    // 미래 예측
    for (let i = 0; i < periods; i++) {
      forecast.push(level);
    }

    return forecast;
  }

  /**
   * 계절성을 고려한 예측 (Holt-Winters)
   */
  private forecastHoltWinters(
    values: number[],
    periods: number,
    seasonalPattern: number[]
  ): number[] {
    if (values.length < 12) {
      return this.forecastSES(values, periods);
    }

    const alpha = 0.3;
    const gamma = 0.1;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    let level = mean;
    const forecast: number[] = [];

    // 역사 데이터로 레벨 업데이트
    for (let i = 0; i < values.length; i++) {
      const seasonal = seasonalPattern[i % 12];
      level = alpha * (values[i] / seasonal) + (1 - alpha) * level;
    }

    // 미래 예측
    for (let i = 0; i < periods; i++) {
      const seasonal = seasonalPattern[i % 12];
      forecast.push(level * seasonal);
    }

    return forecast;
  }

  /**
   * 부트스트랩 기반 신뢰도 구간 계산
   */
  private calculateConfidenceIntervals(
    values: number[],
    forecast: number[],
    residualStdDev: number
  ): Array<{ ci95: [number, number]; ci80: [number, number] }> {
    return forecast.map(value => {
      // 예측 오차 증가 고려 (시간이 지날수록 불확실성 증가)
      const errorFactor = Math.sqrt(1 + (forecast.indexOf(value) + 1) * 0.05);
      const adjustedStdDev = residualStdDev * errorFactor;

      return {
        ci95: [
          value - 1.96 * adjustedStdDev,
          value + 1.96 * adjustedStdDev,
        ],
        ci80: [
          value - 1.282 * adjustedStdDev,
          value + 1.282 * adjustedStdDev,
        ],
      };
    });
  }

  /**
   * 완전 시계열 분석 실행
   */
  async analyzeTimeSeries(
    theme: string,
    industry: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesAnalysis> {
    console.log(`[TimeSeriesAnalyzer] Analyzing ${theme}/${industry} from ${startDate} to ${endDate}`);

    // 데이터 조회 (3년 이상)
    const dataPoints = await getExportImportTrendsByDateRange(startDate, endDate, theme, industry);

    if (dataPoints.length < 12) {
      throw new Error(`Insufficient data points: ${dataPoints.length} (minimum 12 required)`);
    }

    const values = dataPoints.map(dp => dp.value);

    // 기본 통계
    const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // 트렌드 분석
    const { slope, r2 } = this.calculateTrend(values);
    const trend: 'increasing' | 'decreasing' | 'stable' = 
      slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable';
    const trendStrength = Math.abs(r2);

    // 계절성 분석
    const seasonality = this.analyzeSeasonality(values);

    // 자기상관 분석
    const autocorrelation = this.calculateAutocorrelation(values);

    // 예측 생성
    const forecastValues = seasonality.detected
      ? this.forecastHoltWinters(values, 36, seasonality.pattern)
      : this.forecastSES(values, 36);

    // 잔차 표준편차
    const residuals = values.map((v: number, i: number) => {
      const trend_val = slope * i + (values[0] - slope * 0);
      return v - trend_val;
    });
    const residualStdDev = Math.sqrt(
      residuals.reduce((sum: number, r: number) => sum + r * r, 0) / residuals.length
    );

    // 신뢰도 구간
    const confidenceIntervals = this.calculateConfidenceIntervals(
      values,
      forecastValues,
      residualStdDev
    );

    // 예측 포맷팅
    const now = new Date();
    const forecast = {
      next3Months: forecastValues.slice(0, 3).map((v, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() + i + 1);
        return {
          month: date.toISOString().slice(0, 7),
          value: Math.max(0, v),
          ci95: confidenceIntervals[i].ci95 as [number, number],
          ci80: confidenceIntervals[i].ci80 as [number, number],
        };
      }),
      next6Months: forecastValues.slice(0, 6).map((v, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() + i + 1);
        return {
          month: date.toISOString().slice(0, 7),
          value: Math.max(0, v),
          ci95: confidenceIntervals[i].ci95 as [number, number],
          ci80: confidenceIntervals[i].ci80 as [number, number],
        };
      }),
      next12Months: forecastValues.slice(0, 12).map((v, i) => {
        const date = new Date(now);
        date.setMonth(date.getMonth() + i + 1);
        return {
          month: date.toISOString().slice(0, 7),
          value: Math.max(0, v),
          ci95: confidenceIntervals[i].ci95 as [number, number],
          ci80: confidenceIntervals[i].ci80 as [number, number],
        };
      }),
    };

    // 확률 분석
    const lastValue = values[values.length - 1];
    const avgGrowth = (values[values.length - 1] - values[0]) / values[0];
    const growthProbability = Math.min(1, Math.max(0, 0.5 + avgGrowth * 0.5));
    const volatility = (stdDev / mean) * 100;
    const riskLevel: 'low' | 'medium' | 'high' = 
      volatility < 10 ? 'low' : volatility < 25 ? 'medium' : 'high';

    const result: TimeSeriesAnalysis = {
      theme,
      industry,
      dataPoints: dataPoints.slice(-36), // 최근 3년만 포함
      
      mean,
      stdDev,
      min,
      max,
      trend,
      trendStrength,
      
      seasonality,
      autocorrelation,
      
      forecast,
      
      probability: {
        growthProbability,
        declineProbability: 1 - growthProbability,
        volatility,
        riskLevel,
      },
      
      analysisDate: new Date(),
      dataPoints3Year: dataPoints.length,
      dataQuality: dataPoints.length >= 36 ? 'high' : 'medium',
    };

    console.log(`[TimeSeriesAnalyzer] Analysis completed for ${theme}/${industry}`);
    return result;
  }

  /**
   * 다중 테마/업종 분석
   */
  async analyzeMultipleTimeSeries(
    themes: string[],
    industries: string[],
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesAnalysis[]> {
    console.log(`[TimeSeriesAnalyzer] Analyzing ${themes.length * industries.length} combinations`);

    const results: TimeSeriesAnalysis[] = [];

    for (const theme of themes) {
      for (const industry of industries) {
        try {
          const analysis = await this.analyzeTimeSeries(theme, industry, startDate, endDate);
          results.push(analysis);
        } catch (error) {
          console.warn(`[TimeSeriesAnalyzer] Failed to analyze ${theme}/${industry}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * 상관관계 분석 (테마/업종 간)
   */
  async analyzeCorrelations(
    timeSeries1: TimeSeriesAnalysis,
    timeSeries2: TimeSeriesAnalysis
  ): Promise<{ correlation: number; interpretation: string }> {
    const values1 = timeSeries1.dataPoints.map(dp => dp.value);
    const values2 = timeSeries2.dataPoints.map(dp => dp.value);

    if (values1.length !== values2.length) {
      return { correlation: 0, interpretation: 'Data points length mismatch' };
    }

    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    const correlation =
      numerator / Math.sqrt(denominator1 * denominator2);

    let interpretation = '';
    if (correlation > 0.7) {
      interpretation = 'Strong positive correlation';
    } else if (correlation > 0.4) {
      interpretation = 'Moderate positive correlation';
    } else if (correlation > 0) {
      interpretation = 'Weak positive correlation';
    } else if (correlation > -0.4) {
      interpretation = 'Weak negative correlation';
    } else if (correlation > -0.7) {
      interpretation = 'Moderate negative correlation';
    } else {
      interpretation = 'Strong negative correlation';
    }

    return { correlation, interpretation };
  }
}

// 싱글톤 인스턴스
export const timeSeriesAnalyzer = new TimeSeriesAnalyzer();
