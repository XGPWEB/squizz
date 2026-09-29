ALTER TABLE `answers` ADD `payload` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `answers` ADD `correctness` integer;