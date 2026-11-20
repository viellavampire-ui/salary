CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`category_id` text NOT NULL,
	`month` text NOT NULL,
	`spent` integer NOT NULL,
	`limit_amount` integer NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_once_uq` ON `notification` (`user_id`,`category_id`,`month`,`kind`);--> statement-breakpoint
CREATE INDEX `notification_user_created_idx` ON `notification` (`user_id`,`created_at`);