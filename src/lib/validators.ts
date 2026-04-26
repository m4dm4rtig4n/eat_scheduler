import { z } from "zod";
import { DINERS } from "@/lib/diners";
import { SEASONS } from "@/lib/seasons";

export const ingredientInputSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  quantity: z.string().min(1, "Quantité requise").max(100),
  position: z.number().int().nonnegative().optional(),
});

export const dinerSchema = z.enum(DINERS);
export const preferenceSchema = z.enum(["love", "like", "dislike"]);

export const preferenceInputSchema = z.object({
  diner: dinerSchema,
  preference: preferenceSchema,
});

export const recipeInputSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  description: z.string().max(2000).optional().nullable(),
  servings: z.coerce.number().int().positive().default(2),
  prepTime: z.coerce.number().int().nonnegative().optional().nullable(),
  cookTime: z.coerce.number().int().nonnegative().optional().nullable(),
  instructions: z.string().max(10000).optional().nullable(),
  sourceUrl: z.string().url().optional().nullable().or(z.literal("")),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  weight: z.coerce.number().int().min(1).max(5).default(3),
  season: z.enum(SEASONS).default("all"),
  ingredients: z.array(ingredientInputSchema).default([]),
  preferences: z.array(preferenceInputSchema).default([]),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type IngredientInput = z.infer<typeof ingredientInputSchema>;
export type PreferenceInput = z.infer<typeof preferenceInputSchema>;

export const importUrlSchema = z.object({
  url: z.string().url("URL invalide"),
});

export const plannedMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD attendu"),
  mealType: z.enum(["lunch", "dinner"]),
  recipeId: z.coerce.number().int().positive(),
  servingsMultiplier: z.coerce.number().positive().default(1),
  diners: z.array(dinerSchema).min(1).default([...DINERS]),
  notes: z.string().max(500).optional().nullable(),
});

export type PlannedMealInput = z.infer<typeof plannedMealSchema>;

export const plannedMealUpdateSchema = plannedMealSchema.partial();

export const slotFavoritesSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum(["lunch", "dinner"]),
  recipeIds: z.array(z.coerce.number().int().positive()).default([]),
});

export type SlotFavoritesInput = z.infer<typeof slotFavoritesSchema>;

export const generateMealsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(["fill", "replace"]).default("fill"),
  mealTypes: z
    .array(z.enum(["lunch", "dinner"]))
    .min(1)
    .default(["lunch", "dinner"]),
  seasonOverride: z.enum(["summer", "winter"]).optional(),
});

export type GenerateMealsInput = z.infer<typeof generateMealsSchema>;
