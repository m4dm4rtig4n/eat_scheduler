import {
  pgTable,
  serial,
  integer,
  text,
  real,
  timestamp,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  servings: integer("servings").notNull().default(2),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  instructions: text("instructions"),
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  weight: integer("weight").notNull().default(3),
  season: text("season").notNull().default("all"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  position: integer("position").notNull().default(0),
});

export const recipePreferences = pgTable(
  "recipe_preferences",
  {
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    diner: text("diner").notNull(),
    preference: text("preference").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.recipeId, table.diner] }),
  })
);

export const slotFavorites = pgTable(
  "slot_favorites",
  {
    dayOfWeek: integer("day_of_week").notNull(),
    mealType: text("meal_type").notNull(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.dayOfWeek, table.mealType, table.recipeId],
    }),
  })
);

export const plannedMeals = pgTable("planned_meals", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  mealType: text("meal_type").notNull(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  servingsMultiplier: real("servings_multiplier").notNull().default(1.0),
  diners: text("diners").notNull().default('["clement","nath","enfant"]'),
  notes: text("notes"),
});

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
  preferences: many(recipePreferences),
  meals: many(plannedMeals),
  slotFavorites: many(slotFavorites),
}));

export const slotFavoritesRelations = relations(slotFavorites, ({ one }) => ({
  recipe: one(recipes, {
    fields: [slotFavorites.recipeId],
    references: [recipes.id],
  }),
}));

export const recipeIngredientsRelations = relations(
  recipeIngredients,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeIngredients.recipeId],
      references: [recipes.id],
    }),
  })
);

export const recipePreferencesRelations = relations(
  recipePreferences,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipePreferences.recipeId],
      references: [recipes.id],
    }),
  })
);

export const plannedMealsRelations = relations(plannedMeals, ({ one }) => ({
  recipe: one(recipes, {
    fields: [plannedMeals.recipeId],
    references: [recipes.id],
  }),
}));
