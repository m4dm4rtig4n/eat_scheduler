CREATE TABLE `meal_slot_overrides` (
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`diner_key` text NOT NULL,
	`present` integer NOT NULL,
	PRIMARY KEY(`date`, `meal_type`, `diner_key`)
);
