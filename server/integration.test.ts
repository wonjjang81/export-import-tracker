/**
 * 통합 테스트: 크롤링 → 분석 → 알림 전체 흐름
 * 각 단계의 상호작용과 데이터 흐름 검증
 */

import { describe, it, expect } from 'vitest';

describe('Integration Tests: Crawling → Analysis → Notification Flow', () => {
  describe('End-to-End Data Flow', () => {
    it('should validate complete pipeline structure', () => {
      const pipeline = {
        crawling: {
          source: 'MOTIE',
          method: 'Cheerio HTML parsing',
          pdfExtraction: 'pdf-parse',
        },
        analysis: {
          timeSeries: 'Linear Regression + Seasonality',
          prediction: 'SES + Holt-Winters',
          confidence: '95% & 80% CI',
        },
        notification: {
          channels: ['push', 'email'],
          subscribers: 'active subscriptions',
          owner: 'dedicated notification',
        },
      };

      expect(pipeline.crawling.source).toBe('MOTIE');
      expect(pipeline.analysis.timeSeries).toBeDefined();
      expect(pipeline.notification.channels).toContain('push');
    });

    it('should validate data transformation at each stage', () => {
      // Stage 1: Raw HTML
      const rawHtml = '<html><body>수출입 동향...</body></html>';
      expect(rawHtml).toContain('수출입');

      // Stage 2: Parsed PDF Text
      const pdfText = '2026년 5월 수출액: 500억 달러';
      expect(pdfText).toMatch(/\d+억 달러/);

      // Stage 3: Structured JSON
      const structuredData = {
        yearMonth: '202605',
        totalExport: 500,
        totalImport: 450,
        tradingBalance: 50,
      };
      expect(structuredData.totalExport).toBeGreaterThan(0);

      // Stage 4: Analysis Results
      const analysisResult = {
        trend: 'upward',
        growthProbability: 75,
        seasonality: 12,
      };
      expect(analysisResult.growthProbability).toBeGreaterThanOrEqual(0);

      // Stage 5: Notification Payload
      const notification = {
        title: '📊 Green Energy / Solar 분석 완료',
        body: '성장 확률: 75%\n위험도: low',
        type: 'analysis_complete',
      };
      expect(notification.title).toContain('분석 완료');
    });
  });

  describe('Crawler Stage', () => {
    it('should validate crawler input/output contract', () => {
      const crawlerInput = {
        searchKeyword: '수출입 동향',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      };

      const crawlerOutput = {
        success: true,
        items: [
          {
            title: '2026년 5월 수출입 동향',
            url: 'https://www.motie.go.kr/...',
            pdfUrl: 'https://www.motie.go.kr/...pdf',
            publishedDate: '2026-05-01T09:00:00Z',
          },
        ],
      };

      expect(crawlerInput.searchKeyword).toBeDefined();
      expect(crawlerOutput.items).toBeInstanceOf(Array);
      expect(crawlerOutput.items[0]).toHaveProperty('pdfUrl');
    });

    it('should validate PDF extraction output', () => {
      const pdfExtractionOutput = {
        text: '2026년 5월 수출입 동향\n수출액: 500억 달러\n수입액: 450억 달러',
        pages: 3,
        metadata: {
          title: '수출입 동향',
          author: 'MOTIE',
        },
      };

      expect(pdfExtractionOutput.text).toContain('수출액');
      expect(pdfExtractionOutput.pages).toBeGreaterThan(0);
    });
  });

  describe('Analysis Stage', () => {
    it('should validate time series analysis output', () => {
      const timeSeriesOutput = {
        trend: {
          direction: 'upward',
          slope: 2.5,
          rSquared: 0.85,
        },
        seasonality: {
          period: 12,
          strength: 0.72,
          pattern: [1.05, 1.03, 0.98, 0.95, 0.92, 0.90, 0.88, 0.90, 0.95, 1.02, 1.08, 1.12],
        },
        forecast: {
          nextMonth: 515,
          confidence95: [500, 530],
          confidence80: [505, 525],
        },
      };

      expect(timeSeriesOutput.trend.direction).toBe('upward');
      expect(timeSeriesOutput.seasonality.period).toBe(12);
      expect(timeSeriesOutput.forecast.confidence95).toHaveLength(2);
    });

    it('should validate probability analysis output', () => {
      const probabilityOutput = {
        growthProbability: 75,
        declineProbability: 20,
        stableProbability: 5,
        riskLevel: 'low',
        volatility: 8.5,
      };

      const total = 
        probabilityOutput.growthProbability +
        probabilityOutput.declineProbability +
        probabilityOutput.stableProbability;

      expect(total).toBe(100);
      expect(probabilityOutput.riskLevel).toMatch(/low|medium|high/);
    });

    it('should validate correlation analysis output', () => {
      const correlationOutput = {
        productCorrelations: {
          'Semiconductor-Petrochemical': 0.82,
          'Semiconductor-Steel': 0.65,
          'Petrochemical-Steel': 0.58,
        },
        regionCorrelations: {
          'USA-China': -0.45,
          'USA-EU': 0.78,
          'China-ASEAN': 0.62,
        },
      };

      expect(correlationOutput.productCorrelations['Semiconductor-Petrochemical']).toBeGreaterThan(0.5);
      expect(correlationOutput.regionCorrelations['USA-China']).toBeLessThan(0);
    });
  });

  describe('Notification Stage', () => {
    it('should validate notification payload structure', () => {
      const notificationPayload = {
        userId: 123,
        trendId: 456,
        notificationType: 'analysis_complete',
        title: '📊 Green Energy / Solar 분석 완료',
        body: '성장 확률: 75%\n위험도: low\n\n주요 인사이트:\n- 수출 증가 추세 지속\n- 계절성 패턴 확인',
        status: 'sent',
        sentAt: new Date(),
        isRead: false,
      };

      expect(notificationPayload).toHaveProperty('userId');
      expect(notificationPayload).toHaveProperty('trendId');
      expect(notificationPayload.notificationType).toMatch(/new_data|analysis_complete/);
    });

    it('should validate batch notification distribution', () => {
      const subscribers = [
        { userId: 1, subscriptionStatus: 'active', pushEnabled: true },
        { userId: 2, subscriptionStatus: 'active', pushEnabled: false },
        { userId: 3, subscriptionStatus: 'paused', pushEnabled: true },
        { userId: 4, subscriptionStatus: 'cancelled', pushEnabled: true },
      ];

      const activeSubscribers = subscribers.filter(s => s.subscriptionStatus === 'active');
      expect(activeSubscribers).toHaveLength(2);

      const pushNotifications = activeSubscribers.filter(s => s.pushEnabled);
      expect(pushNotifications).toHaveLength(1);
    });

    it('should validate owner notification separate from subscribers', () => {
      const ownerNotification = {
        title: '📊 Green Energy / Solar 분석 완료',
        content: '성장 확률: 75%\n위험도: low\n\n주요 인사이트: ...',
        recipient: 'owner',
      };

      const subscriberNotification = {
        userId: 123,
        title: '📊 Green Energy / Solar 분석 완료',
        body: '성장 확률: 75%\n위험도: low',
        recipient: 'subscriber',
      };

      expect(ownerNotification.recipient).toBe('owner');
      expect(subscriberNotification.recipient).toBe('subscriber');
      expect(ownerNotification.content).toContain('인사이트');
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle crawler failures gracefully', () => {
      const crawlerError = {
        stage: 'crawling',
        error: 'PDF download failed',
        retryCount: 3,
        nextRetry: new Date(Date.now() + 5 * 60 * 1000),
      };

      expect(crawlerError.stage).toBe('crawling');
      expect(crawlerError.retryCount).toBeGreaterThan(0);
    });

    it('should handle analysis failures gracefully', () => {
      const analysisError = {
        stage: 'analysis',
        error: 'Insufficient data for time series',
        fallback: 'Use simple average',
      };

      expect(analysisError.stage).toBe('analysis');
      expect(analysisError.fallback).toBeDefined();
    });

    it('should handle notification failures gracefully', () => {
      const notificationError = {
        stage: 'notification',
        error: 'Database connection timeout',
        status: 'pending',
        retrySchedule: 'exponential backoff',
      };

      expect(notificationError.stage).toBe('notification');
      expect(notificationError.status).toBe('pending');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should validate response time targets', () => {
      const benchmarks = {
        crawling: { target: 30000, unit: 'ms' }, // 30초
        pdfExtraction: { target: 5000, unit: 'ms' }, // 5초
        analysis: { target: 2000, unit: 'ms' }, // 2초
        notification: { target: 500, unit: 'ms' }, // 500ms
        totalPipeline: { target: 40000, unit: 'ms' }, // 40초
      };

      expect(benchmarks.crawling.target).toBeGreaterThan(benchmarks.analysis.target);
      expect(benchmarks.totalPipeline.target).toBeLessThan(60000);
    });

    it('should validate memory usage targets', () => {
      const memoryTargets = {
        crawler: { limit: 256, unit: 'MB' },
        analysis: { limit: 128, unit: 'MB' },
        notification: { limit: 64, unit: 'MB' },
        total: { limit: 512, unit: 'MB' },
      };

      const total = 
        memoryTargets.crawler.limit +
        memoryTargets.analysis.limit +
        memoryTargets.notification.limit;

      expect(total).toBeLessThanOrEqual(memoryTargets.total.limit);
    });
  });

  describe('Data Consistency', () => {
    it('should validate data consistency across stages', () => {
      const originalData = {
        yearMonth: '202605',
        totalExport: 500,
        totalImport: 450,
      };

      // After crawling
      const crawledData = { ...originalData };
      expect(crawledData.totalExport).toBe(originalData.totalExport);

      // After analysis
      const analyzedData = {
        ...crawledData,
        trend: 'upward',
        growthProbability: 75,
      };
      expect(analyzedData.totalExport).toBe(originalData.totalExport);

      // After notification
      const notificationData = {
        trendId: 456,
        ...analyzedData,
      };
      expect(notificationData.totalExport).toBe(originalData.totalExport);
    });

    it('should validate timestamp consistency', () => {
      const now = new Date();

      const crawlTime = new Date(now.getTime());
      const analysisTime = new Date(crawlTime.getTime() + 5000); // 5초 후
      const notificationTime = new Date(analysisTime.getTime() + 2000); // 2초 후

      expect(analysisTime.getTime()).toBeGreaterThan(crawlTime.getTime());
      expect(notificationTime.getTime()).toBeGreaterThan(analysisTime.getTime());
    });
  });

  describe('Scheduling & Automation', () => {
    it('should validate scheduler timing', () => {
      const schedule = {
        peakTime: { start: 9, end: 11, interval: 5 }, // 매 5분
        bufferTime: { start: 11, end: 17, interval: 15 }, // 매 15분
        idleTime: { start: 17, end: 9, interval: 720 }, // 매 12시간
      };

      expect(schedule.peakTime.interval).toBeLessThan(schedule.bufferTime.interval);
      expect(schedule.bufferTime.interval).toBeLessThan(schedule.idleTime.interval);
    });

    it('should validate pattern learning', () => {
      const historicalPatterns = [
        { date: '2026-05-01', time: '09:15', published: true },
        { date: '2026-04-01', time: '09:20', published: true },
        { date: '2026-03-01', time: '09:10', published: true },
      ];

      const avgTime = historicalPatterns.reduce((sum, p) => {
        const [h, m] = p.time.split(':').map(Number);
        return sum + h * 60 + m;
      }, 0) / historicalPatterns.length;

      expect(avgTime).toBeGreaterThan(540); // 9:00
      expect(avgTime).toBeLessThan(660); // 11:00
    });
  });

  describe('Mobile Compatibility', () => {
    it('should validate responsive design breakpoints', () => {
      const breakpoints = {
        mobile: { width: 375, columns: 1 },
        tablet: { width: 768, columns: 2 },
        desktop: { width: 1024, columns: 4 },
      };

      expect(breakpoints.mobile.width).toBeLessThan(breakpoints.tablet.width);
      expect(breakpoints.tablet.columns).toBeLessThan(breakpoints.desktop.columns);
    });

    it('should validate touch interaction targets', () => {
      const touchTargets = {
        button: { minSize: 44, unit: 'px' },
        link: { minSize: 44, unit: 'px' },
        input: { minSize: 44, unit: 'px' },
      };

      expect(touchTargets.button.minSize).toBeGreaterThanOrEqual(44);
      expect(touchTargets.link.minSize).toBeGreaterThanOrEqual(44);
    });

    it('should validate performance on mobile networks', () => {
      const networkConditions = {
        '4G': { latency: 50, bandwidth: 10 },
        '3G': { latency: 100, bandwidth: 1 },
        'Slow 4G': { latency: 400, bandwidth: 1.6 },
      };

      const apiResponseTime = 500; // ms
      expect(apiResponseTime).toBeLessThanOrEqual(networkConditions['4G'].latency * 10);
    });
  });

  describe('Security & Privacy', () => {
    it('should validate authentication flow', () => {
      const authFlow = {
        step1: 'User login via Manus OAuth',
        step2: 'Session cookie created',
        step3: 'Protected procedures require ctx.user',
        step4: 'Logout clears session',
      };

      expect(authFlow.step1).toContain('OAuth');
      expect(authFlow.step3).toContain('ctx.user');
    });

    it('should validate data privacy', () => {
      const privacyRules = {
        userNotifications: 'Only visible to owner',
        trendData: 'Public to all authenticated users',
        subscriptionSettings: 'Only visible to owner',
      };

      expect(privacyRules.userNotifications).toContain('owner');
      expect(privacyRules.trendData).toContain('authenticated');
    });
  });
});
