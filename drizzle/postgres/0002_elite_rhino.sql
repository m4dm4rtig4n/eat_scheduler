CREATE TABLE "diner_unavailable_slots" (
	"diner_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"meal_type" text NOT NULL,
	CONSTRAINT "diner_unavailable_slots_diner_id_day_of_week_meal_type_pk" PRIMARY KEY("diner_id","day_of_week","meal_type")
);
--> statement-breakpoint
ALTER TABLE "diner_unavailable_slots" ADD CONSTRAINT "diner_unavailable_slots_diner_id_diners_id_fk" FOREIGN KEY ("diner_id") REFERENCES "public"."diners"("id") ON DELETE cascade ON UPDATE no action;