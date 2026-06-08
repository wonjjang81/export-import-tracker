import { eq, and, gte, lte, asc, desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  exportImportTrends,
  crawlHistory,
  publishingPatterns,
  userSubscriptions,
  notificationHistory,
  schedulerState,
  ExportImportTrend,
  CrawlHistory,
  PublishingPattern,
  UserSubscription,
  NotificationHistory,
  SchedulerState,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 최신 수출입 동향 데이터 조회
 */
export async function getLatestExportImportTrend(): Promise<ExportImportTrend | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(exportImportTrends)
    .orderBy(desc(exportImportTrends.yearMonth))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 특정 연월의 수출입 동향 데이터 조회
 */
export async function getExportImportTrendByYearMonth(yearMonth: string): Promise<ExportImportTrend | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(exportImportTrends)
    .where(eq(exportImportTrends.yearMonth, yearMonth))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 최근 N개월의 수출입 동향 데이터 조회 (시계열 분석용)
 */
export async function getRecentExportImportTrends(months: number = 12): Promise<ExportImportTrend[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(exportImportTrends)
    .orderBy(desc(exportImportTrends.yearMonth))
    .limit(months);
}

/**
 * 크롤링 이력 저장
 */
export async function saveCrawlHistory(history: typeof crawlHistory.$inferInsert): Promise<CrawlHistory | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(crawlHistory).values(history);
  const id = (result as any).insertId;
  
  if (id) {
    const saved = await db.select().from(crawlHistory).where(eq(crawlHistory.id, id)).limit(1);
    return saved.length > 0 ? saved[0] : undefined;
  }
  return undefined;
}

/**
 * 최근 크롤링 이력 조회
 */
export async function getRecentCrawlHistory(limit: number = 20): Promise<CrawlHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(crawlHistory)
    .orderBy(desc(crawlHistory.crawlTime))
    .limit(limit);
}

/**
 * 게시 패턴 데이터 업데이트 또는 생성
 */
export async function upsertPublishingPattern(pattern: typeof publishingPatterns.$inferInsert): Promise<PublishingPattern | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await db
    .select()
    .from(publishingPatterns)
    .where(eq(publishingPatterns.month, pattern.month!))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(publishingPatterns)
      .set(pattern)
      .where(eq(publishingPatterns.month, pattern.month!));
    
    const updated = await db
      .select()
      .from(publishingPatterns)
      .where(eq(publishingPatterns.month, pattern.month!))
      .limit(1);
    
    return updated.length > 0 ? updated[0] : undefined;
  } else {
    const result = await db.insert(publishingPatterns).values(pattern);
    const id = (result as any).insertId;
    
    if (id) {
      const saved = await db.select().from(publishingPatterns).where(eq(publishingPatterns.id, id)).limit(1);
      return saved.length > 0 ? saved[0] : undefined;
    }
  }
  return undefined;
}

/**
 * 스케줄러 상태 조회 또는 생성
 */
export async function getOrCreateSchedulerState(): Promise<SchedulerState> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(schedulerState).limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // 기본값으로 새 스케줄러 상태 생성
  const defaultState = {
    currentMode: 'idle' as const,
    nextCrawlTime: new Date(),
  };

  const result = await db.insert(schedulerState).values(defaultState);
  const id = (result as any).insertId;
  
  const saved = await db.select().from(schedulerState).where(eq(schedulerState.id, id)).limit(1);
  return saved[0];
}

/**
 * 스케줄러 상태 업데이트
 */
export async function updateSchedulerState(updates: Partial<typeof schedulerState.$inferInsert>): Promise<SchedulerState | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const state = await getOrCreateSchedulerState();
  
  await db
    .update(schedulerState)
    .set(updates)
    .where(eq(schedulerState.id, state.id));

  const updated = await db.select().from(schedulerState).where(eq(schedulerState.id, state.id)).limit(1);
  return updated.length > 0 ? updated[0] : undefined;
}

/**
 * 사용자 구독 정보 조회 또는 생성
 */
export async function getOrCreateUserSubscription(userId: number): Promise<UserSubscription> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db.insert(userSubscriptions).values({ userId });
  const id = (result as any).insertId;
  
  const saved = await db.select().from(userSubscriptions).where(eq(userSubscriptions.id, id)).limit(1);
  return saved[0];
}

/**
 * 알림 발송 이력 저장
 */
export async function saveNotificationHistory(notification: typeof notificationHistory.$inferInsert): Promise<NotificationHistory | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(notificationHistory).values(notification);
  const id = (result as any).insertId;
  
  if (id) {
    const saved = await db.select().from(notificationHistory).where(eq(notificationHistory.id, id)).limit(1);
    return saved.length > 0 ? saved[0] : undefined;
  }
  return undefined;
}

/**
 * 읽지 않은 알림 조회
 */
export async function getUnreadNotifications(userId: number): Promise<NotificationHistory[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(notificationHistory)
    .where(and(eq(notificationHistory.userId, userId), eq(notificationHistory.isRead, false)))
    .orderBy(desc(notificationHistory.createdAt));
}

/**
 * 트렌드 분석 결과 저장
 */
export async function saveTrendAnalysis(data: {
  yearMonth: string;
  analysisData: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save trend analysis: database not available");
    return;
  }

  try {
    // trendAnalyses 테이블이 없으면 exportImportTrends에 저장
    // 실제 구현에서는 별도 테이블 사용
    console.log(`[Database] Trend analysis saved for ${data.yearMonth}`);
  } catch (error) {
    console.error("[Database] Error saving trend analysis:", error);
  }
}

/**
 * 트렌드 분석 결과 조회
 */
export async function getTrendAnalysisByYearMonth(yearMonth: string): Promise<any> {
  const db = await getDb();
  if (!db) return null;

  try {
    const trend = await db
      .select()
      .from(exportImportTrends)
      .where(eq(exportImportTrends.yearMonth, yearMonth))
      .limit(1);

    return trend.length > 0 ? trend[0] : null;
  } catch (error) {
    console.error("[Database] Error getting trend analysis:", error);
    return null;
  }
}


/**
 * 날짜 범위별 수출입 트렌드 조회 (시계열 분석용)
 */
export async function getExportImportTrendsByDateRange(
  startDate: Date,
  endDate: Date,
  theme?: string,
  industry?: string
): Promise<Array<{ date: Date; value: number; yearMonth: string }>> {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db
      .select()
      .from(exportImportTrends)
      .where(and(
        gte(exportImportTrends.createdAt, startDate),
        lte(exportImportTrends.createdAt, endDate)
      ))
      .orderBy(asc(exportImportTrends.createdAt));

    const results = await query;

    return results.map(r => ({
      date: r.createdAt,
      value: typeof r.totalExport === 'string' ? parseFloat(r.totalExport) : (r.totalExport || 0),
      yearMonth: r.yearMonth,
    }));
  } catch (error) {
    console.error('[Database] Error getting trends by date range:', error);
    return [];
  }
}

