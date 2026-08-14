ALTER TABLE `events` ADD `public_slug` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `events_public_slug_unique` ON `events` (`public_slug`);