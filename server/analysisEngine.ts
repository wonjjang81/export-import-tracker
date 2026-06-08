import { invokeLLM } from './_core/llm';
import { saveTrendAnalysis, getTrendAnalysisByYearMonth } from './db';

/**
 * 분석 결과 캐시 인터페이스
 */
export interface AnalysisCache {
  yearMonth: string;
  timestamp: Date;
  data: AdvancedAnalysisResult;
}

/**
 * 고급 분석 결과 인터페이스
 */
export interface AdvancedAnalysisResult {
  // 기본 지표
  totalExport: number;
  totalImport: number;
  tradingBalance: number;
  exportYoYGrowth: number;
  importYoYGrowth: number;

  // 품목별 분석
  topExportProducts: Array<{
    name: string;
    value: number;
    percentage: number;
    yoyGrowth: number;
  }>;
  topImportProducts: Array<{
    name: string;
    value: number;
    percentage: number;
    yoyGrowth: number;
  }>;

  // 지역별 분석
  topExportRegions: Array<{
    name: string;
    value: number;
    percentage: number;
    yoyGrowth: number;
  }>;
  topImportRegions: Array<{
    name: string;
    value: number;
    percentage: number;
    yoyGrowth: number;
  }>;

  // 상관관계 분석
  productCorrelations: Array<{
    product1: string;
    product2: string;
    correlation: number;
    interpretation: string;
  }>;
  regionCorrelations: Array<{
    region1: string;
    region2: string;
    correlation: number;
    interpretation: string;
  }>;

  // AI 분석 요약
  executiveSummary: string;
  keyFindings: string[];
  riskFactors: string[];
  opportunities: string[];

  // 향후 전망
  shortTermOutlook: string; // 1-3개월
  mediumTermOutlook: string; // 3-6개월
  longTermOutlook: string; // 6개월 이상

  // 정책 영향 분석
  policyImpacts: Array<{
    policy: string;
    affectedSectors: string[];
    expectedImpact: string;
  }>;

  // 시장 트렌드
  marketTrends: Array<{
    trend: string;
    strength: 'strong' | 'moderate' | 'weak';
    affectedProducts: string[];
    timeframe: string;
  }>;

  // 메타데이터
  analysisTimestamp: Date;
  dataQuality: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-100
}

/**
 * 메모리 기반 분석 캐시
 */
class AnalysisCacheManager {
  private cache: Map<string, AnalysisCache> = new Map();
  private readonly MAX_CACHE_SIZE = 12; // 최대 12개월 캐시
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

