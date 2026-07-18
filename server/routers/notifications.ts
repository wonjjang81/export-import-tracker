/**
 * 알림 및 구독 관리 라우터
 * 사용자 구독, 알림 발송, 알림 이력 관리
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { notifyOwner } from '../_core/notification';
import { getDb } from '../db';
import { notificationHistory, userSubscriptions } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const notificationsRouter = router({
  /**
   * 사용자 구독 설정 조회
   */
  getSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, data: null, error: 'Database unavailable' };
        }

        const subscription = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, ctx.user.id))
          .limit(1);

        if (subscription.length === 0) {
          return {
            success: true,
            data: {
              userId: ctx.user.id,
              pushNotificationEnabled: true,
              emailNotificationEnabled: false,
              subscriptionStatus: 'active',
              subscribedAt: new Date(),
              updatedAt: new Date(),
            },
          };
        }

        return {
          success: true,
          data: subscription[0],
        };
      } catch (error) {
        console.error('[notificationsRouter] Error getting subscription:', error);
        return {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Failed to fetch subscription',
        };
      }
    }),

  /**
   * 구독 설정 업데이트
   */
  updateSubscription: protectedProcedure
    .input(z.object({
      pushNotificationEnabled: z.boolean(),
      emailNotificationEnabled: z.boolean(),
      subscriptionStatus: z.enum(['active', 'paused', 'cancelled']),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: 'Database unavailable' };
        }

        // 기존 구독 확인
        const existing = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.userId, ctx.user.id))
          .limit(1);

        if (existing.length === 0) {
          // 새로 생성
          await db.insert(userSubscriptions).values({
            userId: ctx.user.id,
            pushNotificationEnabled: input.pushNotificationEnabled,
            emailNotificationEnabled: input.emailNotificationEnabled,
            subscriptionStatus: input.subscriptionStatus,
            subscribedAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          // 업데이트
          await db
            .update(userSubscriptions)
            .set({
              pushNotificationEnabled: input.pushNotificationEnabled,
              emailNotificationEnabled: input.emailNotificationEnabled,
              subscriptionStatus: input.subscriptionStatus,
              updatedAt: new Date(),
            })
            .where(eq(userSubscriptions.userId, ctx.user.id));
        }

        return { success: true };
      } catch (error) {
        console.error('[notificationsRouter] Error updating subscription:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update subscription',
        };
      }
    }),

  /**
   * 알림 이력 조회
   */
  getNotificationHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, data: [], count: 0, error: 'Database unavailable' };
        }

        const result = await db
          .select()
          .from(notificationHistory)
          .where(eq(notificationHistory.userId, ctx.user.id))
          .limit(input.limit)
          .offset(input.offset);

        return {
          success: true,
          data: result,
          count: result.length,
        };
      } catch (error) {
        console.error('[notificationsRouter] Error getting notification history:', error);
        return {
          success: false,
          data: [],
          count: 0,
          error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        };
      }
    }),

  /**
   * 알림 읽음 표시
   */
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: 'Database unavailable' };
        }

        // 권한 확인
        const notification = await db
          .select()
          .from(notificationHistory)
          .where(eq(notificationHistory.id, input.notificationId))
          .limit(1);

        if (notification.length === 0 || notification[0].userId !== ctx.user.id) {
          return { success: false, error: 'Notification not found' };
        }

        await db
          .update(notificationHistory)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(notificationHistory.id, input.notificationId));

        return { success: true };
      } catch (error) {
        console.error('[notificationsRouter] Error marking notification as read:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to mark as read',
        };
      }
    }),

  /**
   * 모든 알림 읽음 표시
   */
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: 'Database unavailable' };
        }

        await db
          .update(notificationHistory)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(notificationHistory.userId, ctx.user.id));

        return { success: true };
      } catch (error) {
        console.error('[notificationsRouter] Error marking all as read:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to mark all as read',
        };
      }
    }),

  /**
   * 읽지 않은 알림 수
   */
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, count: 0, error: 'Database unavailable' };
        }

        const result = await db
          .select()
          .from(notificationHistory)
          .where(eq(notificationHistory.userId, ctx.user.id));

        return {
          success: true,
          count: result.filter(n => !n.isRead).length,
        };
      } catch (error) {
        console.error('[notificationsRouter] Error getting unread count:', error);
        return {
          success: false,
          count: 0,
          error: error instanceof Error ? error.message : 'Failed to get unread count',
        };
      }
    }),

  /**
   * 알림 삭제
   */
  deleteNotification: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: 'Database unavailable' };
        }

        // 권한 확인
        const notification = await db
          .select()
          .from(notificationHistory)
          .where(eq(notificationHistory.id, input.notificationId))
          .limit(1);

        if (notification.length === 0 || notification[0].userId !== ctx.user.id) {
          return { success: false, error: 'Notification not found' };
        }

        // 삭제 대신 status를 'failed'로 설정
        await db
          .update(notificationHistory)
          .set({ status: 'failed' })
          .where(eq(notificationHistory.id, input.notificationId));

        return { success: true };
      } catch (error) {
        console.error('[notificationsRouter] Error deleting notification:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete notification',
        };
      }
    }),

  /**
   * 앱 소유자에게 알림 발송
   */
  notifyOwnerAnalysisComplete: publicProcedure
    .input(z.object({
      theme: z.string(),
      industry: z.string(),
      keyInsights: z.string(),
      growthProbability: z.number(),
      riskLevel: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const title = `📊 ${input.theme} / ${input.industry} 분석 완료`;
        const content = `
성장 확률: ${input.growthProbability}%
위험도: ${input.riskLevel}

주요 인사이트:
${input.keyInsights}

대시보드에서 상세 분석을 확인하세요.
        `.trim();

        const result = await notifyOwner({ title, content });

        return {
          success: result,
          message: result ? '알림이 발송되었습니다' : '알림 발송 실패',
        };
      } catch (error) {
        console.error('[notificationsRouter] Error notifying owner:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to notify owner',
        };
      }
    }),

  /**
   * 구독 사용자에게 알림 발송 (배치)
   */
  notifySubscribersAnalysisComplete: publicProcedure
    .input(z.object({
      theme: z.string(),
      industry: z.string(),
      keyInsights: z.string(),
      growthProbability: z.number(),
      riskLevel: z.string(),
      notificationType: z.enum(['newData', 'analysisComplete', 'alert']),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, count: 0, error: 'Database unavailable' };
        }

        // 구독 중인 사용자 조회 (subscriptionStatus = 'active'인 사용자)
        const subscribers = await db
          .select({ userId: userSubscriptions.userId })
          .from(userSubscriptions)
          .where(eq(userSubscriptions.subscriptionStatus, 'active'));

        if (subscribers.length === 0) {
          return { success: true, count: 0, message: '구독 사용자 없음' };
        }

        // 각 사용자에게 알림 저장
        const notificationTitle = `📊 ${input.theme} / ${input.industry} 분석 완료`;
        const notificationContent = `
성장 확률: ${input.growthProbability}%
위험도: ${input.riskLevel}

주요 인사이트:
${input.keyInsights}
        `.trim();

        const insertPromises = subscribers.map((sub: any) =>
          db.insert(notificationHistory).values({
            userId: sub.userId,
            trendId: 0, // 임시값 (실제로는 분석된 동향 ID)
            notificationType: input.notificationType === 'newData' ? 'new_data' : 'analysis_complete',
            title: notificationTitle,
            body: notificationContent,
            status: 'sent',
            sentAt: new Date(),
            isRead: false,
            createdAt: new Date(),
          })
        );

        await Promise.all(insertPromises);

        return {
          success: true,
          count: subscribers.length,
          message: `${subscribers.length}명의 사용자에게 알림 발송`,
        };
      } catch (error) {
        console.error('[notificationsRouter] Error notifying subscribers:', error);
        return {
          success: false,
          count: 0,
          error: error instanceof Error ? error.message : 'Failed to notify subscribers',
        };
      }
    }),

  /**
   * 푸시 알림 구독
   */
  subscribe: protectedProcedure
    .input(z.object({
      pushSubscription: z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: 'Database unavailable' };
        }

        await db
          .insert(userSubscriptions)
          .values({
            userId: ctx.user.id,
            pushNotificationEnabled: true,
            pushSubscription: input.pushSubscription,
            subscriptionStatus: 'active',
          })
          .onDuplicateKeyUpdate({
            set: {
              pushSubscription: input.pushSubscription,
              subscriptionStatus: 'active',
              pushNotificationEnabled: true,
            },
          });

        return { success: true };
      } catch (error) {
        console.error('[notificationsRouter] Error in subscribe:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to subscribe',
        };
      }
    }),

  /**
   * 푸시 알림 구독 취소
   */
  unsubscribe: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return { success: false, error: 'Database unavailable' };
        }

        await db
          .update(userSubscriptions)
          .set({
            subscriptionStatus: 'cancelled',
            pushNotificationEnabled: false,
            cancelledAt: new Date(),
          })
          .where(eq(userSubscriptions.userId, ctx.user.id));

        return { success: true };
      } catch (error) {
        console.error('[notificationsRouter] Error in unsubscribe:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to unsubscribe',
        };
      }
    }),
});
