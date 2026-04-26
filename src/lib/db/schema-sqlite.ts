import { sqliteTable, integer, text, real, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  position: integer("position").notNull().default(0),
});

export const recipePreferences = sqliteTable(
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

export const slotFavorites = sqliteTable(
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

export const plannedMeals = sqliteTable("planned_meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
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
