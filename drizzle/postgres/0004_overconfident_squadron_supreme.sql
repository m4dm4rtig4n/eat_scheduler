CREATE TABLE "meal_slot_overrides" (
	"date" date NOT NULL,
	"meal_type" text NOT NULL,
	"diner_key" text NOT NULL,
	"present" boolean NOT NULL,
	CONSTRAINT "meal_slot_overrides_date_meal_type_diner_key_pk" PRIMARY KEY("date","meal_type","diner_key")
);
