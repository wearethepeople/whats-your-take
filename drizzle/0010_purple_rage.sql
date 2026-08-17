CREATE TABLE `event_photo_galleries` (
	`event_id` integer PRIMARY KEY NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `event_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`storage_key` text NOT NULL,
	`thumbnail_key` text NOT NULL,
	`content_type` text NOT NULL,
	`caption` text,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_photos_event_idx` ON `event_photos` (`event_id`);