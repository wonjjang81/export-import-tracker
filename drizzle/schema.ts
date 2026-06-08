import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 수출입 동향 데이터 테이블
 * 월별 수출입 통계 및 분석 결과 저장
 */
export const exportImportTrends = mysqlTable("export_import_trends", {
  id: int("id").autoincrement().primaryKey(),
  /** 통계 연월 (예: 202605 = 2026년 5월) */
  yearMonth: varchar("yearMonth", { length: 6 }).notNull().unique(),
  /** 총 수출액 (단위: 억 달러) */
  totalExport: decimal("totalExport", { precision: 12, scale: 2 }),
  /** 총 수입액 (단위: 억 달러) */
  totalImport: decimal("totalImport", { precision: 12, scale: 2 }),
  /** 무역수지 (단위: 억 달러) */
  tradingBalance: decimal("tradingBalance", { precision: 12, scale: 2 }),
  /** 전년 동월 대비 수출 증감률 (%) */
  exportYoYGrowth: decimal("exportYoYGrowth", { precision: 5, scale: 2 }),
  /** 전년 동월 대비 수입 증감률 (%) */
  importYoYGrowth: decimal("importYoYGrowth", { precision: 5, scale: 2 }),
  /** 품목별 수출 데이터 (JSON: { "반도체": 15.2, "석유화학": 8.5, ... }) */
  exportByProduct: json("exportByProduct"),
  /** 품목별 수입 데이터 (JSON: { "원유": 12.3, "철광석": 5.1, ... }) */
  importByProduct: json("importByProduct"),
  /** 지역별 수출 데이터 (JSON: { "미국": 18.5, "중국": 22.3, ... }) */
  exportByRegion: json("exportByRegion"),
  /** 지역별 수입 데이터 (JSON: { "중국": 25.1, "일본": 8.2, ... }) */
  importByRegion: json("importByRegion"),
  /** LLM 기반 분석 요약 */
  aiAnalysisSummary: text("aiAnalysisSummary"),
  /** 핵심 인사이트 (JSON: { "주요변화": "...", "향후전망": "..." }) */
  keyInsights: json("keyInsights"),
  /** 원본 보도자료 URL */
  sourceUrl: varchar("sourceUrl", { length: 500 }),
  /** 원본 PDF 파일 저장 경로 */
  pdfStorageKey: varchar("pdfStorageKey", { length: 255 }),
  /** 데이터 생성 일시 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** 데이터 업데이트 일시 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExportImportTrend = typeof exportImportTrends.$inferSelect;
export type InsertExportImportTrend = typeof exportImportTrends.$inferInsert;

/**
 * 크롤링 이력 테이블
 * 게시 패턴 학습 및 스케줄 최적화를 위한 데이터 저장
 */
export const crawlHistory = mysqlTable("crawl_history", {
  id: int("id").autoincrement().primaryKey(),
  /** 크롤링 실행 일시 */
  crawlTime: timestamp("crawlTime").notNull(),
  /** 크롤링 모드: 'peak' | 'buffer' | 'idle' */
  crawlMode: mysqlEnum("crawlMode", ["peak", "buffer", "idle"]).notNull(),
  /** 새로운 자료 발견 여부 */
  foundNewData: boolean("foundNewData").default(false).notNull(),
  /** 발견된 자료의 연월 (예: 202605) */
  discoveredYearMonth: varchar("discoveredYearMonth", { length: 6 }),
  /** 발견된 자료의 게시 일시 */
  publishedAt: timestamp("publishedAt"),
  /** 크롤링 상태: 'success' | 'failed' | 'timeout' */
  status: mysqlEnum("status", ["success", "failed", "timeout"]).notNull(),
  /** 에러 메시지 (실패 시) */
  errorMessage: text("errorMessage"),
  /** 크롤링 소요 시간 (밀리초) */
  duration: int("duration"),
  /** 기록 생성 일시 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CrawlHistory = typeof crawlHistory.$inferSelect;
export type InsertCrawlHistory = typeof crawlHistory.$inferInsert;

/**
 * 게시 패턴 학습 데이터 테이블
 * 월별 게시 시간 통계를 저장하여 스케줄 최적화에 활용
 */
export const publishingPatterns = mysqlTable("publishing_patterns", {
  id: int("id").autoincrement().primaryKey(),
  /** 월 (1~12) */
  month: int("month").notNull(),
  /** 평균 게시 시간 (시간 단위, 0~23) */
  avgPublishHour: decimal("avgPublishHour", { precision: 4, scale: 2 }),
  /** 평균 게시 분 (분 단위, 0~59) */
  avgPublishMinute: decimal("avgPublishMinute", { precision: 4, scale: 2 }),
  /** 표준편차 (시간 단위) */
  stdDeviation: decimal("stdDeviation", { precision: 4, scale: 2 }),
  /** 게시 확률 (%) */
  publishProbability: decimal("publishProbability", { precision: 5, scale: 2 }),
  /** 과거 관측 횟수 */
  observationCount: int("observationCount").default(0).notNull(),
  /** 마지막 업데이트 일시 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublishingPattern = typeof publishingPatterns.$inferSelect;
export type InsertPublishingPattern = typeof publishingPatterns.$inferInsert;

/**
 * 사용자 구독 설정 테이블
 * 알림 수신 여부 및 구독 상태 관리
 */
export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  /** 사용자 ID */
  userId: int("userId").notNull(),
  /** 푸시 알림 수신 여부 */
  pushNotificationEnabled: boolean("pushNotificationEnabled").default(true).notNull(),
  /** 이메일 알림 수신 여부 */
  emailNotificationEnabled: boolean("emailNotificationEnabled").default(false).notNull(),
  /** 구독 상태: 'active' | 'paused' | 'cancelled' */
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "paused", "cancelled"]).default("active").notNull(),
  /** 웹 푸시 구독 정보 (JSON) */
  pushSubscription: json("pushSubscription"),
  /** 구독 시작 일시 */
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  /** 구독 취소 일시 */
  cancelledAt: timestamp("cancelledAt"),
  /** 마지막 업데이트 일시 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * 알림 발송 이력 테이블
 * 발송된 알림 기록 및 사용자 반응 추적
 */
export const notificationHistory = mysqlTable("notification_history", {
  id: int("id").autoincrement().primaryKey(),
  /** 사용자 ID */
  userId: int("userId").notNull(),
  /** 관련 수출입 동향 ID */
  trendId: int("trendId").notNull(),
  /** 알림 유형: 'new_data' | 'analysis_complete' */
  notificationType: mysqlEnum("notificationType", ["new_data", "analysis_complete"]).notNull(),
  /** 알림 제목 */
  title: varchar("title", { length: 255 }).notNull(),
  /** 알림 본문 */
  body: text("body").notNull(),
  /** 발송 상태: 'sent' | 'failed' | 'pending' */
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending").notNull(),
  /** 발송 일시 */
  sentAt: timestamp("sentAt"),
  /** 사용자 확인 여부 */
  isRead: boolean("isRead").default(false).notNull(),
  /** 확인 일시 */
  readAt: timestamp("readAt"),
  /** 기록 생성 일시 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;

/**
 * 스케줄러 상태 테이블
 * 다음 크롤링 예정 시간 및 현재 모드 저장
 */
export const schedulerState = mysqlTable("scheduler_state", {
  id: int("id").autoincrement().primaryKey(),
  /** 현재 스케줄 모드: 'peak' | 'buffer' | 'idle' */
  currentMode: mysqlEnum("currentMode", ["peak", "buffer", "idle"]).default("idle").notNull(),
  /** 다음 크롤링 예정 일시 */
  nextCrawlTime: timestamp("nextCrawlTime").notNull(),
  /** 마지막 크롤링 일시 */
  lastCrawlTime: timestamp("lastCrawlTime"),
  /** 마지막 발견된 자료의 연월 */
  lastFoundYearMonth: varchar("lastFoundYearMonth", { length: 6 }),
  /** 마지막 발견된 자료의 게시 일시 */
  lastPublishedAt: timestamp("lastPublishedAt"),
  /** 상태 업데이트 일시 */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SchedulerState = typeof schedulerState.$inferSelect;
export type InsertSchedulerState = typeof schedulerState.$inferInsert;
