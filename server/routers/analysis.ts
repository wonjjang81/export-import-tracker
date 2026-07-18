import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { notificationHistory, userSubscriptions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { sendPushNotificationToSubscribers, initializeWebPush } from "../webpush";

export const analysisRouter = router({
  // 분석 완료 후 알림 발송
  notifyAnalysisComplete: protectedProcedure
    .input(z.object({
      trendId: z.number(),
      title: z.string(),
      summary: z.string(),
      insights: z.array(z.string()).optional(),
      exportValue: z.number().optional(),
      importValue: z.number().optional(),
      tradeBalance: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // 1. 앱 소유자에게 알림 발송
        const ownerNotificationSent = await notifyOwner({
          title: `분석 완료: ${input.title}`,
          content: `새로운 분석이 완료되었습니다.\n\n${input.summary}\n\n주요 인사이트:\n${input.insights?.join('\n') || '분석 중'}`,
        });

        // 2. 구독 사용자들에게 알림 발송
        const subscribers = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.subscriptionStatus, 'active'));

        const notificationPromises = subscribers.map(async (subscriber) => {
          try {
            await db.insert(notificationHistory).values({
              userId: subscriber.userId,
              trendId: input.trendId,
              title: input.title,
              body: input.summary,
              notificationType: 'analysis_complete',
              status: 'sent',
              sentAt: new Date(),
            });
          } catch (error) {
            console.error(`[analysisRouter] Error notifying subscriber ${subscriber.userId}:`, error);
          }
        });

        await Promise.all(notificationPromises);

        // 3. Web Push 알림 발송 (실시간 푸시)
        initializeWebPush();
        const pushResult = await sendPushNotificationToSubscribers(
          input.title,
          {
            body: input.summary,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `analysis-${input.trendId}`,
            data: {
              trendId: input.trendId,
              url: '/dashboard',
            },
          }
        );

        console.log(`[analysisRouter] Push notifications: ${pushResult.sent} sent, ${pushResult.failed} failed`);

        return {
          success: true,
          ownerNotified: ownerNotificationSent,
          subscribersNotified: subscribers.length,
          pushNotificationsSent: pushResult.sent,
          pushNotificationsFailed: pushResult.failed,
        };
      } catch (error) {
        console.error('[analysisRouter] Error in notifyAnalysisComplete:', error);
        throw error;
      }
    }),

  // 구독 사용자 목록 조회 (관리자용)
  getSubscribers: protectedProcedure
    .input(z.object({
      subscriptionStatus: z.enum(['active', 'paused', 'cancelled']).optional().default('active'),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        const subscribers = await db
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.subscriptionStatus, input.subscriptionStatus))
          .limit(input.limit)
          .offset(input.offset);

        return {
          subscribers,
          total: subscribers.length,
        };
      } catch (error) {
        console.error('[analysisRouter] Error in getSubscribers:', error);
        throw error;
      }
    }),

  // 알림 이력 조회
  getNotificationHistory: protectedProcedure
    .input(z.object({
      userId: z.number().optional(),
      notificationType: z.enum(['new_data', 'analysis_complete']).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        const whereConditions: any[] = [];
        
        if (input.userId) {
          whereConditions.push(eq(notificationHistory.userId, input.userId));
        }

        if (input.notificationType) {
          whereConditions.push(eq(notificationHistory.notificationType, input.notificationType));
        }

        const history = await db
          .select()
          .from(notificationHistory)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .limit(input.limit)
          .offset(input.offset);

        return {
          history,
          total: history.length,
        };
      } catch (error) {
        console.error('[analysisRouter] Error in getNotificationHistory:', error);
        throw error;
      }
    }),
});
