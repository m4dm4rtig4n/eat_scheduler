import { z } from "zod";
import { COLOR_KEYS } from "@/lib/diners";
import { SEASONS } from "@/lib/seasons";

export const ingredientInputSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  quantity: z.string().min(1, "Quantité requise").max(100),
  position: z.number().int().nonnegative().optional(),
});

// Une clé de convive (validée à la table runtime, pas un enum statique)
export const dinerSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9_-]+$/, "Clé invalide (a-z, 0-9, _, - uniquement)");
export const preferenceSchema = z.enum(["love", "like", "dislike"]);

export const preferenceInputSchema = z.object({
  diner: dinerSchema,
  preference: preferenceSchema,
});

export const allowedSlotInputSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum(["lunch", "dinner"]),
});

export type AllowedSlotInput = z.infer<typeof allowedSlotInputSchema>;

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
  allowedSlots: z.array(allowedSlotInputSchema).default([]),
  excludedSlots: z.array(allowedSlotInputSchema).default([]),
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
  diners: z.array(dinerSchema).min(1).default([]),
  notes: z.string().max(500).optional().nullable(),
  pinned: z.boolean().default(false),
});

export type PlannedMealInput = z.infer<typeof plannedMealSchema>;

export const plannedMealUpdateSchema = plannedMealSchema.partial();

export const slotFavoriteEntrySchema = z.object({
  recipeId: z.coerce.number().int().positive(),
  pinned: z.boolean().default(false),
});

export const slotFavoritesSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum(["lunch", "dinner"]),
  // Format moderne : entries avec pinned. On accepte aussi le legacy (array d'ids)
  entries: z.array(slotFavoriteEntrySchema).optional(),
  recipeIds: z.array(z.coerce.number().int().positive()).optional(),
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
  // Recettes à exclure du tirage. Utilisé pour la régénération d'un slot :
  // l'utilisateur veut explicitement remplacer la recette précédente.
  excludeRecipeIds: z.array(z.coerce.number().int().positive()).optional(),
});

export type GenerateMealsInput = z.infer<typeof generateMealsSchema>;

export const colorKeySchema = z.enum(COLOR_KEYS);

export const dinerCreateSchema = z.object({
  key: z
    .string()
    .min(1, "Clé requise")
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "Clé invalide (a-z, 0-9, _, - uniquement)"),
  label: z.string().min(1, "Nom requis").max(50),
  initials: z.string().min(1, "Initiales requises").max(3),
  colorKey: colorKeySchema,
  coefficient: z.coerce.number().min(0.1).max(2),
});

export const unavailableSlotInputSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  mealType: z.enum(["lunch", "dinner"]),
});

export type UnavailableSlotInput = z.infer<typeof unavailableSlotInputSchema>;

export const dinerUpdateSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  initials: z.string().min(1).max(3).optional(),
  colorKey: colorKeySchema.optional(),
  coefficient: z.coerce.number().min(0.1).max(2).optional(),
  archived: z.boolean().optional(),
  position: z.coerce.number().int().nonnegative().optional(),
  unavailableSlots: z.array(unavailableSlotInputSchema).optional(),
});

export const dinerReorderSchema = z.object({
  orderedIds: z.array(z.coerce.number().int().positive()).min(1),
});

export type DinerCreateInput = z.infer<typeof dinerCreateSchema>;
export type DinerUpdateInput = z.infer<typeof dinerUpdateSchema>;
