CREATE TABLE `planning_item_dependencies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transcription_id` int NOT NULL,
  `item_id` int NOT NULL,
  `depends_on_item_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `planning_item_dependencies_uniq` (`transcription_id`,`item_id`,`depends_on_item_id`),
  KEY `planning_item_dependencies_transcription_id_idx` (`transcription_id`),
  KEY `planning_item_dependencies_item_id_idx` (`item_id`),
  KEY `planning_item_dependencies_depends_on_item_id_idx` (`depends_on_item_id`),
  CONSTRAINT `planning_item_dependencies_transcription_id_fk`
    FOREIGN KEY (`transcription_id`) REFERENCES `transcriptions` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `planning_item_dependencies_item_id_fk`
    FOREIGN KEY (`item_id`) REFERENCES `planning_items` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `planning_item_dependencies_depends_on_item_id_fk`
    FOREIGN KEY (`depends_on_item_id`) REFERENCES `planning_items` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
);

INSERT INTO `planning_item_dependencies` (`transcription_id`, `item_id`, `depends_on_item_id`)
SELECT `transcription_id`, `id`, `depends_on_item_id`
FROM `planning_items`
WHERE `depends_on_item_id` IS NOT NULL;

