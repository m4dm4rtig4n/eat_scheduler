-- Migration : split du convive "enfant" en "chloe" et "simon"

-- 1. Recipe preferences : dupliquer chaque ligne "enfant" en deux lignes "chloe" et "simon"
INSERT INTO `recipe_preferences` (`recipe_id`, `diner`, `preference`)
SELECT `recipe_id`, 'chloe', `preference` FROM `recipe_preferences` WHERE `diner` = 'enfant';--> statement-breakpoint
INSERT INTO `recipe_preferences` (`recipe_id`, `diner`, `preference`)
SELECT `recipe_id`, 'simon', `preference` FROM `recipe_preferences` WHERE `diner` = 'enfant';--> statement-breakpoint
DELETE FROM `recipe_preferences` WHERE `diner` = 'enfant';--> statement-breakpoint

-- 2. Planned meals : remplacer "enfant" par "chloe","simon" dans le JSON diners
UPDATE `planned_meals`
SET `diners` = REPLACE(`diners`, '"enfant"', '"chloe","simon"');
