import { DINERS } from "@/lib/diners";
import type { PlannedMealWithRecipe } from "@/lib/db/meals";

export type ShoppingItem = {
  name: string;
  quantities: string[];
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(de\s+|d['']\s*|du\s+|des\s+|la\s+|le\s+|les\s+|un\s+|une\s+)/i, "")
    .trim();
}

function scaleQuantity(quantity: string, multiplier: number): string {
  if (Math.abs(multiplier - 1) < 0.001) return quantity;
  const match = quantity.match(/^(\d+[.,]?\d*)(.*)$/);
  if (match) {
    const value = parseFloat(match[1].replace(",", "."));
    const rest = match[2];
    const scaled = value * multiplier;
    const formatted = Number.isInteger(scaled)
      ? scaled.toString()
      : scaled.toFixed(1).replace(/\.0$/, "");
    return formatted + rest;
  }
  return `${quantity} × ${multiplier.toFixed(2).replace(/\.?0+$/, "")}`;
}

/**
 * Construit la liste de courses agrégée pour une période.
 *
 * Le coefficient appliqué à chaque ingrédient combine :
 *  - servingsMultiplier (le +/- choisi par l'utilisateur)
 *  - ratio convives effectifs / convives par défaut (3)
 *
 * Exemple : recette pour 2 personnes, plat assigné uniquement à Clément (1/3),
 * avec multiplier 1, on cuisine pour 2 × (1/3) = 0.67 portions.
 */
export function buildShoppingList(
  meals: PlannedMealWithRecipe[]
): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  const totalDiners = DINERS.length;

  for (const meal of meals) {
    const dinersRatio =
      meal.diners.length > 0 ? meal.diners.length / totalDiners : 1;
    const effectiveMultiplier = meal.servingsMultiplier * dinersRatio;

    for (const ingredient of meal.recipe.ingredients) {
      const key = normalizeName(ingredient.name);
      if (!key) continue;
      const scaled = scaleQuantity(ingredient.quantity, effectiveMultiplier);
      const existing = map.get(key);
      if (existing) {
        existing.quantities.push(scaled);
      } else {
        map.set(key, {
          name: ingredient.name,
          quantities: [scaled],
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "fr", { sensitivity: "base" })
  );
}
