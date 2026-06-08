import { createHeartbeatJob } from './_core/heartbeat';
import { runAdvancedCrawlPipeline, runFullCrawlAndAnalysisPipeline } from './advancedCrawler';
import { schedulerManager } from './advancedScheduler';
import { analysisEngine } from './analysisEngine';
import { notifyOwner } from './_core/notification';
import { getDb, getRecentExportImportTrends } from './db';

/**
 * 스마트 크롤링 작업 - 동적 스케줄링 기반
 */
export async function smartCrawlJob() {
  try {
    console.log('[HeartbeatJobs] Starting smart crawl job...');

    // 스케줄 체크
    const { shouldCrawl, currentMode, nextCrawlTime } = 
      await schedulerManager.checkAndUpdateSchedule();

    console.log(`[HeartbeatJobs] Mode: ${currentMode}, Should crawl: ${shouldCrawl}`);

    if (!shouldCrawl) {
      console.log(`[HeartbeatJobs] Not time to crawl yet. Next crawl at ${nextCrawlTime}`);
      return;
    }

    // 크롤링 및 분석 실행
    const result = await runFullCrawlAndAnalysisPipeline();

    if (result.success && result.yearMonth) {
      console.log(`[HeartbeatJobs] Successfully crawled and analyzed data for ${result.yearMonth}`);

      // 게시 패턴 학습 업데이트
      await schedulerManager.learnPublishingPatterns();

      // 소유자에게 알림 발송
      await notifyOwner({
        title: `수출입 동향 데이터 업데이트: ${result.yearMonth}`,
        content: `새로운 수출입 동향 자료가 수집되고 분석되었습니다.\n\n` +
                 `분석 결과:\n` +
                 `- 총 수출액: ${result.trendData?.totalExport || 'N/A'}\n` +
                 `- 총 수입액: ${result.trendData?.totalImport || 'N/A'}\n` +
                 `- 무역수지: ${result.trendData?.tradingBalance || 'N/A'}\n\n` +
                 `자세한 내용은 대시보드에서 확인하세요.`,
      });

      console.log('[HeartbeatJobs] Owner notification sent');
    } else {
      console.log(`[HeartbeatJobs] Crawl failed: ${result.error}`);
    }
  } catch (error) {
    console.error('[HeartbeatJobs] Error in smart crawl job:', error);
  }
}

/**
 * 게시 패턴 학습 작업 - 주 1회 실행
 */
export async function learnPublishingPatternsJob() {
  try {
    console.log('[HeartbeatJobs] Starting publishing pattern learning job...');

    await schedulerManager.learnPublishingPatterns();

    console.log('[HeartbeatJobs] Publishing pattern learning completed');
  } catch (error) {
    console.error('[HeartbeatJobs] Error in learning job:', error);
  }
}

/**
 * 분석 캐시 정리 작업 - 일 1회 실행
 */
export async function cleanupAnalysisCacheJob() {
  try {
    console.log('[HeartbeatJobs] Starting analysis cache cleanup job...');

    const stats = analysisEngine.getCacheStats();
    console.log(`[HeartbeatJobs] Current cache size: ${stats.size} entries`);

    // 필요시 캐시 초기화 (메모리 정리)
    if (stats.size > 24) {
      analysisEngine.clearCache();
      console.log('[HeartbeatJobs] Cache cleared due to size limit');
    }
  } catch (error) {
    console.error('[HeartbeatJobs] Error in cache cleanup job:', error);
  }
}

/**
 * 시스템 상태 체크 작업 - 5분마다 실행
 */
export async function systemHealthCheckJob() {
  try {
    const schedulerStatus = await schedulerManager.getStatus();
    const cacheStats = analysisEngine.getCacheStats();

    const healthData = {
      timestamp: new Date().toISOString(),
      scheduler: {
        currentMode: schedulerStatus.currentMode,
        nextCrawlTime: schedulerStatus.nextCrawlTime,
        patternCount: schedulerStatus.patternCount,
      },
      cache: {
        size: cacheStats.size,
        keys: cacheStats.keys,
      },
    };

    console.log('[HeartbeatJobs] System health check:', JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.error('[HeartbeatJobs] Error in health check job:', error);
  }
}

/**
 * Heartbeat 작업 초기화
 * tRPC 라우터에서 호출되어 Heartbeat 작업을 등록
 */
export async function initializeHeartbeatJobs(userSession: string = '') {
  console.log('[HeartbeatJobs] Initializing heartbeat jobs...');

  try {
    // 스마트 크롤링: 매 5분마다 실행
    await createHeartbeatJob(
      {
        name: 'smartCrawl',
        cron: '0 */5 * * * *', // 매 5분
        path: '/api/scheduled/smartCrawl',
        method: 'POST',
        description: 'Smart crawling based on dynamic scheduling',
      },
      userSession
    );
    console.log('[HeartbeatJobs] smartCrawl job registered');

    // 게시 패턴 학습: 매 주 월요일 00:00
    await createHeartbeatJob(
      {
        name: 'learnPatterns',
        cron: '0 0 0 * * 1', // 매 주 월요일 자정
        path: '/api/scheduled/learnPatterns',
        method: 'POST',
        description: 'Learn publishing patterns from crawl history',
      },
      userSession
    );
    console.log('[HeartbeatJobs] learnPatterns job registered');

    // 캐시 정리: 매일 00:00
    await createHeartbeatJob(
      {
        name: 'cleanupCache',
        cron: '0 0 0 * * *', // 매일 자정
        path: '/api/scheduled/cleanupCache',
        method: 'POST',
        description: 'Cleanup analysis cache',
      },
      userSession
    );
    console.log('[HeartbeatJobs] cleanupCache job registered');

    // 시스템 상태 체크: 매 5분마다
    await createHeartbeatJob(
      {
        name: 'healthCheck',
        cron: '0 */5 * * * *', // 매 5분
        path: '/api/scheduled/healthCheck',
        method: 'POST',
        description: 'System health check',
      },
      userSession
    );
    console.log('[HeartbeatJobs] healthCheck job registered');

    console.log('[HeartbeatJobs] All heartbeat jobs initialized');
  } catch (error) {
    console.error('[HeartbeatJobs] Error initializing heartbeat jobs:', error);
  }
}
