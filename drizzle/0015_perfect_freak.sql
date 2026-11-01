PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_response_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`response_id` integer NOT NULL,
	`body` text,
	`revised_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`response_id`) REFERENCES `responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_response_revisions`("id", "response_id", "body", "revised_at") SELECT "id", "response_id", "body", "revised_at" FROM `response_revisions`;--> statement-breakpoint
DROP TABLE `response_revisions`;--> statement-breakpoint
ALTER TABLE `__new_response_revisions` RENAME TO `response_revisions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;