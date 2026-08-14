CREATE TABLE `table_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area` text NOT NULL,
	`note` text,
	`resolved_city` text,
	`resolved_state` text,
	`resolved_county` text,
	`resolved_source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
