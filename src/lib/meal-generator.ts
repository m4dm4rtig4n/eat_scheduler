import { DINERS, type Diner, type Preference } from "@/lib/diners";
import {
  getSeasonFromDate,
  isRecipeInSeason,
  type Season,
} from "@/lib/seasons";
import { getDayOfWeekFromIso, type DayOfWeek } from "@/lib/days";
import type { RecipeWithDetails } from "@/lib/db/recipes";
import type { PlannedMealInput } from "@/lib/validators";
import type { SlotFavorite } from "@/lib/db/slot-favorites";

type MealType = "lunch" | "dinner";

const FAVORITE_BONUS = 3;

export type GenerationContext = {
  recipes: RecipeWithDetails[];
  startDate: string;
  endDate: string;
  mealTypes: MealType[];
  existingMeals: Array<{ date: string; mealType: string; recipeId: number }>;
  diners: Diner[];
  seasonOverride?: "summer" | "winter";
  slotFavorites?: SlotFavorite[];
};

function getPreference(
  recipe: RecipeWithDetails,
  diner: Diner
): Preference {
  const found = recipe.preferences.find((p) => p.diner === diner);
  return (found?.preference as Preference) ?? "like";
}

function isAcceptedBy(recipe: RecipeWithDetails, diners: Diner[]): boolean {
  return diners.every((d) => getPreference(recipe, d) !== "dislike");
}

function dinersWhoAccept(
  recipe: RecipeWithDetails,
  diners: Diner[]
): Diner[] {
  return diners.filter((d) => getPreference(recipe, d) !== "dislike");
}

function recipeScore(
  recipe: RecipeWithDetails,
  diners: Diner[],
  recentlyUsed: Set<number>,
  slotFavoriteIds?: Set<number>
): number {
  let prefScore = 0;
  for (const d of diners) {
    const pref = getPreference(recipe, d);
    if (pref === "love") prefScore += 3;
    else if (pref === "like") prefScore += 1;
  }

  // Bonus si peu d'ingrédients (≤ 5 = bonus, sinon pénalité douce)
  const ingredientCount = Math.max(1, recipe.ingredients.length);
  const ingredientBonus = ingredientCount <= 5 ? 1.5 : 5 / ingredientCount;

  // Poids de base de la recette (1-5) * couverture des convives
  const coverage = diners.length / Math.max(1, DINERS.length);
  const baseWeight = recipe.weight * (1 + coverage);

  // Pénalité si recently used
  const recencyPenalty = recentlyUsed.has(recipe.id) ? 0.2 : 1;

  // Bonus si recette favorite pour ce slot (jour × créneau)
  const favoriteBonus =
    slotFavoriteIds && slotFavoriteIds.has(recipe.id) ? FAVORITE_BONUS : 1;

  return (
    baseWeight *
    (prefScore + 1) *
    ingredientBonus *
    recencyPenalty *
    favoriteBonus
  );
}

function weightedRandomPick<T>(
  items: Array<{ item: T; weight: number }>,
  rng: () => number
): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, x) => sum + x.weight, 0);
  if (total <= 0) {
    return items[Math.floor(rng() * items.length)].item;
  }
  let r = rng() * total;
  for (const { item, weight } of items) {
    r -= weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1].item;
}

function* dateRange(start: string, end: string): Generator<string> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const cur = new Date(startDate);
  while (cur <= endDate) {
    yield cur.toISOString().split("T")[0];
    cur.setDate(cur.getDate() + 1);
  }
}

export type GeneratedSlot = {
  date: string;
  mealType: MealType;
  meals: PlannedMealInput[];
};

/**
 * Génère un planning multi-convives.
 *
 * Pour chaque créneau (date × mealType), on essaie de trouver le minimum
 * de plats permettant de satisfaire tous les convives selon leurs préférences.
 *
 * Stratégie greedy :
 *  1. Convives à servir = tous (filtrés par diners du contexte)
 *  2. Tant qu'il reste des convives à servir :
 *     a. Filtrer les recettes acceptées par au moins un convive restant
 *     b. Trier/scorer pour favoriser celles qui couvrent le plus de convives
 *     c. Tirer une recette pondérée parmi les top candidates
 *     d. Retirer les convives qui acceptent cette recette
 */
