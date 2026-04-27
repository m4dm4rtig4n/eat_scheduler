import type { RecipeWithDetails } from "@/lib/db/recipes";
import type { DayOfWeek } from "@/lib/days";

type MealType = "lunch" | "dinner";

/**
 * Une recette est éligible à un slot si :
 *  - elle n'a aucune restriction (allowedSlots vide = autorisée partout)
 *  - OU si le slot (dayOfWeek, mealType) figure dans la liste autorisée.
 */
export function isRecipeAllowedAtSlot(
  recipe: RecipeWithDetails,
  dayOfWeek: DayOfWeek,
  mealType: MealType
): boolean {
  if (recipe.allowedSlots.length === 0) return true;
  return recipe.allowedSlots.some(
    (s) => s.dayOfWeek === dayOfWeek && s.mealType === mealType
  );
}

/**
 * Vrai si la recette a des restrictions (utile pour afficher un badge).
 */
export function hasSlotRestrictions(recipe: RecipeWithDetails): boolean {
  return recipe.allowedSlots.length > 0;
}
