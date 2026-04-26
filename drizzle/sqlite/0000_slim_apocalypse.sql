CREATE TABLE `planned_meals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`recipe_id` integer NOT NULL,
	`servings_multiplier` real DEFAULT 1 NOT NULL,
	`notes` text,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`servings` integer DEFAULT 2 NOT NULL,
	`prep_time` integer,
	`cook_time` integer,
	`instructions` text,
	`source_url` text,
	`image_url` text,
	`created_at` integer NOT NULL
);
