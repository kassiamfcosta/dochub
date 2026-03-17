CREATE TABLE `transcription_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transcription_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`size` int NOT NULL,
	`mime_type` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transcription_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `transcriptions` ADD `is_archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `transcription_files_transcription_id_idx` ON `transcription_files` (`transcription_id`);--> statement-breakpoint
ALTER TABLE `transcription_files` ADD CONSTRAINT `transcription_files_transcription_id_transcriptions_id_fk` FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions`(`id`) ON DELETE cascade ON UPDATE no action;