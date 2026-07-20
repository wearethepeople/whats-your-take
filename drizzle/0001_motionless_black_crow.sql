CREATE TABLE `presence_windows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`window_start` integer NOT NULL,
	`window_end` integer NOT NULL,
	`submission_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `presence_windows_event_window` ON `presence_windows` (`event_id`,`window_start`);--> statement-breakpoint
CREATE TABLE `staged_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`body` text,
	`code` text NOT NULL,
	`expires_at` integer NOT NULL,
	`promoted_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staged_drafts_code_unique` ON `staged_drafts` (`code`);