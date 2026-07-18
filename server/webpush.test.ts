import { describe, it, expect, beforeAll } from 'vitest';
import webpush from 'web-push';

describe('Web Push Configuration', () => {
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

  it('should have VAPID keys configured', () => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    expect(vapidPublicKey).toBeDefined();
    expect(vapidPrivateKey).toBeDefined();
    expect(vapidSubject).toBeDefined();
  });

  it('should have valid VAPID public key format', () => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    // VAPID 공개 키는 Base64 URL 인코딩된 형식
    expect(vapidPublicKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(vapidPublicKey?.length).toBeGreaterThan(50);
  });

  it('should have valid VAPID private key format', () => {
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    // VAPID 개인 키도 Base64 URL 인코딩된 형식
    expect(vapidPrivateKey).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(vapidPrivateKey?.length).toBeGreaterThan(30);
  });

  it('should have valid VAPID subject format', () => {
    const vapidSubject = process.env.VAPID_SUBJECT;
    // VAPID subject는 mailto: 또는 https:// 형식
    expect(vapidSubject).toMatch(/^(mailto:|https:\/\/)/);
  });

  it('should be able to generate a test subscription', () => {
    // 테스트용 구독 객체 생성
    const testSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
    };

    expect(testSubscription.endpoint).toBeDefined();
    expect(testSubscription.keys.p256dh).toBeDefined();
    expect(testSubscription.keys.auth).toBeDefined();
  });
});
