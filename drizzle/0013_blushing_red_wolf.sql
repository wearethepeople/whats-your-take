CREATE TABLE `host_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`volunteer_event_id` integer,
	`volunteer_epoch` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`volunteer_event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "host_settings_singleton" CHECK("host_settings"."id" = 1)
);
