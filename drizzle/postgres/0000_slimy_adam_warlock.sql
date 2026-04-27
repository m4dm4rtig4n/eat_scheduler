CREATE TABLE "diners" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"initials" text NOT NULL,
	"color_key" text DEFAULT 'blue' NOT NULL,
	"coefficient" real DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	CONSTRAINT "diners_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "planned_meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"meal_type" text NOT NULL,
	"recipe_id" integer NOT NULL,
	"servings_multiplier" real DEFAULT 1 NOT NULL,
	"diners" text DEFAULT '["clement","nath","chloe","simon"]' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "recipe_allowed_slots" (
	"recipe_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"meal_type" text NOT NULL,
	CONSTRAINT "recipe_allowed_slots_recipe_id_day_of_week_meal_type_pk" PRIMARY KEY("recipe_id","day_of_week","meal_type")
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_preferences" (
	"recipe_id" integer NOT NULL,
	"diner" text NOT NULL,
	"preference" text NOT NULL,
	CONSTRAINT "recipe_preferences_recipe_id_diner_pk" PRIMARY KEY("recipe_id","diner")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"servings" integer DEFAULT 2 NOT NULL,
	"prep_time" integer,
	"cook_time" integer,
	"instructions" text,
	"source_url" text,
	"image_url" text,
	"weight" integer DEFAULT 3 NOT NULL,
	"season" text DEFAULT 'all' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slot_favorites" (
	"day_of_week" integer NOT NULL,
	"meal_type" text NOT NULL,
	"recipe_id" integer NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	CONSTRAINT "slot_favorites_day_of_week_meal_type_recipe_id_pk" PRIMARY KEY("day_of_week","meal_type","recipe_id")
);
--> statement-breakpoint
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_allowed_slots" ADD CONSTRAINT "recipe_allowed_slots_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_preferences" ADD CONSTRAINT "recipe_preferences_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_favorites" ADD CONSTRAINT "slot_favorites_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;