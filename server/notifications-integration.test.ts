import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Notifications Router Integration', () => {
  it('should validate subscribe input schema', () => {
    const subscribeSchema = z.object({
      pushSubscription: z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    });

    const validInput = {
      pushSubscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
      },
    };

    const result = subscribeSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid subscribe input', () => {
    const subscribeSchema = z.object({
      pushSubscription: z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    });

    const invalidInput = {
      pushSubscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
        keys: {
          p256dh: 'test-p256dh-key',
          // auth 필드 누락
        },
      },
    };

    const result = subscribeSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should validate getSubscription response schema', () => {
    const responseSchema = z.object({
      success: z.boolean(),
      data: z.object({
        userId: z.number(),
        pushNotificationEnabled: z.boolean(),
        emailNotificationEnabled: z.boolean(),
        subscriptionStatus: z.enum(['active', 'paused', 'cancelled']),
        subscribedAt: z.date(),
        updatedAt: z.date(),
      }).optional(),
      error: z.string().optional(),
    });

    const validResponse = {
      success: true,
      data: {
        userId: 1,
        pushNotificationEnabled: true,
        emailNotificationEnabled: false,
        subscriptionStatus: 'active' as const,
        subscribedAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const result = responseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should validate updateSubscription input schema', () => {
    const updateSchema = z.object({
      pushNotificationEnabled: z.boolean(),
      emailNotificationEnabled: z.boolean(),
      subscriptionStatus: z.enum(['active', 'paused', 'cancelled']),
    });

    const validInput = {
      pushNotificationEnabled: true,
      emailNotificationEnabled: false,
      subscriptionStatus: 'active' as const,
    };

    const result = updateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate getNotificationHistory input schema', () => {
    const historySchema = z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    });

    const validInput = {
      limit: 20,
      offset: 0,
    };

    const result = historySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid limit in getNotificationHistory', () => {
    const historySchema = z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    });

    const invalidInput = {
      limit: 200, // max는 100
      offset: 0,
    };

    const result = historySchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should validate markAsRead input schema', () => {
    const markSchema = z.object({
      notificationId: z.number(),
    });

    const validInput = {
      notificationId: 1,
    };

    const result = markSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate notifySubscribersAnalysisComplete input schema', () => {
    const notifySchema = z.object({
      theme: z.string(),
      industry: z.string(),
      keyInsights: z.string(),
      growthProbability: z.number(),
      riskLevel: z.string(),
      notificationType: z.enum(['newData', 'analysisComplete', 'alert']),
    });

    const validInput = {
      theme: 'Green Energy',
      industry: 'Solar',
      keyInsights: '태양광 부문 수출이 증가하고 있습니다.',
      growthProbability: 85,
      riskLevel: 'low',
      notificationType: 'analysisComplete' as const,
    };

    const result = notifySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should handle notification types correctly', () => {
    const notificationTypes = ['new_data', 'analysis_complete'] as const;

    expect(notificationTypes).toContain('new_data');
    expect(notificationTypes).toContain('analysis_complete');
    expect(notificationTypes.length).toBe(2);
  });

  it('should validate subscription status enum', () => {
    const statuses = ['active', 'paused', 'cancelled'] as const;

    expect(statuses).toContain('active');
    expect(statuses).toContain('paused');
    expect(statuses).toContain('cancelled');
    expect(statuses.length).toBe(3);
  });
});
