import axios from 'axios';
import * as cheerio from 'cheerio';
import * as PDFParse from 'pdf-parse';
const pdfParse = PDFParse as any;
import { invokeLLM } from './_core/llm';
import { getDb, saveCrawlHistory, getExportImportTrendByYearMonth, updateSchedulerState } from './db';
import { exportImportTrends } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * 고도화된 크롤링 결과 인터페이스
 */
export interface AdvancedCrawlResult {
  success: boolean;
  foundNewData: boolean;
  yearMonth?: string;
  publishedAt?: Date;
  pdfUrl?: string;
  title?: string;
  pdfContent?: string;
  extractedData?: any;
  error?: string;
  duration: number;
}

/**
 * MOTIE 보도자료 게시판에서 수출입 동향 자료 검색
 * Cheerio를 사용한 HTML 파싱으로 더 안정적인 데이터 추출
 */
export async function searchMOTIEPressRelease(): Promise<{
  title: string;
  url: string;
  publishedAt: Date;
  yearMonth: string;
} | null> {
  try {
    console.log('[AdvancedCrawler] Searching MOTIE press release...');

    // MOTIE 보도자료 검색 URL
    const searchUrl = 'https://www.motie.go.kr/kor/article/ATCL3f49a5a8c';
    const params = {
      searchKeyword: '수출입 동향',
      searchCondition: '1', // 제목 검색
      pageIndex: '1',
    };

    const response = await axios.get(searchUrl, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    // Cheerio를 사용한 HTML 파싱
    const $ = cheerio.load(response.data);

    // 게시물 목록에서 첫 번째 항목 추출
    const firstItem = $('table tbody tr').first();
    if (firstItem.length === 0) {
      console.log('[AdvancedCrawler] No press release found');
      return null;
    }

    // 제목 추출
    const titleElement = firstItem.find('td a');
    const title = titleElement.text().trim();
    const articlePath = titleElement.attr('href');

    if (!title || !articlePath) {
      console.log('[AdvancedCrawler] Could not extract title or URL');
      return null;
    }

    // 연월 추출 (정규표현식: "2026년 5월 수출입 동향" 형식)
    const monthMatch = title.match(/(\d{4})년\s+(\d{1,2})월\s+수출입\s+동향/);
    if (!monthMatch) {
      console.log('[AdvancedCrawler] Could not extract year/month from title:', title);
      return null;
    }

    const year = monthMatch[1];
    const month = monthMatch[2].padStart(2, '0');
    const yearMonth = `${year}${month}`;

    // 게시 날짜 추출
    const dateElement = firstItem.find('td').eq(3); // 일반적으로 4번째 열이 날짜
    const dateText = dateElement.text().trim();
    const publishedAt = parseKoreanDate(dateText) || new Date();

    // 전체 URL 구성
    const fullUrl = articlePath.startsWith('http')
      ? articlePath
      : `https://www.motie.go.kr${articlePath}`;

    console.log(`[AdvancedCrawler] Found: ${title} (${yearMonth})`);

    return {
      title,
      url: fullUrl,
      publishedAt,
      yearMonth,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AdvancedCrawler] Error searching press release:', errorMessage);
    throw error;
  }
}

/**
 * 한글 날짜 문자열을 Date 객체로 변환
 * 예: "2026-06-08" 또는 "2026.06.08"
 */
function parseKoreanDate(dateStr: string): Date | null {
  try {
    // 다양한 날짜 형식 지원
    const normalized = dateStr.replace(/\./g, '-');
    const date = new Date(normalized);
    
    if (!isNaN(date.getTime())) {
      return date;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 보도자료 상세 페이지에서 PDF 링크 추출
 */
export async function extractPDFLink(articleUrl: string): Promise<string | null> {
  try {
    console.log('[AdvancedCrawler] Extracting PDF link from:', articleUrl);

    const response = await axios.get(articleUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);

    // PDF 링크 찾기 (여러 가능한 선택자 시도)
    let pdfUrl = null;

    // 방법 1: 첨부파일 섹션에서 PDF 링크 찾기
    const attachmentLink = $('a[href*=".pdf"]').first().attr('href');
    if (attachmentLink) {
      pdfUrl = attachmentLink;
    }

    // 방법 2: 다운로드 버튼에서 찾기
    if (!pdfUrl) {
      const downloadLink = $('a:contains("다운로드")').attr('href');
      if (downloadLink) {
        pdfUrl = downloadLink;
      }
    }

    // 방법 3: 정규표현식으로 찾기
    if (!pdfUrl) {
      const pdfMatch = response.data.match(/href="([^"]*\.pdf)"/i);
      if (pdfMatch) {
        pdfUrl = pdfMatch[1];
      }
    }

    if (!pdfUrl) {
      console.log('[AdvancedCrawler] No PDF link found');
      return null;
    }

    // 상대 URL을 절대 URL로 변환
    if (!pdfUrl.startsWith('http')) {
      const baseUrl = new URL(articleUrl).origin;
      pdfUrl = `${baseUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`;
    }

    console.log('[AdvancedCrawler] Found PDF URL:', pdfUrl);
    return pdfUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AdvancedCrawler] Error extracting PDF link:', errorMessage);
    return null;
  }
}

/**
 * PDF 파일 다운로드 및 텍스트 추출
 */
export async function downloadAndParsePDF(pdfUrl: string): Promise<string | null> {
  try {
    console.log('[AdvancedCrawler] Downloading PDF from:', pdfUrl);

    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const pdfBuffer = Buffer.from(response.data);
    console.log('[AdvancedCrawler] PDF downloaded, size:', pdfBuffer.length, 'bytes');

    // PDF 파싱
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    if (!text || text.trim().length === 0) {
      console.warn('[AdvancedCrawler] PDF parsing resulted in empty text');
      return null;
    }

    console.log('[AdvancedCrawler] PDF parsed successfully, text length:', text.length);
    return text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AdvancedCrawler] Error downloading/parsing PDF:', errorMessage);
    return null;
  }
}

/**
 * 전체 크롤링 파이프라인 실행
 */
export async function runAdvancedCrawlPipeline(): Promise<AdvancedCrawlResult> {
  const startTime = Date.now();

  try {
    console.log('[AdvancedCrawler] Starting advanced crawl pipeline...');

    // 1. 보도자료 검색
    const searchResult = await searchMOTIEPressRelease();
    if (!searchResult) {
      const duration = Date.now() - startTime;
      await saveCrawlHistory({
        crawlTime: new Date(),
        crawlMode: 'idle',
        foundNewData: false,
        status: 'success',
        duration,
      });

      return {
        success: true,
        foundNewData: false,
        duration,
      };
    }

    const { title, url, publishedAt, yearMonth } = searchResult;

    // 2. 이미 처리된 데이터인지 확인
    const existing = await getExportImportTrendByYearMonth(yearMonth);
    if (existing) {
      console.log(`[AdvancedCrawler] Data for ${yearMonth} already exists`);
      const duration = Date.now() - startTime;

      await saveCrawlHistory({
        crawlTime: new Date(),
        crawlMode: 'idle',
        foundNewData: false,
        status: 'success',
        duration,
      });

      return {
        success: true,
        foundNewData: false,
        duration,
      };
    }

    // 3. PDF 링크 추출
    const pdfUrl = await extractPDFLink(url);
    if (!pdfUrl) {
      const duration = Date.now() - startTime;
      console.warn('[AdvancedCrawler] Could not extract PDF link');

      await saveCrawlHistory({
        crawlTime: new Date(),
        crawlMode: 'peak',
        foundNewData: true,
        discoveredYearMonth: yearMonth,
        publishedAt,
        status: 'failed',
        errorMessage: 'PDF link extraction failed',
        duration,
      });

      return {
        success: false,
        foundNewData: true,
        yearMonth,
        publishedAt,
        error: 'PDF link extraction failed',
        duration,
      };
    }

    // 4. PDF 다운로드 및 파싱
    const pdfContent = await downloadAndParsePDF(pdfUrl);
    if (!pdfContent) {
      const duration = Date.now() - startTime;
      console.warn('[AdvancedCrawler] PDF parsing failed');

      await saveCrawlHistory({
        crawlTime: new Date(),
        crawlMode: 'peak',
        foundNewData: true,
        discoveredYearMonth: yearMonth,
        publishedAt,
        status: 'failed',
        errorMessage: 'PDF parsing failed',
        duration,
      });

      return {
        success: false,
        foundNewData: true,
        yearMonth,
        publishedAt,
        pdfUrl,
        error: 'PDF parsing failed',
        duration,
      };
    }

    // 5. 크롤링 이력 저장
    const duration = Date.now() - startTime;
    await saveCrawlHistory({
      crawlTime: new Date(),
      crawlMode: 'peak',
      foundNewData: true,
      discoveredYearMonth: yearMonth,
      publishedAt,
      status: 'success',
      duration,
    });

    console.log(`[AdvancedCrawler] Crawl completed successfully for ${yearMonth}`);

    return {
      success: true,
      foundNewData: true,
      yearMonth,
      publishedAt,
      pdfUrl,
      title,
      pdfContent,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('[AdvancedCrawler] Crawl pipeline error:', errorMessage);

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
      duration,
    };
  }
}

/**
 * LLM을 사용하여 PDF 텍스트에서 수출입 동향 데이터 추출
 */
export async function analyzeExportImportDataFromText(pdfText: string, yearMonth: string): Promise<{
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
    console.log('[AdvancedCrawler] Starting LLM-based analysis for', yearMonth);

    // PDF 텍스트가 너무 길면 처음 부분만 사용
    const truncatedText = pdfText.substring(0, 8000);

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are an expert in Korean trade statistics. Extract key metrics from the provided export-import trends report text.

Return a JSON object with the following structure (all numbers should be actual values, not strings):
{
  "totalExport": number (in billion USD),
  "totalImport": number (in billion USD),
  "tradingBalance": number (in billion USD),
  "exportYoYGrowth": number (percentage, e.g., 5.2 for 5.2%),
  "importYoYGrowth": number (percentage),
  "exportByProduct": { "product name": percentage, ... },
  "importByProduct": { "product name": percentage, ... },
  "exportByRegion": { "country/region": percentage, ... },
  "importByRegion": { "country/region": percentage, ... },
  "aiAnalysisSummary": "Brief summary of key findings (2-3 sentences)",
  "keyInsights": {
    "주요변화": "Main changes compared to previous month",
    "향후전망": "Future outlook"
  }
}

Extract only factual data from the document. If a field is not available, omit it.
Focus on the most important metrics and trends.`,
        },
        {
          role: 'user',
          content: `Please analyze the following export-import trends report for ${yearMonth} and extract the key metrics:\n\n${truncatedText}`,
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
      console.log('[AdvancedCrawler] Analysis completed successfully');
      return parsed;
    }

    return {};
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AdvancedCrawler] Error analyzing data:', errorMessage);
    throw error;
  }
}

/**
 * 크롤링 및 분석 완전 파이프라인
 */
export async function runFullCrawlAndAnalysisPipeline(): Promise<{
  success: boolean;
  yearMonth?: string;
  trendData?: any;
  error?: string;
}> {
  try {
    console.log('[AdvancedCrawler] Starting full crawl and analysis pipeline...');

    // 1. 크롤링 실행
    const crawlResult = await runAdvancedCrawlPipeline();

    if (!crawlResult.success || !crawlResult.foundNewData || !crawlResult.pdfContent) {
      console.log('[AdvancedCrawler] Crawl did not find new data or failed');
      return {
        success: false,
        error: crawlResult.error || 'Crawl failed or no new data found',
      };
    }

    const { yearMonth, pdfContent, pdfUrl, publishedAt } = crawlResult;

    // 2. LLM 기반 분석
    const analysisResult = await analyzeExportImportDataFromText(pdfContent, yearMonth!);

    // 3. 데이터베이스에 저장
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const trendRecord = {
      yearMonth: yearMonth!,
      totalExport: analysisResult.totalExport ? analysisResult.totalExport.toString() : null,
      totalImport: analysisResult.totalImport ? analysisResult.totalImport.toString() : null,
      tradingBalance: analysisResult.tradingBalance ? analysisResult.tradingBalance.toString() : null,
      exportYoYGrowth: analysisResult.exportYoYGrowth ? analysisResult.exportYoYGrowth.toString() : null,
      importYoYGrowth: analysisResult.importYoYGrowth ? analysisResult.importYoYGrowth.toString() : null,
      exportByProduct: analysisResult.exportByProduct ? JSON.stringify(analysisResult.exportByProduct) : null,
      importByProduct: analysisResult.importByProduct ? JSON.stringify(analysisResult.importByProduct) : null,
      exportByRegion: analysisResult.exportByRegion ? JSON.stringify(analysisResult.exportByRegion) : null,
      importByRegion: analysisResult.importByRegion ? JSON.stringify(analysisResult.importByRegion) : null,
      aiAnalysisSummary: analysisResult.aiAnalysisSummary || null,
      keyInsights: analysisResult.keyInsights ? JSON.stringify(analysisResult.keyInsights) : null,
      sourceUrl: pdfUrl || null,
      pdfStorageKey: null, // 실제 구현에서는 S3에 저장 후 키 저장
    };

    await db.insert(exportImportTrends).values([trendRecord]);

    console.log(`[AdvancedCrawler] Data saved to database for ${yearMonth}`);

    return {
      success: true,
      yearMonth,
      trendData: analysisResult,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AdvancedCrawler] Full pipeline error:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
