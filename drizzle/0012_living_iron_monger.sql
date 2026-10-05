CREATE TABLE `response_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`response_id` integer NOT NULL,
	`body` text NOT NULL,
	`revised_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `responses` ADD `name_flag` integer DEFAULT false NOT NULL;