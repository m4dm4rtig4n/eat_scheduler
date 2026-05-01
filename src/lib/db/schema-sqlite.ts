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

export const recipeAllowedSlots = sqliteTable(
  "recipe_allowed_slots",
  {
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    mealType: text("meal_type").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.recipeId, table.dayOfWeek, table.mealType],
    }),
  })
);

export const recipeExcludedSlots = sqliteTable(
  "recipe_excluded_slots",
  {
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    mealType: text("meal_type").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.recipeId, table.dayOfWeek, table.mealType],
    }),
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
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
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
  diners: text("diners").notNull().default('["clement","nath","chloe","simon"]'),
  notes: text("notes"),
});

export const diners = sqliteTable("diners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  initials: text("initials").notNull(),
  colorKey: text("color_key").notNull().default("blue"),
  coefficient: real("coefficient").notNull().default(1.0),
  position: integer("position").notNull().default(0),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

export const dinerUnavailableSlots = sqliteTable(
  "diner_unavailable_slots",
  {
    dinerId: integer("diner_id")
      .notNull()
      .references(() => diners.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    mealType: text("meal_type").notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.dinerId, table.dayOfWeek, table.mealType],
    }),
  })
);

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
  preferences: many(recipePreferences),
  meals: many(plannedMeals),
  slotFavorites: many(slotFavorites),
  allowedSlots: many(recipeAllowedSlots),
  excludedSlots: many(recipeExcludedSlots),
}));

export const recipeAllowedSlotsRelations = relations(
  recipeAllowedSlots,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeAllowedSlots.recipeId],
      references: [recipes.id],
    }),
  })
);

export const recipeExcludedSlotsRelations = relations(
  recipeExcludedSlots,
  ({ one }) => ({
    recipe: one(recipes, {
      fields: [recipeExcludedSlots.recipeId],
      references: [recipes.id],
    }),
  })
);

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

export const dinersRelations = relations(diners, ({ many }) => ({
  unavailableSlots: many(dinerUnavailableSlots),
}));

export const dinerUnavailableSlotsRelations = relations(
  dinerUnavailableSlots,
  ({ one }) => ({
    diner: one(diners, {
      fields: [dinerUnavailableSlots.dinerId],
      references: [diners.id],
    }),
  })
);
