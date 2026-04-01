ALTER TABLE `planning_items` ADD COLUMN `poker_special` varchar(20);--> statement-breakpoint
ALTER TABLE `planning_items` ADD COLUMN `estimated_hours` decimal(10,2);--> statement-breakpoint
ALTER TABLE `planning_items` MODIFY COLUMN `story_points` decimal(10,2) NOT NULL DEFAULT 1.00;--> statement-breakpoint
ALTER TABLE `planning_point_config` MODIFY COLUMN `hours_per_day` decimal(5,2) NOT NULL DEFAULT 8.00;
