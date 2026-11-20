CREATE TABLE `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`frequency` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`occurrences` integer DEFAULT 0 NOT NULL,
	`is_paused` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `recurring_user_idx` ON `recurring` (`user_id`);--> statement-breakpoint
ALTER TABLE `transaction` ADD `recurring_id` text REFERENCES recurring(id) ON DELETE set null;--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_recurring_date_uq` ON `transaction` (`recurring_id`,`date`);