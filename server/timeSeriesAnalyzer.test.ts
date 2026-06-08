import { describe, it, expect, beforeEach } from 'vitest';
import { TimeSeriesAnalyzer, TimeSeriesAnalysis } from './timeSeriesAnalyzer';

describe('Time Series Analyzer', () => {
  let analyzer: TimeSeriesAnalyzer;

  beforeEach(() => {
    analyzer = new TimeSeriesAnalyzer();
  });

  describe('Trend Calculation', () => {
    it('should detect increasing trend', () => {
      const values = [100, 110, 120, 130, 140, 150];
      const result = (analyzer as any).calculateTrend(values);
      
      expect(result.slope).toBeGreaterThan(0);
      expect(result.r2).toBeGreaterThan(0.9);
    });

    it('should detect decreasing trend', () => {
      const values = [150, 140, 130, 120, 110, 100];
      const result = (analyzer as any).calculateTrend(values);
      
      expect(result.slope).toBeLessThan(0);
      expect(result.r2).toBeGreaterThan(0.9);
    });

    it('should detect stable trend', () => {
      const values = [100, 100, 100, 100, 100, 100];
      const result = (analyzer as any).calculateTrend(values);
      
      expect(result.slope).toBeCloseTo(0, 1);
    });
  });

  describe('Seasonality Analysis', () => {
    it('should detect seasonality with 12-month pattern', () => {
      // 12개월 반복 패턴 (계절성 있음)
      const values = [100, 110, 120, 130, 140, 150, 160, 150, 140, 130, 120, 110];
      const result = (analyzer as any).analyzeSeasonality(values);
      
      expect(result.period).toBe(12);
      expect(result.pattern).toHaveLength(12);
    });

    it('should not detect seasonality with insufficient data', () => {
      const values = [100, 110, 120];
      const result = (analyzer as any).analyzeSeasonality(values);
      
      expect(result.detected).toBe(false);
    });
  });

  describe('Autocorrelation Analysis', () => {
    it('should calculate autocorrelation lags', () => {
      const values = [100, 105, 110, 108, 112, 115, 113, 117, 120, 118];
      const result = (analyzer as any).calculateAutocorrelation(values);
      
      expect(result.lag1).toBeDefined();
      expect(result.lag3).toBeDefined();
      expect(result.lag12).toBeDefined();
      expect(result.lag1).toBeGreaterThanOrEqual(-1);
      expect(result.lag1).toBeLessThanOrEqual(1);
    });
  });

  describe('Forecasting', () => {
    it('should generate SES forecast', () => {
      const values = [100, 105, 110, 115, 120];
      const forecast = (analyzer as any).forecastSES(values, 3);
      
      expect(forecast).toHaveLength(3);
      expect(forecast[0]).toBeGreaterThan(0);
      expect(forecast[1]).toBeGreaterThan(0);
      expect(forecast[2]).toBeGreaterThan(0);
    });

    it('should generate Holt-Winters forecast with seasonality', () => {
      const values = [100, 110, 120, 130, 140, 150, 160, 150, 140, 130, 120, 110];
      const pattern = [0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0];
      const forecast = (analyzer as any).forecastHoltWinters(values, 3, pattern);
      
      expect(forecast).toHaveLength(3);
      expect(forecast.every((v: number) => v > 0)).toBe(true);
    });
  });

  describe('Confidence Intervals', () => {
    it('should calculate confidence intervals', () => {
      const values = [100, 105, 110, 115, 120];
      const forecast = [125, 130, 135];
      const stdDev = 5;
      
      const intervals = (analyzer as any).calculateConfidenceIntervals(values, forecast, stdDev);
      
      expect(intervals).toHaveLength(3);
      expect(intervals[0].ci95).toHaveLength(2);
      expect(intervals[0].ci80).toHaveLength(2);
      expect(intervals[0].ci95[0]).toBeLessThan(intervals[0].ci95[1]);
      expect(intervals[0].ci80[0]).toBeLessThan(intervals[0].ci80[1]);
    });
  });

  describe('Correlation Analysis', () => {
    it('should calculate correlation between two series', async () => {
      const series1: TimeSeriesAnalysis = {
        theme: 'Electronics',
        industry: 'Semiconductors',
        dataPoints: [
          { date: new Date('2024-01-01'), value: 100, yearMonth: '202401' },
          { date: new Date('2024-02-01'), value: 110, yearMonth: '202402' },
          { date: new Date('2024-03-01'), value: 120, yearMonth: '202403' },
        ],
        mean: 110,
        stdDev: 10,
        min: 100,
        max: 120,
        trend: 'increasing',
        trendStrength: 0.95,
        seasonality: { detected: false, period: 0, strength: 0, pattern: [] },
        autocorrelation: { lag1: 0.8, lag3: 0.5, lag12: 0.2 },
        forecast: {
          next3Months: [],
          next6Months: [],
          next12Months: [],
        },
        probability: {
          growthProbability: 0.8,
          declineProbability: 0.2,
          volatility: 5,
          riskLevel: 'low',
        },
        analysisDate: new Date(),
        dataPoints3Year: 36,
        dataQuality: 'high',
      };

      const series2: TimeSeriesAnalysis = {
        ...series1,
        dataPoints: [
          { date: new Date('2024-01-01'), value: 100, yearMonth: '202401' },
          { date: new Date('2024-02-01'), value: 105, yearMonth: '202402' },
          { date: new Date('2024-03-01'), value: 110, yearMonth: '202403' },
        ],
      };

      const result = await analyzer.analyzeCorrelations(series1, series2);
      
      expect(result.correlation).toBeGreaterThanOrEqual(-1);
      expect(result.correlation).toBeLessThanOrEqual(1);
      expect(result.interpretation).toBeDefined();
    });
  });

  describe('Time Series Analysis Structure', () => {
    it('should have correct TimeSeriesAnalysis structure', () => {
      const mockAnalysis: TimeSeriesAnalysis = {
        theme: 'Green Energy',
        industry: 'Solar',
        dataPoints: [],
        mean: 100,
        stdDev: 10,
        min: 80,
        max: 120,
        trend: 'increasing',
        trendStrength: 0.85,
        seasonality: {
          detected: true,
          period: 12,
          strength: 0.3,
          pattern: [0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.15, 1.1, 1.05, 1.0, 0.95],
        },
        autocorrelation: {
          lag1: 0.7,
          lag3: 0.5,
          lag12: 0.8,
        },
        forecast: {
          next3Months: [
            { month: '2026-07', value: 125, ci95: [110, 140], ci80: [115, 135] },
            { month: '2026-08', value: 130, ci95: [110, 150], ci80: [115, 145] },
            { month: '2026-09', value: 128, ci95: [108, 148], ci80: [113, 143] },
          ],
          next6Months: [],
          next12Months: [],
        },
        probability: {
          growthProbability: 0.75,
          declineProbability: 0.25,
          volatility: 8.5,
          riskLevel: 'low',
        },
        analysisDate: new Date(),
        dataPoints3Year: 36,
        dataQuality: 'high',
      };

      expect(mockAnalysis.theme).toBe('Green Energy');
      expect(mockAnalysis.trend).toBe('increasing');
      expect(mockAnalysis.seasonality.detected).toBe(true);
      expect(mockAnalysis.forecast.next3Months).toHaveLength(3);
      expect(mockAnalysis.probability.growthProbability).toBeGreaterThan(0);
    });
  });

  describe('Analyzer Methods', () => {
    it('should have analyzeTimeSeries method', () => {
      expect(analyzer.analyzeTimeSeries).toBeDefined();
      expect(typeof analyzer.analyzeTimeSeries).toBe('function');
    });

    it('should have analyzeMultipleTimeSeries method', () => {
      expect(analyzer.analyzeMultipleTimeSeries).toBeDefined();
      expect(typeof analyzer.analyzeMultipleTimeSeries).toBe('function');
    });

    it('should have analyzeCorrelations method', () => {
      expect(analyzer.analyzeCorrelations).toBeDefined();
      expect(typeof analyzer.analyzeCorrelations).toBe('function');
    });
  });
});
