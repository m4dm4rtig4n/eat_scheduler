CREATE TABLE `diners` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `key` text NOT NULL,
  `label` text NOT NULL,
  `initials` text NOT NULL,
  `color_key` text DEFAULT 'blue' NOT NULL,
  `coefficient` real DEFAULT 1.0 NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `archived` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `diners_key_unique` ON `diners` (`key`);--> statement-breakpoint
INSERT INTO `diners` (`key`, `label`, `initials`, `color_key`, `coefficient`, `position`, `archived`) VALUES
  ('clement', 'Clément', 'C', 'blue', 1.0, 0, 0),
  ('nath', 'Nath', 'N', 'pink', 1.0, 1, 0),
  ('chloe', 'Chloé', 'Ch', 'rose', 0.5, 2, 0),
  ('simon', 'Simon', 'S', 'emerald', 0.5, 3, 0);
