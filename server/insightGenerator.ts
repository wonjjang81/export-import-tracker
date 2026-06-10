import { invokeLLM } from './_core/llm';

export interface InsightGeneratorInput {
  exportValue: number;
  importValue: number;
  exportGrowth: number;
  importGrowth: number;
  tradeBalance: number;
  theme: string;
  industry: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  volatility: number;
  seasonalityDetected: boolean;
  growthProbability: number;
}

export interface GeneratedInsight {
  summary: string;
  keyMetrics: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    change: number;
  }[];
  alerts: {
    type: 'warning' | 'info' | 'success';
    message: string;
  }[];
  keyInsights: string[];
  recommendations: string[];
  forecast: string;
}

/**
 * LLM을 사용하여 분석 데이터 기반 핵심 인사이트 자동 생성
 */
export async function generateInsights(input: InsightGeneratorInput): Promise<GeneratedInsight> {
  const prompt = `
당신은 수출입 동향 분석 전문가입니다. 다음 데이터를 분석하여 핵심 인사이트를 생성해주세요.

[분석 데이터]
- 테마: ${input.theme}
- 업종: ${input.industry}
- 수출액: $${(input.exportValue / 1e9).toFixed(2)}B
- 수입액: $${(input.importValue / 1e9).toFixed(2)}B
- 수출 성장률: ${input.exportGrowth.toFixed(1)}%
- 수입 성장률: ${input.importGrowth.toFixed(1)}%
- 무역수지: $${(input.tradeBalance / 1e9).toFixed(2)}B
- 트렌드: ${input.trendDirection === 'increasing' ? '상승' : input.trendDirection === 'decreasing' ? '하락' : '안정'}
- 위험도: ${input.riskLevel === 'low' ? '낮음' : input.riskLevel === 'medium' ? '중간' : '높음'}
- 변동성: ${input.volatility.toFixed(1)}%
- 계절성: ${input.seasonalityDetected ? '감지됨' : '없음'}
- 성장 확률: ${input.growthProbability.toFixed(1)}%

다음 JSON 형식으로 응답해주세요:
{
  "summary": "한 문장으로 현재 상황을 요약",
  "keyMetrics": [
    {"label": "지표명", "value": "값", "trend": "up|down|stable", "change": 숫자},
    ...
  ],
  "alerts": [
    {"type": "warning|info|success", "message": "알림 메시지"},
    ...
  ],
  "keyInsights": [
    "인사이트 1",
    "인사이트 2",
    "인사이트 3"
  ],
  "recommendations": [
    "권장사항 1",
    "권장사항 2"
  ],
  "forecast": "향후 3개월 전망 요약"
}
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: '당신은 수출입 동향 분석 전문가입니다. 정확하고 실용적인 인사이트를 제공합니다.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'export_import_insight',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: '현재 상황 요약' },
              keyMetrics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    label: { type: 'string' },
                    value: { type: 'string' },
                    trend: { type: 'string', enum: ['up', 'down', 'stable'] },
                    change: { type: 'number' }
                  },
                  required: ['label', 'value', 'trend', 'change'],
                  additionalProperties: false
                }
              },
              alerts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['warning', 'info', 'success'] },
                    message: { type: 'string' }
                  },
                  required: ['type', 'message'],
                  additionalProperties: false
                }
              },
              keyInsights: {
                type: 'array',
                items: { type: 'string' }
              },
              recommendations: {
                type: 'array',
                items: { type: 'string' }
              },
              forecast: { type: 'string' }
            },
            required: ['summary', 'keyMetrics', 'alerts', 'keyInsights', 'recommendations', 'forecast'],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Invalid response format from LLM');
    }

    const parsed = JSON.parse(content);
    return parsed as GeneratedInsight;
  } catch (error) {
    console.error('[InsightGenerator] Error generating insights:', error);
    
    // Fallback: 기본 인사이트 생성
    return generateFallbackInsight(input);
  }
}

/**
 * LLM 호출 실패 시 기본 인사이트 생성
 */
function generateFallbackInsight(input: InsightGeneratorInput): GeneratedInsight {
  const alerts: GeneratedInsight['alerts'] = [];
  
  if (Math.abs(input.exportGrowth) > 10) {
    alerts.push({
      type: 'warning',
      message: `수출이 ${Math.abs(input.exportGrowth).toFixed(1)}% 급변했습니다.`
    });
  }
  
  if (Math.abs(input.importGrowth) > 10) {
    alerts.push({
      type: 'warning',
      message: `수입이 ${Math.abs(input.importGrowth).toFixed(1)}% 급변했습니다.`
    });
  }

  if (input.riskLevel === 'high') {
    alerts.push({
      type: 'warning',
      message: '시장 변동성이 높습니다. 주의가 필요합니다.'
    });
  }

  if (input.growthProbability > 70) {
    alerts.push({
      type: 'success',
      message: '성장 확률이 높습니다.'
    });
  }

  return {
    summary: `${input.theme} 부문 ${input.industry} 산업의 ${input.trendDirection === 'increasing' ? '상승' : input.trendDirection === 'decreasing' ? '하락' : '안정'} 추세를 보이고 있습니다.`,
    keyMetrics: [
      {
        label: '수출액',
        value: `$${(input.exportValue / 1e9).toFixed(2)}B`,
        trend: input.exportGrowth > 0 ? 'up' : input.exportGrowth < 0 ? 'down' : 'stable',
        change: input.exportGrowth
      },
      {
        label: '수입액',
        value: `$${(input.importValue / 1e9).toFixed(2)}B`,
        trend: input.importGrowth > 0 ? 'up' : input.importGrowth < 0 ? 'down' : 'stable',
        change: input.importGrowth
      },
      {
        label: '무역수지',
        value: `$${(input.tradeBalance / 1e9).toFixed(2)}B`,
        trend: input.tradeBalance > 0 ? 'up' : input.tradeBalance < 0 ? 'down' : 'stable',
        change: input.tradeBalance > 0 ? 1 : -1
      }
    ],
    alerts,
    keyInsights: [
      `${input.theme} 부문의 수출이 ${input.exportGrowth > 0 ? '증가' : '감소'}하고 있습니다.`,
      `${input.industry} 산업의 무역수지가 ${input.tradeBalance > 0 ? '흑자' : '적자'}입니다.`,
      `시장 변동성은 ${input.volatility.toFixed(1)}%로 ${input.riskLevel === 'low' ? '낮은' : input.riskLevel === 'medium' ? '중간' : '높은'} 수준입니다.`
    ],
    recommendations: [
      input.trendDirection === 'increasing' ? '상승 추세를 활용한 수출 확대 전략 추진' : '시장 변화에 대응한 전략 재검토',
      input.riskLevel === 'high' ? '리스크 관리 강화 필요' : '현재 추세 유지',
      input.seasonalityDetected ? '계절성을 고려한 수급 계획 수립' : '연중 안정적인 수급 관리'
    ],
    forecast: `향후 3개월 성장 확률은 ${input.growthProbability.toFixed(1)}%입니다. ${input.growthProbability > 60 ? '긍정적 전망' : '신중한 접근'} 필요합니다.`
  };
}
