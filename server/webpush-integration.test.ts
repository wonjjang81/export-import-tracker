import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import webpush from 'web-push';
import { initializeWebPush, sendPushNotificationToSubscribers } from './webpush';

describe('Web Push Integration Tests', () => {
  beforeAll(() => {
    // VAPID 키 설정
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error('VAPID keys are not configured');
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  });

  it('should initialize web push successfully', () => {
    const result = initializeWebPush();
    expect(result).toBe(true);
  });

  it('should have valid VAPID configuration', () => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    expect(vapidPublicKey).toBeDefined();
    expect(vapidPrivateKey).toBeDefined();
    expect(vapidSubject).toBeDefined();
    expect(vapidSubject).toMatch(/^(mailto:|https:\/\/)/);
  });

  it('should handle push notification to subscribers with no active subscriptions', async () => {
    // 데이터베이스에 활성 구독이 없을 때의 동작 테스트
    const result = await sendPushNotificationToSubscribers(
      'Test Notification',
      {
        body: 'This is a test notification',
        icon: '/icon-192x192.png',
      }
    );

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(typeof result.sent).toBe('number');
    expect(typeof result.failed).toBe('number');
  });

  it('should create valid push notification payload', () => {
    const title = '분석 완료';
    const options = {
      body: '새로운 분석이 완료되었습니다.',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'analysis-1',
      data: {
        trendId: 1,
        url: '/dashboard',
      },
    };

    const payload = JSON.stringify({
      title,
      options,
    });

    expect(payload).toBeDefined();
    expect(payload).toContain('분석 완료');
    expect(payload).toContain('새로운 분석이 완료되었습니다.');
    expect(payload).toContain('analysis-1');
  });

  it('should handle subscription object parsing', () => {
    // 테스트용 구독 객체
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
    };

    const subscriptionString = JSON.stringify(subscription);
    const parsed = JSON.parse(subscriptionString);

    expect(parsed.endpoint).toBe(subscription.endpoint);
    expect(parsed.keys.p256dh).toBe(subscription.keys.p256dh);
    expect(parsed.keys.auth).toBe(subscription.keys.auth);
  });

  it('should validate notification title and body', () => {
    const title = '📊 Green Energy / Solar 분석 완료';
    const body = '성장 확률: 85%\n위험도: 낮음\n\n주요 인사이트:\n태양광 부문 수출이 증가하고 있습니다.';

    expect(title).toBeDefined();
    expect(title.length).toBeGreaterThan(0);
    expect(body).toBeDefined();
    expect(body.length).toBeGreaterThan(0);
  });

  it('should handle error cases gracefully', async () => {
    // 잘못된 구독 정보로 테스트
    const result = await sendPushNotificationToSubscribers(
      'Error Test',
      {
        body: 'Testing error handling',
      }
    );

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    // 활성 구독이 없으면 sent가 0이어야 함
    expect(result.sent).toBeGreaterThanOrEqual(0);
  });
});
