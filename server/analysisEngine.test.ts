import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdvancedAnalysisEngine, AdvancedAnalysisResult } from './analysisEngine';

describe('Advanced Analysis Engine', () => {
  let engine: AdvancedAnalysisEngine;

  beforeEach(() => {
    engine = new AdvancedAnalysisEngine();
  });

  describe('Cache Management', () => {
    it('should initialize with empty cache', () => {
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should clear cache', () => {
      engine.clearCache();
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Analysis Result Structure', () => {
    it('should have correct AdvancedAnalysisResult structure', () => {
      const mockResult: AdvancedAnalysisResult = {
        totalExport: 50000,
        totalImport: 45000,
        tradingBalance: 5000,
        exportYoYGrowth: 5.2,
        importYoYGrowth: 3.1,

        topExportProducts: [
          {
            name: 'Semiconductors',
            value: 15000,
            percentage: 30,
            yoyGrowth: 8.5,
          },
        ],
        topImportProducts: [
          {
            name: 'Oil',
            value: 10000,
            percentage: 22,
            yoyGrowth: 2.1,
          },
        ],

        topExportRegions: [
          {
            name: 'China',
            value: 12000,
            percentage: 24,
            yoyGrowth: 4.2,
          },
        ],
        topImportRegions: [
          {
            name: 'Saudi Arabia',
            value: 8000,
            percentage: 18,
            yoyGrowth: 1.5,
          },
        ],

        productCorrelations: [
          {
            product1: 'Semiconductors',
            product2: 'Electronics',
            correlation: 0.85,
            interpretation: 'Strong supply chain relationship',
          },
        ],
        regionCorrelations: [
          {
            region1: 'China',
            region2: 'Vietnam',
            correlation: 0.72,
            interpretation: 'Manufacturing supply chain',
          },
        ],

        executiveSummary: '202606 수출입 동향 분석',
        keyFindings: ['Export growth of 5.2%', 'Import growth of 3.1%'],
        riskFactors: ['Supply chain disruption', 'Currency volatility'],
        opportunities: ['Market expansion', 'New product lines'],

        shortTermOutlook: 'Positive trend expected',
        mediumTermOutlook: 'Moderate growth anticipated',
        longTermOutlook: 'Strong fundamentals',

        policyImpacts: [
          {
            policy: 'US tariff increase',
            affectedSectors: ['Semiconductors'],
            expectedImpact: 'Positive for Korean exports',
          },
        ],
        marketTrends: [
          {
            trend: 'Green energy transition',
            strength: 'strong',
            affectedProducts: ['Solar panels'],
            timeframe: '2-3 years',
          },
        ],

        analysisTimestamp: new Date(),
        dataQuality: 'high',
        confidenceScore: 85,
      };

      expect(mockResult).toBeDefined();
      expect(mockResult.totalExport).toBe(50000);
      expect(mockResult.productCorrelations).toHaveLength(1);
      expect(mockResult.marketTrends).toHaveLength(1);
      expect(mockResult.confidenceScore).toBe(85);
    });
  });

  describe('Analysis Methods', () => {
    it('should have analyzeProductCorrelations method', () => {
      expect(engine.analyzeProductCorrelations).toBeDefined();
      expect(typeof engine.analyzeProductCorrelations).toBe('function');
    });

    it('should have analyzeRegionCorrelations method', () => {
      expect(engine.analyzeRegionCorrelations).toBeDefined();
      expect(typeof engine.analyzeRegionCorrelations).toBe('function');
    });

    it('should have generateOutlook method', () => {
      expect(engine.generateOutlook).toBeDefined();
      expect(typeof engine.generateOutlook).toBe('function');
    });

    it('should have analyzePolicyImpacts method', () => {
      expect(engine.analyzePolicyImpacts).toBeDefined();
      expect(typeof engine.analyzePolicyImpacts).toBe('function');
    });

    it('should have analyzeMarketTrends method', () => {
      expect(engine.analyzeMarketTrends).toBeDefined();
      expect(typeof engine.analyzeMarketTrends).toBe('function');
    });

    it('should have runFullAnalysisPipeline method', () => {
      expect(engine.runFullAnalysisPipeline).toBeDefined();
      expect(typeof engine.runFullAnalysisPipeline).toBe('function');
    });
  });

  describe('Cache Operations', () => {
    it('should get cache stats', () => {
      const stats = engine.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('should clear cache successfully', () => {
      engine.clearCache();
      const stats = engine.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Data Structure Validation', () => {
    it('should validate product correlation structure', () => {
      const correlation = {
        product1: 'Product A',
        product2: 'Product B',
        correlation: 0.75,
        interpretation: 'Positive correlation',
      };

      expect(correlation.product1).toBeDefined();
      expect(correlation.product2).toBeDefined();
      expect(typeof correlation.correlation).toBe('number');
      expect(correlation.correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation.correlation).toBeLessThanOrEqual(1);
    });

    it('should validate region correlation structure', () => {
      const correlation = {
        region1: 'China',
        region2: 'Vietnam',
        correlation: 0.68,
        interpretation: 'Supply chain partnership',
      };

      expect(correlation.region1).toBeDefined();
      expect(correlation.region2).toBeDefined();
      expect(typeof correlation.correlation).toBe('number');
    });

    it('should validate market trend structure', () => {
      const trend = {
        trend: 'Green energy',
        strength: 'strong' as const,
        affectedProducts: ['Solar', 'Battery'],
        timeframe: '2-3 years',
      };

      expect(trend.trend).toBeDefined();
      expect(['strong', 'moderate', 'weak']).toContain(trend.strength);
      expect(Array.isArray(trend.affectedProducts)).toBe(true);
    });

    it('should validate policy impact structure', () => {
      const policy = {
        policy: 'US Tariff',
        affectedSectors: ['Tech', 'Manufacturing'],
        expectedImpact: 'Positive for Korean exports',
      };

      expect(policy.policy).toBeDefined();
      expect(Array.isArray(policy.affectedSectors)).toBe(true);
      expect(policy.expectedImpact).toBeDefined();
    });
  });

  describe('Analysis Engine Initialization', () => {
    it('should initialize without errors', () => {
      const newEngine = new AdvancedAnalysisEngine();
      expect(newEngine).toBeDefined();
    });

    it('should have all required methods after initialization', () => {
      expect(engine.analyzeProductCorrelations).toBeDefined();
      expect(engine.analyzeRegionCorrelations).toBeDefined();
      expect(engine.generateOutlook).toBeDefined();
      expect(engine.analyzePolicyImpacts).toBeDefined();
      expect(engine.analyzeMarketTrends).toBeDefined();
      expect(engine.runFullAnalysisPipeline).toBeDefined();
      expect(engine.getCacheStats).toBeDefined();
      expect(engine.clearCache).toBeDefined();
    });
  });
});
