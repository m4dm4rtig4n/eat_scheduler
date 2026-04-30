import type { RecipeWithDetails } from "@/lib/db/recipes";
import type { DayOfWeek } from "@/lib/days";

type MealType = "lunch" | "dinner";

/**
 * Une recette est éligible à un slot selon ces règles, dans cet ordre :
 *  1. Si `allowedSlots` non vide (whitelist) → uniquement ces slots
 *  2. Sinon, si `excludedSlots` non vide (blacklist) → tout sauf ces slots
 *  3. Sinon → autorisée partout (cas par défaut)
 *
 * En pratique, l'UI garantit qu'une seule des deux listes peut être remplie
 * en même temps. Si les deux le sont, la whitelist prend la priorité.
 */
export function isRecipeAllowedAtSlot(
  recipe: RecipeWithDetails,
  dayOfWeek: DayOfWeek,
  mealType: MealType
): boolean {
  if (recipe.allowedSlots.length > 0) {
    return recipe.allowedSlots.some(
      (s) => s.dayOfWeek === dayOfWeek && s.mealType === mealType
    );
  }
  if (recipe.excludedSlots.length > 0) {
    const isExcluded = recipe.excludedSlots.some(
      (s) => s.dayOfWeek === dayOfWeek && s.mealType === mealType
    );
    return !isExcluded;
  }
  return true;
}

/** Vrai si la recette a une restriction whitelist (allowedSlots non vide). */
export function hasAllowedSlotRestrictions(recipe: RecipeWithDetails): boolean {
  return recipe.allowedSlots.length > 0;
}

/** Vrai si la recette a une restriction blacklist (excludedSlots non vide). */
export function hasExcludedSlotRestrictions(
  recipe: RecipeWithDetails
): boolean {
  return recipe.excludedSlots.length > 0;
}

/** Vrai si la recette a une quelconque restriction de slot. */
export function hasSlotRestrictions(recipe: RecipeWithDetails): boolean {
  return (
    hasAllowedSlotRestrictions(recipe) || hasExcludedSlotRestrictions(recipe)
  );
}
