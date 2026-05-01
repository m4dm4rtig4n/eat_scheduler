CREATE TABLE `diner_unavailable_slots` (
	`diner_id` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`meal_type` text NOT NULL,
	PRIMARY KEY(`diner_id`, `day_of_week`, `meal_type`),
	FOREIGN KEY (`diner_id`) REFERENCES `diners`(`id`) ON UPDATE no action ON DELETE cascade
);
