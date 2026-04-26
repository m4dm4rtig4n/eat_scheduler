CREATE TABLE `recipe_preferences` (
	`recipe_id` integer NOT NULL,
	`diner` text NOT NULL,
	`preference` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `diner`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `planned_meals` ADD `diners` text DEFAULT '["clement","nath","enfant"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `recipes` ADD `weight` integer DEFAULT 3 NOT NULL;