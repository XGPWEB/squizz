CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`size` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_media_owner_created` ON `media` (`owner`,`created`);