PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`public_slug` text NOT NULL,
	`prompt_id` integer NOT NULL,
	`name` text NOT NULL,
	`venue` text,
	`address` text,
	`zip` text,
	`city` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`narrative` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_events`("id", "slug", "public_slug", "prompt_id", "name", "venue", "address", "zip", "city", "starts_at", "ends_at", "narrative", "status", "created_at") SELECT "id", "slug", "public_slug", "prompt_id", "name", "venue", "address", "zip", "city", "starts_at", "ends_at", "narrative", "status", "created_at" FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_public_slug_unique` ON `events` (`public_slug`);