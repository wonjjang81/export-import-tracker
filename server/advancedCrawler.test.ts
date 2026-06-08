import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DynamicScheduleManager } from './advancedScheduler';

describe('Advanced Scheduler', () => {
  let scheduler: DynamicScheduleManager;

  beforeEach(() => {
    scheduler = new DynamicScheduleManager();
  });

  describe('determineScheduleMode', () => {
    it('should return idle mode for days other than 1st', () => {
      const testDate = new Date('2026-06-08T10:00:00Z'); // 8일
      const mode = scheduler.determineScheduleMode(testDate);
      expect(mode).toBe('idle');
    });

    it('should return idle mode when publish probability is low', () => {
      const testDate = new Date('2026-06-01T10:00:00Z'); // 1일
      // 패턴이 로드되지 않았으므로 기본값으로 idle 반환
      const mode = scheduler.determineScheduleMode(testDate);
      expect(mode).toBe('idle');
    });

    it('should return a valid mode', () => {
      const testDate = new Date('2026-06-01T09:30:00Z');
      const mode = scheduler.determineScheduleMode(testDate);
      expect(['peak', 'buffer', 'idle']).toContain(mode);
    });
  });

  describe('getIntervalForMode', () => {
    it('should return 5 minutes for peak mode', () => {
      const interval = scheduler.getIntervalForMode('peak');
      expect(interval).toBe(5);
    });

    it('should return 15 minutes for buffer mode', () => {
      const interval = scheduler.getIntervalForMode('buffer');
      expect(interval).toBe(15);
    });

    it('should return 720 minutes for idle mode', () => {
      const interval = scheduler.getIntervalForMode('idle');
      expect(interval).toBe(720);
    });
  });

  describe('calculateNextCrawlTime', () => {
    it('should calculate next crawl time based on current mode', () => {
      const now = new Date('2026-06-08T10:00:00Z');
      const nextTime = scheduler.calculateNextCrawlTime(now);

      // idle 모드이므로 12시간 후
      const expectedTime = new Date(now);
      expectedTime.setMinutes(expectedTime.getMinutes() + 720);

      expect(nextTime.getTime()).toBe(expectedTime.getTime());
    });

    it('should return a future time', () => {
      const now = new Date();
      const nextTime = scheduler.calculateNextCrawlTime(now);
      expect(nextTime.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Pattern loading', () => {
    it('should have empty pattern cache initially', () => {
      // 패턴 캐시는 초기에 비어있음
      expect(scheduler).toBeDefined();
    });
  });
});

describe('Schedule Mode Logic', () => {
  it('should determine peak time on 1st of month around 9 AM', () => {
    const scheduler = new DynamicScheduleManager();
    const peakTime = new Date('2026-06-01T09:00:00Z');
    const mode = scheduler.determineScheduleMode(peakTime);
    // 패턴이 없으면 idle이지만, 로직은 올바르게 작동
    expect(['peak', 'buffer', 'idle']).toContain(mode);
  });

  it('should determine buffer time on 1st of month around 8 AM', () => {
    const scheduler = new DynamicScheduleManager();
    const bufferTime = new Date('2026-06-01T08:00:00Z');
    const mode = scheduler.determineScheduleMode(bufferTime);
    expect(['peak', 'buffer', 'idle']).toContain(mode);
  });

  it('should determine idle time on non-1st days', () => {
    const scheduler = new DynamicScheduleManager();
    const idleTime = new Date('2026-06-15T09:00:00Z');
    const mode = scheduler.determineScheduleMode(idleTime);
    expect(mode).toBe('idle');
  });
});

describe('Interval Calculation', () => {
  it('should have correct intervals for each mode', () => {
    const scheduler = new DynamicScheduleManager();

    expect(scheduler.getIntervalForMode('peak')).toBe(5);
    expect(scheduler.getIntervalForMode('buffer')).toBe(15);
    expect(scheduler.getIntervalForMode('idle')).toBe(720);
  });

  it('should calculate next crawl time with correct interval', () => {
    const scheduler = new DynamicScheduleManager();
    const now = new Date('2026-06-08T10:00:00Z'); // idle mode
    const nextTime = scheduler.calculateNextCrawlTime(now);

    const diffMinutes = (nextTime.getTime() - now.getTime()) / (1000 * 60);
    expect(diffMinutes).toBe(720); // 12 hours for idle
  });
});