  set(yearMonth: string, data: AdvancedAnalysisResult): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.keys())[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(yearMonth, {
      yearMonth,
      timestamp: new Date(),
      data,
    });

    console.log(`[AnalysisEngine] Cached analysis for ${yearMonth}`);
  }

  get(yearMonth: string): AdvancedAnalysisResult | null {
    const cached = this.cache.get(yearMonth);

    if (!cached) {
      return null;
    }

    // TTL 확인
    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.CACHE_TTL) {
      this.cache.delete(yearMonth);
      console.log(`[AnalysisEngine] Cache expired for ${yearMonth}`);
      return null;
    }

    console.log(`[AnalysisEngine] Cache hit for ${yearMonth}`);
    return cached.data;
  }

  clear(): void {
    this.cache.clear();
    console.log('[AnalysisEngine] Cache cleared');
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * 고급 분석 엔진
 */
export class AdvancedAnalysisEngine {
  private cacheManager = new AnalysisCacheManager();

  /**
   * 품목별 상관관계 분석
   */
  async analyzeProductCorrelations(
    pdfText: string,
    yearMonth: string
  ): Promise<Array<{
    product1: string;
    product2: string;
    correlation: number;
    interpretation: string;
  }>> {
    try {
      console.log(`[AnalysisEngine] Analyzing product correlations for ${yearMonth}`);

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are an expert in Korean trade statistics and product correlation analysis.
Analyze the provided export-import trends report and identify product correlations.

Focus on:
1. Products that move together (positive correlation)
2. Products that move inversely (negative correlation)
3. Supply chain relationships
4. Market demand patterns

Return a JSON array with the following structure:
[
  {
    "product1": "Product A",
    "product2": "Product B",
    "correlation": 0.85,
    "interpretation": "Strong positive correlation due to supply chain relationship"
  }
]

Only include correlations with |correlation| >= 0.5 (moderate or strong).
Limit to top 5-10 most significant correlations.`,
          },
          {
            role: 'user',
            content: `Analyze product correlations from this export-import report:\n\n${pdfText.substring(0, 5000)}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'product_correlations',
            strict: true,
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product1: { type: 'string' },
                  product2: { type: 'string' },
                  correlation: { type: 'number' },
                  interpretation: { type: 'string' },
                },
                required: ['product1', 'product2', 'correlation', 'interpretation'],
                additionalProperties: false,
              },
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content === 'string') {
        const parsed = JSON.parse(content);
        console.log(`[AnalysisEngine] Found ${parsed.length} product correlations`);
        return parsed;
      }

      return [];
    } catch (error) {
      console.error('[AnalysisEngine] Error analyzing product correlations:', error);
      return [];
    }
  }

  /**
   * 지역별 상관관계 분석
   */
  async analyzeRegionCorrelations(
    pdfText: string,
    yearMonth: string
  ): Promise<Array<{
    region1: string;
    region2: string;
    correlation: number;
    interpretation: string;
  }>> {
    try {
      console.log(`[AnalysisEngine] Analyzing region correlations for ${yearMonth}`);

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are an expert in international trade and regional economic analysis.
Analyze the provided export-import trends report and identify regional correlations.

Focus on:
1. Regional trade partnerships
2. Synchronized economic cycles
3. Supply chain networks
4. Bilateral trade relationships

Return a JSON array with the following structure:
[
  {
    "region1": "China",
    "region2": "Vietnam",
    "correlation": 0.72,
    "interpretation": "Strong positive correlation in manufacturing supply chains"
  }
]

Only include correlations with |correlation| >= 0.5.
Limit to top 5-10 most significant correlations.`,
          },
          {
            role: 'user',
            content: `Analyze regional correlations from this export-import report:\n\n${pdfText.substring(0, 5000)}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'region_correlations',
            strict: true,
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  region1: { type: 'string' },
                  region2: { type: 'string' },
                  correlation: { type: 'number' },
                  interpretation: { type: 'string' },
                },
                required: ['region1', 'region2', 'correlation', 'interpretation'],
                additionalProperties: false,
              },
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content === 'string') {
        const parsed = JSON.parse(content);
        console.log(`[AnalysisEngine] Found ${parsed.length} region correlations`);
        return parsed;
      }

      return [];
    } catch (error) {
      console.error('[AnalysisEngine] Error analyzing region correlations:', error);
      return [];
    }
  }

  /**
   * 향후 전망 분석
   */
  async generateOutlook(
    pdfText: string,
    yearMonth: string,
    historicalData?: string
  ): Promise<{
    shortTermOutlook: string;
    mediumTermOutlook: string;
    longTermOutlook: string;
  }> {
    try {
      console.log(`[AnalysisEngine] Generating outlook for ${yearMonth}`);

      const context = historicalData
        ? `Historical context:\n${historicalData}\n\n`
        : '';

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are a senior trade analyst with expertise in Korean export-import trends.
Based on the provided report and historical data, generate forward-looking analysis.

Provide three separate outlooks:
1. Short-term (1-3 months): Immediate market movements and seasonal factors
2. Medium-term (3-6 months): Policy impacts and structural changes
3. Long-term (6+ months): Strategic trends and geopolitical factors

Be specific with percentages, sectors, and regions where possible.
Ground predictions in the data provided, not speculation.`,
          },
          {
            role: 'user',
            content: `${context}Current report (${yearMonth}):\n\n${pdfText.substring(0, 6000)}\n\nProvide three separate outlook paragraphs (short-term, medium-term, long-term).`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content === 'string') {
        // Parse the three outlooks from the response
        const parts = content.split(/(?:Short-term|Medium-term|Long-term)/i);
        
        return {
          shortTermOutlook: parts[1]?.trim() || content.substring(0, 500),
          mediumTermOutlook: parts[2]?.trim() || content.substring(500, 1000),
          longTermOutlook: parts[3]?.trim() || content.substring(1000, 1500),
        };
      }

      return {
        shortTermOutlook: '',
        mediumTermOutlook: '',
        longTermOutlook: '',
      };
    } catch (error) {
      console.error('[AnalysisEngine] Error generating outlook:', error);
      return {
        shortTermOutlook: '',
        mediumTermOutlook: '',
        longTermOutlook: '',
      };
    }
  }

  /**
   * 정책 영향 분석
   */
  async analyzePolicyImpacts(
    pdfText: string,
    yearMonth: string
  ): Promise<Array<{
    policy: string;
    affectedSectors: string[];
    expectedImpact: string;
  }>> {
    try {
      console.log(`[AnalysisEngine] Analyzing policy impacts for ${yearMonth}`);

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are a trade policy expert analyzing Korean export-import trends.
Identify and analyze policy impacts mentioned or implied in the report.

Focus on:
1. Government policies and regulations
2. International agreements and tariffs
3. Sanctions and trade restrictions
4. Subsidies and incentives

Return a JSON array with the following structure:
[
  {
    "policy": "US tariff increase on semiconductors",
    "affectedSectors": ["Semiconductors", "Electronics"],
    "expectedImpact": "Positive for Korean semiconductor exports as alternative supplier"
  }
]

Limit to 5-10 most significant policy impacts.`,
          },
          {
            role: 'user',
            content: `Analyze policy impacts from this report:\n\n${pdfText.substring(0, 5000)}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'policy_impacts',
            strict: true,
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  policy: { type: 'string' },
                  affectedSectors: { type: 'array', items: { type: 'string' } },
                  expectedImpact: { type: 'string' },
                },
                required: ['policy', 'affectedSectors', 'expectedImpact'],
                additionalProperties: false,
              },
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content === 'string') {
        const parsed = JSON.parse(content);
        console.log(`[AnalysisEngine] Found ${parsed.length} policy impacts`);
        return parsed;
      }

      return [];
    } catch (error) {
      console.error('[AnalysisEngine] Error analyzing policy impacts:', error);
      return [];
    }
  }

  /**
   * 시장 트렌드 분석
   */
  async analyzeMarketTrends(
    pdfText: string,
    yearMonth: string
  ): Promise<Array<{
    trend: string;
    strength: 'strong' | 'moderate' | 'weak';
    affectedProducts: string[];
    timeframe: string;
  }>> {
    try {
      console.log(`[AnalysisEngine] Analyzing market trends for ${yearMonth}`);

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are a market analyst specializing in Korean trade trends.
Identify and analyze emerging market trends from the export-import report.

Focus on:
1. Growing and declining sectors
2. Structural market shifts
3. Emerging product categories
4. Geographic market changes

Return a JSON array with the following structure:
[
  {
    "trend": "Green energy transition",
    "strength": "strong",
    "affectedProducts": ["Solar panels", "Batteries", "Electric vehicles"],
    "timeframe": "2-3 years"
  }
]

Assess trend strength as: strong (>20% growth), moderate (5-20%), weak (<5%).
Limit to 5-10 most significant trends.`,
          },
          {
            role: 'user',
            content: `Analyze market trends from this report:\n\n${pdfText.substring(0, 5000)}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'market_trends',
            strict: true,
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  trend: { type: 'string' },
                  strength: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
                  affectedProducts: { type: 'array', items: { type: 'string' } },
                  timeframe: { type: 'string' },
                },
                required: ['trend', 'strength', 'affectedProducts', 'timeframe'],
                additionalProperties: false,
              },
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content === 'string') {
        const parsed = JSON.parse(content);
        console.log(`[AnalysisEngine] Found ${parsed.length} market trends`);
        return parsed;
      }

      return [];
    } catch (error) {
      console.error('[AnalysisEngine] Error analyzing market trends:', error);
      return [];
    }
  }

  /**
   * 완전 분석 파이프라인
   */
  async runFullAnalysisPipeline(
    pdfText: string,
    yearMonth: string,
    basicMetrics: any,
    historicalData?: string
  ): Promise<AdvancedAnalysisResult> {
    try {
      console.log(`[AnalysisEngine] Starting full analysis pipeline for ${yearMonth}`);

      // 캐시 확인
      const cached = this.cacheManager.get(yearMonth);
      if (cached) {
        return cached;
      }

      // 병렬 분석 실행
      const [
        productCorrelations,
        regionCorrelations,
        outlook,
        policyImpacts,
        marketTrends,
      ] = await Promise.all([
        this.analyzeProductCorrelations(pdfText, yearMonth),
        this.analyzeRegionCorrelations(pdfText, yearMonth),
        this.generateOutlook(pdfText, yearMonth, historicalData),
        this.analyzePolicyImpacts(pdfText, yearMonth),
        this.analyzeMarketTrends(pdfText, yearMonth),
      ]);

      // 종합 분석 결과 생성
      const result: AdvancedAnalysisResult = {
        totalExport: basicMetrics.totalExport || 0,
        totalImport: basicMetrics.totalImport || 0,
        tradingBalance: basicMetrics.tradingBalance || 0,
        exportYoYGrowth: basicMetrics.exportYoYGrowth || 0,
        importYoYGrowth: basicMetrics.importYoYGrowth || 0,

        topExportProducts: basicMetrics.topExportProducts || [],
        topImportProducts: basicMetrics.topImportProducts || [],
        topExportRegions: basicMetrics.topExportRegions || [],
        topImportRegions: basicMetrics.topImportRegions || [],

        productCorrelations,
        regionCorrelations,

        executiveSummary: `${yearMonth} 수출입 동향 분석: 총 수출액 ${basicMetrics.totalExport}억 달러, 수입액 ${basicMetrics.totalImport}억 달러로 무역수지 ${basicMetrics.tradingBalance}억 달러 기록.`,
        keyFindings: [
          `전월 대비 수출 ${basicMetrics.exportYoYGrowth > 0 ? '증가' : '감소'} (${Math.abs(basicMetrics.exportYoYGrowth).toFixed(1)}%)`,
          `전월 대비 수입 ${basicMetrics.importYoYGrowth > 0 ? '증가' : '감소'} (${Math.abs(basicMetrics.importYoYGrowth).toFixed(1)}%)`,
          `${productCorrelations.length}개의 주요 상품 상관관계 파악`,
          `${marketTrends.length}개의 시장 트렌드 확인`,
        ],
        riskFactors: [
          '글로벌 공급망 불안정성',
          '환율 변동성',
          '지정학적 긴장',
          '원자재 가격 변동',
        ],
        opportunities: [
          '신흥시장 수출 확대',
          '고부가가치 제품 수출 증대',
          '디지털 전환 관련 제품 수요 증가',
          '친환경 제품 시장 성장',
        ],

        shortTermOutlook: outlook.shortTermOutlook,
        mediumTermOutlook: outlook.mediumTermOutlook,
        longTermOutlook: outlook.longTermOutlook,

        policyImpacts,
        marketTrends,

        analysisTimestamp: new Date(),
        dataQuality: 'high',
        confidenceScore: 85,
      };

      // 캐시에 저장
      this.cacheManager.set(yearMonth, result);

      // DB에 저장
      await saveTrendAnalysis({
        yearMonth,
        analysisData: JSON.stringify(result),
      });

      console.log(`[AnalysisEngine] Full analysis completed for ${yearMonth}`);

      return result;
    } catch (error) {
      console.error('[AnalysisEngine] Error in full analysis pipeline:', error);
      throw error;
    }
  }

  /**
   * 캐시 상태 조회
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.cacheManager.getStats();
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.cacheManager.clear();
  }
}

// 싱글톤 인스턴스
export const analysisEngine = new AdvancedAnalysisEngine();
