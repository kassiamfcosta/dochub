CREATE TABLE `card_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`content` longtext NOT NULL,
	`generation_mode` enum('pipeline','model','gemini') NOT NULL DEFAULT 'pipeline',
	`author_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `card_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `summary_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`content` longtext NOT NULL,
	`generation_mode` enum('pipeline','model','gemini') NOT NULL DEFAULT 'pipeline',
	`author_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `summary_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transcription_note_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`note_id` int NOT NULL,
	`content` longtext NOT NULL,
	`format` enum('markdown','plaintext') NOT NULL DEFAULT 'markdown',
	`author_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transcription_note_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transcription_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`author_user_id` int NOT NULL,
	`title` varchar(255),
	`content` longtext NOT NULL,
	`format` enum('markdown','plaintext') NOT NULL DEFAULT 'markdown',
	`context_type` enum('transcription','userStory','summary','card') NOT NULL DEFAULT 'transcription',
	`is_archived` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transcription_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_story_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`content` longtext NOT NULL,
	`generation_mode` enum('pipeline','model','gemini') NOT NULL DEFAULT 'pipeline',
	`author_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_story_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cards` ADD `generation_mode` enum('pipeline','model','gemini') DEFAULT 'pipeline' NOT NULL;--> statement-breakpoint
ALTER TABLE `summaries` ADD `generation_mode` enum('pipeline','model','gemini') DEFAULT 'pipeline' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_stories` ADD `generation_mode` enum('pipeline','model','gemini') DEFAULT 'pipeline' NOT NULL;--> statement-breakpoint
CREATE INDEX `card_history_transcription_id_idx` ON `card_history` (`transcription_id`);--> statement-breakpoint
CREATE INDEX `card_history_created_at_idx` ON `card_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `summary_history_transcription_id_idx` ON `summary_history` (`transcription_id`);--> statement-breakpoint
CREATE INDEX `summary_history_created_at_idx` ON `summary_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `transcription_note_history_note_id_idx` ON `transcription_note_history` (`note_id`);--> statement-breakpoint
CREATE INDEX `transcription_note_history_created_at_idx` ON `transcription_note_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `transcription_notes_transcription_id_idx` ON `transcription_notes` (`transcription_id`);--> statement-breakpoint
CREATE INDEX `transcription_notes_author_user_id_idx` ON `transcription_notes` (`author_user_id`);--> statement-breakpoint
CREATE INDEX `transcription_notes_context_type_idx` ON `transcription_notes` (`context_type`);--> statement-breakpoint
CREATE INDEX `transcription_notes_created_at_idx` ON `transcription_notes` (`created_at`);--> statement-breakpoint
CREATE INDEX `user_story_history_transcription_id_idx` ON `user_story_history` (`transcription_id`);--> statement-breakpoint
CREATE INDEX `user_story_history_created_at_idx` ON `user_story_history` (`created_at`);--> statement-breakpoint
ALTER TABLE `card_history` ADD CONSTRAINT `card_history_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `card_history` ADD CONSTRAINT `card_history_author_user_id_users_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `summary_history` ADD CONSTRAINT `summary_history_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `summary_history` ADD CONSTRAINT `summary_history_author_user_id_users_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transcription_note_history` ADD CONSTRAINT `transcription_note_history_note_id_transcription_notes_id_fk` FOREIGN KEY (`note_id`) REFERENCES `transcription_notes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transcription_note_history` ADD CONSTRAINT `transcription_note_history_author_user_id_users_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transcription_notes` ADD CONSTRAINT `transcription_notes_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transcription_notes` ADD CONSTRAINT `transcription_notes_author_user_id_users_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_story_history` ADD CONSTRAINT `user_story_history_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_story_history` ADD CONSTRAINT `user_story_history_author_user_id_users_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;