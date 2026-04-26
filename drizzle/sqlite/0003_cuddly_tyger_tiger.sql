CREATE TABLE `slot_favorites` (
	`day_of_week` integer NOT NULL,
	`meal_type` text NOT NULL,
	`recipe_id` integer NOT NULL,
	PRIMARY KEY(`day_of_week`, `meal_type`, `recipe_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
