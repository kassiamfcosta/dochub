ALTER TABLE `planning_items` ADD COLUMN `depends_on_item_id` int;--> statement-breakpoint
ALTER TABLE `planning_items` ADD CONSTRAINT `planning_items_depends_on_item_id_planning_items_id_fk` FOREIGN KEY (`depends_on_item_id`) REFERENCES `planning_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planning_point_config` ADD COLUMN `developer_count` int NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `planning_point_config` ADD COLUMN `hours_per_dev_per_day` decimal(5,2) NOT NULL DEFAULT 8.00;--> statement-breakpoint
ALTER TABLE `planning_point_config` ADD COLUMN `margin_percent` decimal(5,2) NOT NULL DEFAULT 15.00;--> statement-breakpoint
ALTER TABLE `planning_point_config` ADD COLUMN `margin_points_threshold` decimal(10,2) NOT NULL DEFAULT 8.00;--> statement-breakpoint
UPDATE `planning_point_config` SET `hours_per_dev_per_day` = `hours_per_day` WHERE `hours_per_dev_per_day` = 8.00;
