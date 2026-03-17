CREATE TABLE `cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`content` longtext NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `cards_transcription_id_unique` UNIQUE(`transcription_id`),
	CONSTRAINT `card_transcription_id_idx` UNIQUE(`transcription_id`)
);
--> statement-breakpoint
CREATE TABLE `email_verification_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`code` varchar(6) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_verification_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`),
	CONSTRAINT `token_idx` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `shared_transcriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`shared_with_user_id` int NOT NULL,
	`shared_by_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shared_transcriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`content` longtext NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `summaries_transcription_id_unique` UNIQUE(`transcription_id`),
	CONSTRAINT `summary_transcription_id_idx` UNIQUE(`transcription_id`)
);
--> statement-breakpoint
CREATE TABLE `transcriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` longtext NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transcriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`content` longtext NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_stories_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_stories_transcription_id_unique` UNIQUE(`transcription_id`),
	CONSTRAINT `transcription_id_idx` UNIQUE(`transcription_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` text,
	`email_verified` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_signed_in` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `email_idx` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `email_code_idx` ON `email_verification_codes` (`email`,`code`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `transcription_user_idx` ON `shared_transcriptions` (`transcription_id`,`shared_with_user_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `transcriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `transcriptions` (`created_at`);--> statement-breakpoint
ALTER TABLE `cards` ADD CONSTRAINT `cards_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_transcriptions` ADD CONSTRAINT `shared_transcriptions_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_transcriptions` ADD CONSTRAINT `shared_transcriptions_shared_with_user_id_users_id_fk` FOREIGN KEY (`shared_with_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shared_transcriptions` ADD CONSTRAINT `shared_transcriptions_shared_by_user_id_users_id_fk` FOREIGN KEY (`shared_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `summaries` ADD CONSTRAINT `summaries_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transcriptions` ADD CONSTRAINT `transcriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_stories` ADD CONSTRAINT `user_stories_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;