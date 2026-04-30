CREATE TABLE `diners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`initials` text NOT NULL,
	`color_key` text DEFAULT 'blue' NOT NULL,
	`coefficient` real DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diners_key_unique` ON `diners` (`key`);--> statement-breakpoint
CREATE TABLE `recipe_excluded_slots` (
	`recipe_id` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`meal_type` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `day_of_week`, `meal_type`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