export function generateWeekPlan(
  ctx: GenerationContext,
  rng: () => number = Math.random
): GeneratedSlot[] {
  const dinersToServe =
    ctx.diners.length > 0 ? ctx.diners : ([...DINERS] as Diner[]);

  const usedThisWeek = new Set<number>();
  const slots: GeneratedSlot[] = [];

  const existingByKey = new Map<string, number[]>();
  for (const m of ctx.existingMeals) {
    const k = `${m.date}|${m.mealType}`;
    if (!existingByKey.has(k)) existingByKey.set(k, []);
    existingByKey.get(k)!.push(m.recipeId);
    usedThisWeek.add(m.recipeId);
  }

  // Index favoris par (jour × créneau)
  const favoritesByKey = new Map<string, Set<number>>();
  for (const fav of ctx.slotFavorites ?? []) {
    const k = `${fav.dayOfWeek}|${fav.mealType}`;
    if (!favoritesByKey.has(k)) favoritesByKey.set(k, new Set());
    favoritesByKey.get(k)!.add(fav.recipeId);
  }

  // Construit la liste des (date, mealType) à traiter, en priorisant
  // les slots qui ont des favoris configurés. Sinon ces favoris se font
  // "voler" par d'autres slots à cause de la pénalité de récence.
  const allSlots: Array<{ date: string; mealType: MealType; hasFavorites: boolean }> = [];
  for (const date of dateRange(ctx.startDate, ctx.endDate)) {
    const dayOfWeek = getDayOfWeekFromIso(date);
    for (const mealType of ctx.mealTypes) {
      const slotKey = `${date}|${mealType}`;
      if ((existingByKey.get(slotKey) ?? []).length > 0) continue;
      const hasFavorites =
        (favoritesByKey.get(`${dayOfWeek}|${mealType}`)?.size ?? 0) > 0;
      allSlots.push({ date, mealType, hasFavorites });
    }
  }
  allSlots.sort((a, b) => {
    if (a.hasFavorites !== b.hasFavorites) return a.hasFavorites ? -1 : 1;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.mealType < b.mealType ? -1 : 1;
  });

  for (const { date, mealType } of allSlots) {
    const slotSeason =
      ctx.seasonOverride ?? getSeasonFromDate(new Date(date));
    const dayOfWeek = getDayOfWeekFromIso(date);

    // Pool de recettes éligibles pour ce jour selon la saison
    const seasonalRecipes = ctx.recipes.filter((r) =>
      isRecipeInSeason(r.season, slotSeason)
    );

    {
      const slotFavoriteIds = favoritesByKey.get(`${dayOfWeek}|${mealType}`);

      const generatedMeals: PlannedMealInput[] = [];
      let remainingDiners = [...dinersToServe];

      // Boucle de couverture : continuer tant qu'il reste des convives
      // sans plat assigné, avec une garde anti-boucle infinie
      let safety = 5;
      while (remainingDiners.length > 0 && safety-- > 0) {
        const candidates = seasonalRecipes
          .map((recipe) => {
            const accepted = dinersWhoAccept(recipe, remainingDiners);
            if (accepted.length === 0) return null;
            return {
              item: { recipe, accepted },
              weight: recipeScore(
                recipe,
                accepted,
                usedThisWeek,
                slotFavoriteIds
              ),
            };
          })
          .filter(
            (x): x is { item: { recipe: RecipeWithDetails; accepted: Diner[] }; weight: number } =>
              x !== null
          );

        if (candidates.length === 0) {
          // Aucune recette de saison n'accepte ces convives.
          // Fallback 1 : relâcher la récence parmi les recettes saisonnières
          // Fallback 2 : autoriser hors saison plutôt que laisser des convives non servis
          const seasonalFallback = seasonalRecipes
            .map((recipe) => {
              const accepted = dinersWhoAccept(recipe, remainingDiners);
              if (accepted.length === 0) return null;
              return {
                item: { recipe, accepted },
                weight: 1,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

          const fallback =
            seasonalFallback.length > 0
              ? seasonalFallback
              : ctx.recipes
                  .map((recipe) => {
                    const accepted = dinersWhoAccept(recipe, remainingDiners);
                    if (accepted.length === 0) return null;
                    return { item: { recipe, accepted }, weight: 0.5 };
                  })
                  .filter((x): x is NonNullable<typeof x> => x !== null);

          if (fallback.length === 0) break;
          const picked = weightedRandomPick(fallback, rng);
          if (!picked) break;
          generatedMeals.push({
            date,
            mealType,
            recipeId: picked.recipe.id,
            servingsMultiplier: 1,
            diners: picked.accepted,
            notes: null,
          });
          usedThisWeek.add(picked.recipe.id);
          remainingDiners = remainingDiners.filter(
            (d) => !picked.accepted.includes(d)
          );
          continue;
        }

        // On garde les top 5 par score pour ajouter de la diversité
        candidates.sort((a, b) => b.weight - a.weight);
        const topK = candidates.slice(0, 5);
        const picked = weightedRandomPick(topK, rng);
        if (!picked) break;

        generatedMeals.push({
          date,
          mealType,
          recipeId: picked.recipe.id,
          servingsMultiplier: 1,
          diners: picked.accepted,
          notes: null,
        });
        usedThisWeek.add(picked.recipe.id);
        remainingDiners = remainingDiners.filter(
          (d) => !picked.accepted.includes(d)
        );
      }

      if (generatedMeals.length > 0) {
        slots.push({ date, mealType, meals: generatedMeals });
      }
    }
  }

  return slots;
}

export {
  getPreference,
  isAcceptedBy,
  dinersWhoAccept,
  recipeScore,
  weightedRandomPick,
};
