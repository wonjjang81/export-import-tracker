import axios from 'axios';
import { invokeLLM } from './_core/llm';
import { getDb, saveCrawlHistory, getExportImportTrendByYearMonth } from './db';
import { exportImportTrends } from '../drizzle/schema';

/**
 * 산업통상자원부 보도자료 게시판에서 수출입 동향 자료 크롤링
 */
export interface CrawlResult {
  success: boolean;
  foundNewData: boolean;
  yearMonth?: string;
  publishedAt?: Date;
  pdfUrl?: string;
  title?: string;
  error?: string;
}

/**
 * MOTIE 보도자료 게시판 크롤링
 * 수출입 동향 키워드로 검색하여 최신 자료 탐색
 */
export async function crawlMOTIEPressRelease(): Promise<CrawlResult> {
  const startTime = Date.now();
  
  try {
    // MOTIE 보도자료 검색 URL (수출입 동향 키워드)
    const searchUrl = 'https://www.motie.go.kr/kor/article/ATCL3f49a5a8c';
    const params = {
      searchKeyword: '수출입 동향',
      searchCondition: '1', // 제목 검색
      pageIndex: '1',
      rowPageC: '10',
    };

    console.log('[Crawler] Starting MOTIE press release crawl...');
    
    const response = await axios.get(searchUrl, { 
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // HTML에서 최신 게시물 추출 (간단한 정규표현식 기반)
    // 실제 구현에서는 Cheerio 또는 Puppeteer를 사용하여 DOM 파싱
    const titleMatch = response.data.match(/2026년\s+(\d+)월\s+수출입\s+동향/);
    const urlMatch = response.data.match(/href="([^"]*\/article\/[^"]*?)"/);
    
    if (!titleMatch || !urlMatch) {
      console.log('[Crawler] No new export-import trend data found');
      
      await saveCrawlHistory({
        crawlTime: new Date(),
        crawlMode: 'idle',
        foundNewData: false,
        status: 'success',
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        foundNewData: false,
      };
    }

    const month = titleMatch[1];
    const yearMonth = `2026${month.padStart(2, '0')}`;
    const articleUrl = urlMatch[1];

    // 이미 처리된 데이터인지 확인
    const existing = await getExportImportTrendByYearMonth(yearMonth);
    if (existing) {
      console.log(`[Crawler] Data for ${yearMonth} already exists`);
      
      await saveCrawlHistory({
        crawlTime: new Date(),
        crawlMode: 'idle',
        foundNewData: false,
        status: 'success',
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        foundNewData: false,
      };
    }

    // 상세 페이지 접속하여 PDF 링크 추출
    const detailResponse = await axios.get(`https://www.motie.go.kr${articleUrl}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // PDF 링크 추출 (정규표현식)
    const pdfMatch = detailResponse.data.match(/href="([^"]*\.pdf)"/i);
    const pdfUrl = pdfMatch ? pdfMatch[1] : undefined;

    console.log(`[Crawler] Found new data: ${yearMonth}, PDF: ${pdfUrl}`);

    await saveCrawlHistory({
      crawlTime: new Date(),
      crawlMode: 'peak',
      foundNewData: true,
      discoveredYearMonth: yearMonth,
      publishedAt: new Date(),
      status: 'success',
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      foundNewData: true,
      yearMonth,
      publishedAt: new Date(),
      pdfUrl,
      title: titleMatch[0],
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('[Crawler] Error during crawl:', errorMessage);

    await saveCrawlHistory({
      crawlTime: new Date(),
      crawlMode: 'idle',
      foundNewData: false,
      status: 'failed',
      errorMessage,
      duration,
    });

    return {
      success: false,
      foundNewData: false,
      error: errorMessage,
    };
  }
}

/**
 * PDF 파일에서 텍스트 추출 (LLM 기반)
 * 실제 구현에서는 pdf2image, pytesseract 등을 사용하여 OCR 수행
 */
export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    console.log('[Crawler] Downloading PDF:', pdfUrl);
    
    // PDF 다운로드
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    // 실제 구현에서는 pdf-parse 또는 pdfjs-dist를 사용하여 텍스트 추출
    // 여기서는 LLM을 통한 문서 분석을 위해 base64 인코딩
    const base64 = Buffer.from(response.data).toString('base64');
    
    console.log('[Crawler] PDF downloaded, size:', response.data.length, 'bytes');
    
    return base64;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Crawler] Error extracting PDF text:', errorMessage);
    throw error;
  }
}

/**
 * LLM을 사용하여 수출입 동향 데이터 추출
 */
export async function analyzeExportImportData(pdfBase64: string, yearMonth: string): Promise<{
  totalExport?: number;
  totalImport?: number;
  tradingBalance?: number;
  exportYoYGrowth?: number;
  importYoYGrowth?: number;
  exportByProduct?: Record<string, number>;
  importByProduct?: Record<string, number>;
  exportByRegion?: Record<string, number>;
  importByRegion?: Record<string, number>;
  aiAnalysisSummary?: string;
  keyInsights?: Record<string, string>;
}> {
  try {
    console.log('[Analyzer] Starting LLM-based analysis for', yearMonth);

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an expert in Korean trade statistics. Extract key metrics from the provided PDF document about export-import trends.
          
Return a JSON object with the following structure:
{
  "totalExport": number (in billion USD),
  "totalImport": number (in billion USD),
  "tradingBalance": number (in billion USD),
  "exportYoYGrowth": number (percentage),
  "importYoYGrowth": number (percentage),
  "exportByProduct": { "product name": percentage, ... },
  "importByProduct": { "product name": percentage, ... },
  "exportByRegion": { "country/region": percentage, ... },
  "importByRegion": { "country/region": percentage, ... },
  "aiAnalysisSummary": "Brief summary of key findings",
  "keyInsights": {
    "주요변화": "Main changes compared to previous month",
    "향후전망": "Future outlook"
  }
}

Extract only factual data from the document. If a field is not available, omit it.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze the export-import trends report for ${yearMonth} and extract the key metrics.`,
            },
            {
              type: 'file_url',
              file_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
                mime_type: 'application/pdf',
              },
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'export_import_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              totalExport: { type: 'number' },
              totalImport: { type: 'number' },
              tradingBalance: { type: 'number' },
              exportYoYGrowth: { type: 'number' },
              importYoYGrowth: { type: 'number' },
              exportByProduct: { type: 'object', additionalProperties: { type: 'number' } },
              importByProduct: { type: 'object', additionalProperties: { type: 'number' } },
              exportByRegion: { type: 'object', additionalProperties: { type: 'number' } },
              importByRegion: { type: 'object', additionalProperties: { type: 'number' } },
              aiAnalysisSummary: { type: 'string' },
              keyInsights: { type: 'object', additionalProperties: { type: 'string' } },
            },
            required: [],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      const parsed = JSON.parse(content);
      console.log('[Analyzer] Analysis completed successfully');
      return parsed;
    }

    return {};
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Analyzer] Error analyzing data:', errorMessage);
    throw error;
  }
}
