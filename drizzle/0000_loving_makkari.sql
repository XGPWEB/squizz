CREATE TABLE `answers` (
	`code` text NOT NULL,
	`player` text NOT NULL,
	`question` integer NOT NULL,
	`choice` integer NOT NULL,
	`points` integer NOT NULL,
	PRIMARY KEY(`code`, `player`, `question`)
);
--> statement-breakpoint
CREATE TABLE `players` (
	`code` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`code`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_players_code_name` ON `players` (`code`,`name`);--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quizzes_owner_id` ON `quizzes` (`owner`,`id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`quiz` text NOT NULL,
	`phase` text NOT NULL,
	`question` integer NOT NULL,
	`started` integer NOT NULL,
	`created` integer NOT NULL
);
