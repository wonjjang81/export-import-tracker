/**
 * Web Push 알림 발송 헬퍼 함수
 * web-push 라이브러리를 사용하여 구독자에게 푸시 알림을 발송합니다.
 */

import webpush from 'web-push';
import { getDb } from './db';
import { userSubscriptions, notificationHistory } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// VAPID 키 설정
export function initializeWebPush() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.warn('[WebPush] VAPID keys are not configured. Push notifications will not work.');
    return false;
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    console.log('[WebPush] VAPID details configured successfully');
    return true;
  } catch (error) {
    console.error('[WebPush] Failed to set VAPID details:', error);
    return false;
  }
}

/**
 * 모든 구독 사용자에게 푸시 알림 발송
 */
export async function sendPushNotificationToSubscribers(
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
  }
) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WebPush] Database not available');
      return { success: false, sent: 0, failed: 0, error: 'Database unavailable' };
    }

    // 활성 구독 사용자 조회
    const subscribers = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.subscriptionStatus, 'active') as any);

    if (subscribers.length === 0) {
      console.log('[WebPush] No active subscribers found');
      return { success: true, sent: 0, failed: 0, message: 'No active subscribers' };
    }

    let sent = 0;
    let failed = 0;

    // 각 구독자에게 알림 발송
    const pushPromises = subscribers.map(async (sub) => {
      try {
        if (!sub.pushSubscription) {
          console.warn(`[WebPush] No push subscription for user ${sub.userId}`);
          failed++;
          return;
        }

        // 푸시 구독 객체 파싱
        const subscription = typeof sub.pushSubscription === 'string'
          ? JSON.parse(sub.pushSubscription)
          : sub.pushSubscription;

        // 푸시 알림 발송
        await webpush.sendNotification(subscription, JSON.stringify({
          title,
          options,
        }));

        sent++;

        // 알림 이력 저장
        try {
          await db.insert(notificationHistory).values({
            userId: sub.userId,
            trendId: 0,
            notificationType: 'analysis_complete',
            title,
            body: options.body,
            status: 'sent',
            sentAt: new Date(),
            isRead: false,
            createdAt: new Date(),
          } as any);
        } catch (dbError) {
          console.error(`[WebPush] Failed to save notification history for user ${sub.userId}:`, dbError);
        }
      } catch (error) {
        console.error(`[WebPush] Failed to send notification to user ${sub.userId}:`, error);
        failed++;

        // 구독 실패 처리 (구독 취소됨 등)
        if (error instanceof Error && error.message.includes('410')) {
          // 410 Gone - 구독이 더 이상 유효하지 않음
          try {
            await db
              .update(userSubscriptions)
              .set({
                subscriptionStatus: 'cancelled',
                pushNotificationEnabled: false,
                cancelledAt: new Date(),
              })
              .where(eq(userSubscriptions.userId, sub.userId) as any);
          } catch (updateError) {
            console.error(`[WebPush] Failed to update subscription status for user ${sub.userId}:`, updateError);
          }
        }
      }
    });

    await Promise.all(pushPromises);

    console.log(`[WebPush] Push notifications sent: ${sent}, failed: ${failed}`);
    return { success: true, sent, failed };
  } catch (error) {
    console.error('[WebPush] Error sending push notifications:', error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 특정 사용자에게 푸시 알림 발송
 */
export async function sendPushNotificationToUser(
  userId: string,
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
  }
) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[WebPush] Database not available');
      return { success: false, error: 'Database unavailable' };
    }

    // 사용자 구독 조회
    const subscription = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, parseInt(userId)) as any)
      .limit(1);

    if (subscription.length === 0 || subscription[0].subscriptionStatus !== 'active') {
      console.warn(`[WebPush] No active subscription for user ${userId}`);
      return { success: false, error: 'No active subscription' };
    }

    const sub = subscription[0];
    if (!sub.pushSubscription) {
      console.warn(`[WebPush] No push subscription for user ${userId}`);
      return { success: false, error: 'No push subscription' };
    }

    try {
      // 푸시 구독 객체 파싱
      const pushSub = typeof sub.pushSubscription === 'string'
        ? JSON.parse(sub.pushSubscription)
        : sub.pushSubscription;

      // 푸시 알림 발송
      await webpush.sendNotification(pushSub, JSON.stringify({
        title,
        options,
      }));

      // 알림 이력 저장
      try {
        await db.insert(notificationHistory).values({
          userId: parseInt(userId),
          trendId: 0,
          notificationType: 'analysis_complete',
          title,
          body: options.body,
          status: 'sent',
          sentAt: new Date(),
          isRead: false,
          createdAt: new Date(),
        } as any);
      } catch (dbError) {
        console.error(`[WebPush] Failed to save notification history for user ${userId}:`, dbError);
      }

      return { success: true };
    } catch (error) {
      console.error(`[WebPush] Failed to send notification to user ${userId}:`, error);

      // 구독 실패 처리
      if (error instanceof Error && error.message.includes('410')) {
        try {
          await db
            .update(userSubscriptions)
            .set({
              subscriptionStatus: 'cancelled',
              pushNotificationEnabled: false,
              cancelledAt: new Date(),
            })
            .where(eq(userSubscriptions.userId, parseInt(userId)) as any);
        } catch (updateError) {
          console.error(`[WebPush] Failed to update subscription status for user ${userId}:`, updateError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  } catch (error) {
    console.error('[WebPush] Error sending push notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
