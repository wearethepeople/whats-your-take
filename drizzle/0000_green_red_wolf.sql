CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`prompt_id` integer NOT NULL,
	`name` text NOT NULL,
	`venue` text NOT NULL,
	`address` text,
	`zip` text NOT NULL,
	`city` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`retired_at` integer
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prompt_id` integer NOT NULL,
	`event_id` integer NOT NULL,
	`body` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`showcase` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`created_bucket` text NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
