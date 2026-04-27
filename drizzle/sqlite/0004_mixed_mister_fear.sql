CREATE TABLE `recipe_allowed_slots` (
	`recipe_id` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`meal_type` text NOT NULL,
	PRIMARY KEY(`recipe_id`, `day_of_week`, `meal_type`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
