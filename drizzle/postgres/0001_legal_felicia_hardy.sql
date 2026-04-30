CREATE TABLE "recipe_excluded_slots" (
	"recipe_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"meal_type" text NOT NULL,
	CONSTRAINT "recipe_excluded_slots_recipe_id_day_of_week_meal_type_pk" PRIMARY KEY("recipe_id","day_of_week","meal_type")
);
--> statement-breakpoint
ALTER TABLE "recipe_excluded_slots" ADD CONSTRAINT "recipe_excluded_slots_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;