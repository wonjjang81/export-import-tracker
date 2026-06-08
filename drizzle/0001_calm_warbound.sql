CREATE TABLE `crawl_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crawlTime` timestamp NOT NULL,
	`crawlMode` enum('peak','buffer','idle') NOT NULL,
	`foundNewData` boolean NOT NULL DEFAULT false,
	`discoveredYearMonth` varchar(6),
	`publishedAt` timestamp,
	`status` enum('success','failed','timeout') NOT NULL,
	`errorMessage` text,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crawl_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `export_import_trends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`yearMonth` varchar(6) NOT NULL,
	`totalExport` decimal(12,2),
	`totalImport` decimal(12,2),
	`tradingBalance` decimal(12,2),
	`exportYoYGrowth` decimal(5,2),
	`importYoYGrowth` decimal(5,2),
	`exportByProduct` json,
	`importByProduct` json,
	`exportByRegion` json,
	`importByRegion` json,
	`aiAnalysisSummary` text,
	`keyInsights` json,
	`sourceUrl` varchar(500),
	`pdfStorageKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `export_import_trends_id` PRIMARY KEY(`id`),
	CONSTRAINT `export_import_trends_yearMonth_unique` UNIQUE(`yearMonth`)
);
--> statement-breakpoint
CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trendId` int NOT NULL,
	`notificationType` enum('new_data','analysis_complete') NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publishing_patterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`month` int NOT NULL,
	`avgPublishHour` decimal(4,2),
	`avgPublishMinute` decimal(4,2),
	`stdDeviation` decimal(4,2),
	`publishProbability` decimal(5,2),
	`observationCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publishing_patterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduler_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`currentMode` enum('peak','buffer','idle') NOT NULL DEFAULT 'idle',
	`nextCrawlTime` timestamp NOT NULL,
	`lastCrawlTime` timestamp,
	`lastFoundYearMonth` varchar(6),
	`lastPublishedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduler_state_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pushNotificationEnabled` boolean NOT NULL DEFAULT true,
	`emailNotificationEnabled` boolean NOT NULL DEFAULT false,
	`subscriptionStatus` enum('active','paused','cancelled') NOT NULL DEFAULT 'active',
	`pushSubscription` json,
	`subscribedAt` timestamp NOT NULL DEFAULT (now()),
	`cancelledAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`)
);
