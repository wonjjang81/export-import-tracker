import { describe, it, expect, vi } from 'vitest';
import { generateInsights, InsightGeneratorInput } from './insightGenerator';

describe('InsightGenerator', () => {
  const mockInput: InsightGeneratorInput = {
    exportValue: 500e9,
    importValue: 450e9,
    exportGrowth: 5.3,
    importGrowth: 3.2,
    tradeBalance: 50e9,
    theme: 'Green Energy',
    industry: 'Solar',
    trendDirection: 'increasing',
    riskLevel: 'low',
    volatility: 8.5,
    seasonalityDetected: true,
    growthProbability: 72,
  };

  it('should generate insights with valid input', async () => {
    const result = await generateInsights(mockInput);
    
    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.keyMetrics).toBeInstanceOf(Array);
    expect(result.keyMetrics.length).toBeGreaterThan(0);
    expect(result.alerts).toBeInstanceOf(Array);
    expect(result.keyInsights).toBeInstanceOf(Array);
    expect(result.keyInsights.length).toBeGreaterThan(0);
    expect(result.recommendations).toBeInstanceOf(Array);
    expect(result.forecast).toBeDefined();
  });

  it('should include correct metric labels', async () => {
    const result = await generateInsights(mockInput);
    
    const labels = result.keyMetrics.map(m => m.label);
    expect(labels).toContain('수출액');
    expect(labels).toContain('수입액');
    expect(labels).toContain('무역수지');
  });

  it('should generate alerts for high growth rates', async () => {
    const highGrowthInput: InsightGeneratorInput = {
      ...mockInput,
      exportGrowth: 15.5,
      importGrowth: 12.3,
    };
    
    const result = await generateInsights(highGrowthInput);
    
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.alerts.some(a => a.type === 'warning')).toBe(true);
  });

  it('should generate success alerts for high growth probability', async () => {
    const highProbabilityInput: InsightGeneratorInput = {
      ...mockInput,
      growthProbability: 85,
    };
    
    const result = await generateInsights(highProbabilityInput);
    
    expect(result.alerts.some(a => a.type === 'success')).toBe(true);
  });

  it('should reflect trend direction in insights', async () => {
    const decreasingInput: InsightGeneratorInput = {
      ...mockInput,
      trendDirection: 'decreasing',
      exportGrowth: -5.0,
    };
    
    const result = await generateInsights(decreasingInput);
    
    expect(result.summary).toBeDefined();
    expect(result.keyInsights.some(i => i.includes('감소'))).toBe(true);
  });

  it('should handle high risk level', async () => {
    const highRiskInput: InsightGeneratorInput = {
      ...mockInput,
      riskLevel: 'high',
      volatility: 25.0,
    };
    
    const result = await generateInsights(highRiskInput);
    
    expect(result.alerts.some(a => a.message.includes('주의'))).toBe(true);
  });

  it('should include seasonality in insights when detected', async () => {
    const result = await generateInsights(mockInput);
    
    expect(result.keyInsights.some(i => i.includes('계절성'))).toBe(true);
  });

  it('should format metrics with correct trend indicators', async () => {
    const result = await generateInsights(mockInput);
    
    result.keyMetrics.forEach(metric => {
      expect(['up', 'down', 'stable']).toContain(metric.trend);
      expect(typeof metric.change).toBe('number');
    });
  });

  it('should generate recommendations based on trend', async () => {
    const result = await generateInsights(mockInput);
    
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]).toBeDefined();
  });

  it('should include forecast information', async () => {
    const result = await generateInsights(mockInput);
    
    expect(result.forecast).toBeDefined();
    expect(result.forecast.length).toBeGreaterThan(0);
  });
});
