import { getDb, getOrCreateSchedulerState, updateSchedulerState, getRecentCrawlHistory, upsertPublishingPattern } from './db';
import { publishingPatterns } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * 고도화된 스케줄 모드 정의
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
 * 학습된 게시 패턴 데이터
 */
export interface PublishingPatternData {
  month: number;
  avgPublishHour: number;
  avgPublishMinute: number;
  stdDeviation: number;
  publishProbability: number;
  observationCount: number;
}

/**
 * 동적 스케줄 설정 (게시 패턴 기반)
 */
export class DynamicScheduleManager {
  private patternCache: Map<number, PublishingPatternData> = new Map();

  /**
   * 게시 패턴 캐시 로드
   */
  async loadPatterns(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      const patterns = await db.select().from(publishingPatterns);
      this.patternCache.clear();

      for (const pattern of patterns) {
        if (pattern.month) {
          this.patternCache.set(pattern.month, {
            month: pattern.month,
            avgPublishHour: pattern.avgPublishHour ? parseFloat(pattern.avgPublishHour.toString()) : 9,
            avgPublishMinute: pattern.avgPublishMinute ? parseFloat(pattern.avgPublishMinute.toString()) : 0,
            stdDeviation: pattern.stdDeviation ? parseFloat(pattern.stdDeviation.toString()) : 1,
            publishProbability: pattern.publishProbability ? parseFloat(pattern.publishProbability.toString()) : 50,
            observationCount: pattern.observationCount || 0,
          });
        }
      }

      console.log(`[AdvancedScheduler] Loaded ${this.patternCache.size} publishing patterns`);
    } catch (error) {
      console.error('[AdvancedScheduler] Error loading patterns:', error);
    }
  }

  /**
   * 현재 시간에 기반하여 동적 스케줄 모드 결정
   * 학습된 게시 패턴을 고려하여 Peak/Buffer/Idle 시간대 결정
   */
  determineScheduleMode(now: Date = new Date()): ScheduleMode {
    const dayOfMonth = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const month = now.getMonth() + 1; // 1~12

    // 매월 1일이 아니면 idle 모드
    if (dayOfMonth !== 1) {
      return 'idle';
    }

    // 학습된 패턴에서 현재 월의 데이터 조회
    const pattern = this.patternCache.get(month);

    if (!pattern || pattern.publishProbability < 10) {
      // 게시 확률이 낮으면 idle 모드
      return 'idle';
    }

    // 학습된 평균 게시 시간 기반 모드 결정
    const avgHour = Math.floor(pattern.avgPublishHour);
    const stdDev = pattern.stdDeviation;

    // Peak Time: 평균 시간 ± 1시간 (게시 확률 80%+ 구간)
    // 예: 평균 09:00이면 08:00~10:00
    const peakStart = Math.max(0, avgHour - 1);
    const peakEnd = Math.min(23, avgHour + 1);

    if (hour >= peakStart && hour <= peakEnd) {
      // 더 세밀한 조정: 정각 시간 내에서 분 단위로 조정
      if (hour === avgHour) {
        return 'peak'; // 평균 시간대는 peak
      }
      if (hour === peakStart || hour === peakEnd) {
        return 'buffer'; // 경계 시간은 buffer
      }
      return 'peak';
    }

    // Buffer Time: Peak Time 전후 1시간 (게시 확률 30~50% 구간)
    const bufferStart = Math.max(0, peakStart - 1);
    const bufferEnd = Math.min(23, peakEnd + 1);

    if ((hour >= bufferStart && hour < peakStart) || (hour > peakEnd && hour <= bufferEnd)) {
      return 'buffer';
    }

    // 그 외는 idle 모드
    return 'idle';
  }

  /**
   * 현재 모드에 맞는 크롤링 간격 반환 (분 단위)
   */
  getIntervalForMode(mode: ScheduleMode): number {
    switch (mode) {
      case 'peak':
        return 5; // 5분 간격
      case 'buffer':
        return 15; // 15분 간격
      case 'idle':
        return 720; // 12시간 간격
    }
  }

  /**
   * 다음 크롤링 예정 시간 계산
   */
  calculateNextCrawlTime(now: Date = new Date()): Date {
    const nextTime = new Date(now);
    const mode = this.determineScheduleMode(now);
    const intervalMinutes = this.getIntervalForMode(mode);

    nextTime.setMinutes(nextTime.getMinutes() + intervalMinutes);

    return nextTime;
  }

  /**
   * 게시 패턴 학습 및 업데이트
   */
  async learnPublishingPatterns(): Promise<void> {
    try {
      console.log('[AdvancedScheduler] Learning publishing patterns from crawl history...');

      // 최근 200개의 크롤링 이력 조회
      const history = await getRecentCrawlHistory(200);

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

        // 표준편차 계산 (시간 단위)
        const variance = stats.times.reduce((sum, d) => {
          const diff = d.getHours() - avgHour;
          return sum + diff * diff;
        }, 0) / stats.times.length;
        const stdDeviation = Math.sqrt(variance);

        // 게시 확률 계산 (최근 12개월 중 게시된 월 비율)
        const publishProbability = (stats.count / 12) * 100;

        console.log(
          `[AdvancedScheduler] Month ${month}: avg=${avgHour.toFixed(1)}:${avgMinute.toFixed(0)}, ` +
          `std=${stdDeviation.toFixed(2)}, prob=${publishProbability.toFixed(1)}%`
        );

        // 캐시 업데이트
        this.patternCache.set(month, {
          month,
          avgPublishHour: avgHour,
          avgPublishMinute: avgMinute,
          stdDeviation,
          publishProbability,
          observationCount: stats.count,
        });

        // DB 업데이트
        await upsertPublishingPattern({
          month,
          avgPublishHour: avgHour as any,
          avgPublishMinute: avgMinute as any,
          stdDeviation: stdDeviation as any,
          publishProbability: publishProbability as any,
          observationCount: stats.count,
        });
      }

      console.log('[AdvancedScheduler] Publishing pattern learning completed');
    } catch (error) {
      console.error('[AdvancedScheduler] Error learning patterns:', error);
    }
  }

  /**
   * 스케줄러 상태 업데이트
   */
  async updateSchedulerModeAndTime(mode: ScheduleMode, nextTime: Date): Promise<void> {
    try {
      await updateSchedulerState({
        currentMode: mode,
        nextCrawlTime: nextTime,
        lastCrawlTime: new Date(),
      });

      console.log(`[AdvancedScheduler] Mode updated to '${mode}', next crawl at ${nextTime.toISOString()}`);
    } catch (error) {
      console.error('[AdvancedScheduler] Error updating scheduler state:', error);
    }
  }

  /**
   * 스케줄러 초기화
   */
  async initialize(): Promise<void> {
    try {
      console.log('[AdvancedScheduler] Initializing advanced scheduler...');

      // 게시 패턴 로드
      await this.loadPatterns();

      // 게시 패턴 학습
      await this.learnPublishingPatterns();

      // 현재 모드 결정
      const now = new Date();
      const mode = this.determineScheduleMode(now);
      const nextTime = this.calculateNextCrawlTime(now);

      // 스케줄러 상태 업데이트
      await this.updateSchedulerModeAndTime(mode, nextTime);

      console.log(`[AdvancedScheduler] Initialized with mode '${mode}'`);
    } catch (error) {
      console.error('[AdvancedScheduler] Error initializing scheduler:', error);
    }
  }

  /**
   * 주기적으로 호출되는 스케줄 체크 함수
   */
  async checkAndUpdateSchedule(now: Date = new Date()): Promise<{
    shouldCrawl: boolean;
    currentMode: ScheduleMode;
    nextCrawlTime: Date;
  }> {
    try {
      const state = await getOrCreateSchedulerState();
      const currentMode = this.determineScheduleMode(now);
      const nextCrawlTime = this.calculateNextCrawlTime(now);

      // 모드 변경 감지
      if (state.currentMode !== currentMode) {
        console.log(`[AdvancedScheduler] Mode changed from '${state.currentMode}' to '${currentMode}'`);
        await this.updateSchedulerModeAndTime(currentMode, nextCrawlTime);
      }

      // 크롤링 필요 여부 판단
      const shouldCrawl = state.nextCrawlTime && now >= state.nextCrawlTime;

      if (shouldCrawl) {
        console.log(`[AdvancedScheduler] Time to crawl! Current mode: ${currentMode}`);
      }

      return {
        shouldCrawl,
        currentMode,
        nextCrawlTime,
      };
    } catch (error) {
      console.error('[AdvancedScheduler] Error checking schedule:', error);
      return {
        shouldCrawl: false,
        currentMode: 'idle',
        nextCrawlTime: new Date(Date.now() + 3600000), // 1시간 후
      };
    }
  }

  /**
   * 현재 상태 조회
   */
  async getStatus(): Promise<{
    currentMode: ScheduleMode;
    nextCrawlTime: Date;
    lastCrawlTime?: Date;
    patternCount: number;
  }> {
    try {
      const state = await getOrCreateSchedulerState();
      const now = new Date();
      const mode = this.determineScheduleMode(now);

      return {
        currentMode: mode,
        nextCrawlTime: state.nextCrawlTime || new Date(),
        lastCrawlTime: state.lastCrawlTime || undefined,
        patternCount: this.patternCache.size,
      };
    } catch (error) {
      console.error('[AdvancedScheduler] Error getting status:', error);
      return {
        currentMode: 'idle',
        nextCrawlTime: new Date(),
        patternCount: 0,
      };
    }
  }
}

// 싱글톤 인스턴스
export const schedulerManager = new DynamicScheduleManager();
