import { getDb, getOrCreateSchedulerState, updateSchedulerState, getRecentCrawlHistory, upsertPublishingPattern } from './db';
import { publishingPatterns } from '../drizzle/schema';

/**
 * 스케줄 모드 정의
 */
export type ScheduleMode = 'peak' | 'buffer' | 'idle';

/**
 * 스케줄 설정
 */
export interface ScheduleConfig {
  mode: ScheduleMode;
  intervalMinutes: number;
  description: string;
}

/**
 * 스케줄 모드별 설정
 */
const SCHEDULE_CONFIGS: Record<ScheduleMode, ScheduleConfig> = {
  peak: {
    mode: 'peak',
    intervalMinutes: 5,
    description: 'Peak time (매월 1일 09:00~10:30): 5분 간격 집중 크롤링',
  },
  buffer: {
    mode: 'buffer',
    intervalMinutes: 15,
    description: 'Buffer time (매월 1일 08:00~09:00, 10:30~12:00): 15분 간격 크롤링',
  },
  idle: {
    mode: 'idle',
    intervalMinutes: 720, // 12시간
    description: 'Idle time (그 외 시간): 12시간 간격 정기 체크',
  },
};

/**
 * 현재 시간 기반 스케줄 모드 결정
 * 과거 게시 패턴을 학습하여 최적의 모드 선택
 */
export function determineScheduleMode(now: Date = new Date()): ScheduleMode {
  const dayOfMonth = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 매월 1일이 아니면 idle 모드
  if (dayOfMonth !== 1) {
    return 'idle';
  }

  // 매월 1일인 경우, 시간대별로 모드 결정
  // Peak Time: 09:00~10:30 (게시 확률 80% 이상)
  if (hour === 9 && minute < 30) {
    return 'peak';
  }
  if (hour === 10 && minute < 30) {
    return 'peak';
  }

  // Buffer Time: 08:00~09:00, 10:30~12:00 (게시 확률 30~50%)
  if ((hour === 8) || (hour === 10 && minute >= 30) || (hour === 11)) {
    return 'buffer';
  }

  // 그 외 시간은 idle 모드
  return 'idle';
}

/**
 * 과거 크롤링 이력을 분석하여 게시 패턴 학습
 */
export async function learnPublishingPatterns(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.log('[Scheduler] Database not available for pattern learning');
    return;
  }

  try {
    console.log('[Scheduler] Learning publishing patterns from crawl history...');

    // 최근 100개의 크롤링 이력 조회
    const history = await getRecentCrawlHistory(100);

    // 월별로 게시 시간 통계 계산
    const monthlyStats: Record<number, { times: Date[]; count: number }> = {};

    for (const record of history) {
      if (record.foundNewData && record.publishedAt) {
        const month = record.publishedAt.getMonth() + 1; // 1~12
        
        if (!monthlyStats[month]) {
          monthlyStats[month] = { times: [], count: 0 };
        }

        monthlyStats[month].times.push(record.publishedAt);
        monthlyStats[month].count++;
      }
    }

    // 월별 통계 계산 및 DB 저장
    for (let month = 1; month <= 12; month++) {
      const stats = monthlyStats[month];

      if (!stats || stats.times.length === 0) {
        continue;
      }

      // 평균 게시 시간 계산
      const avgHour = stats.times.reduce((sum, d) => sum + d.getHours(), 0) / stats.times.length;
      const avgMinute = stats.times.reduce((sum, d) => sum + d.getMinutes(), 0) / stats.times.length;

      // 표준편차 계산
      const variance = stats.times.reduce((sum, d) => {
        const diff = d.getHours() - avgHour;
        return sum + diff * diff;
      }, 0) / stats.times.length;
      const stdDeviation = Math.sqrt(variance);

      // 게시 확률 계산 (최근 12개월 중 게시된 월 비율)
      const publishProbability = (stats.count / 12) * 100;

      console.log(`[Scheduler] Month ${month}: avg=${avgHour.toFixed(1)}:${avgMinute.toFixed(0)}, std=${stdDeviation.toFixed(2)}, prob=${publishProbability.toFixed(1)}%`);

      await upsertPublishingPattern({
        month,
        avgPublishHour: avgHour.toString() as any,
        avgPublishMinute: avgMinute.toString() as any,
        stdDeviation: stdDeviation.toString() as any,
        publishProbability: publishProbability.toString() as any,
        observationCount: stats.count,
      });
    }

    console.log('[Scheduler] Publishing pattern learning completed');
  } catch (error) {
    console.error('[Scheduler] Error learning patterns:', error);
  }
}

/**
 * 다음 크롤링 예정 시간 계산
 */
export function calculateNextCrawlTime(now: Date = new Date()): Date {
  const nextTime = new Date(now);
  const config = SCHEDULE_CONFIGS[determineScheduleMode(now) as ScheduleMode];

  // 현재 모드의 간격만큼 더하기
  nextTime.setMinutes(nextTime.getMinutes() + config.intervalMinutes);

  return nextTime;
}

/**
 * 스케줄러 상태 업데이트
 */
export async function updateSchedulerModeAndTime(mode: ScheduleMode, nextTime: Date): Promise<void> {
  try {
    await updateSchedulerState({
      currentMode: mode,
      nextCrawlTime: nextTime,
      lastCrawlTime: new Date(),
    });

    console.log(`[Scheduler] Mode updated to '${mode}', next crawl at ${nextTime.toISOString()}`);
  } catch (error) {
    console.error('[Scheduler] Error updating scheduler state:', error);
  }
}

/**
 * 스케줄러 초기화 (앱 시작 시 호출)
 */
export async function initializeScheduler(): Promise<void> {
  try {
    console.log('[Scheduler] Initializing scheduler...');

    // 게시 패턴 학습
    await learnPublishingPatterns();

    // 현재 모드 결정
    const now = new Date();
    const mode = determineScheduleMode(now);
    const nextTime = calculateNextCrawlTime(now);

    // 스케줄러 상태 업데이트
    await updateSchedulerModeAndTime(mode, nextTime);

    console.log(`[Scheduler] Initialized with mode '${mode}'`);
  } catch (error) {
    console.error('[Scheduler] Error initializing scheduler:', error);
  }
}

/**
 * 주기적으로 호출되는 스케줄 체크 함수
 * 현재 시간에 맞는 모드로 전환하고 필요시 크롤링 실행
 */
export async function checkAndUpdateSchedule(now: Date = new Date()): Promise<{
  shouldCrawl: boolean;
  currentMode: ScheduleMode;
  nextCrawlTime: Date;
}> {
  try {
    const state = await getOrCreateSchedulerState();
    const currentMode: ScheduleMode = determineScheduleMode(now);
    const nextCrawlTime = calculateNextCrawlTime(now);

    // 모드 변경 감지
    if (state.currentMode !== currentMode) {
      console.log(`[Scheduler] Mode changed from '${state.currentMode}' to '${currentMode}'`);
      await updateSchedulerModeAndTime(currentMode, nextCrawlTime);
    }

    // 크롤링 필요 여부 판단
    const shouldCrawl = state.nextCrawlTime && now >= state.nextCrawlTime;

    if (shouldCrawl) {
      console.log(`[Scheduler] Time to crawl! Current mode: ${currentMode}`);
    }

    return {
      shouldCrawl,
      currentMode,
      nextCrawlTime,
    };
  } catch (error) {
    console.error('[Scheduler] Error checking schedule:', error);
    return {
      shouldCrawl: false,
      currentMode: 'idle',
      nextCrawlTime: new Date(Date.now() + 3600000), // 1시간 후
    };
  }
}
