import type { RecipeWithDetails } from "@/lib/db/recipes";
import type { Diner, Preference } from "@/lib/diners";
import type { Season } from "@/lib/seasons";

export type RecipeFilters = {
  search: string;
  season: Season | null;
  diners: Diner[];
  loved: boolean;
  quick: boolean;
  minStars: number;
};

export function emptyRecipeFilters(): RecipeFilters {
  return {
    search: "",
    season: null,
    diners: [],
    loved: false,
    quick: false,
    minStars: 0,
  };
}

export function activeFilterCount(f: RecipeFilters): number {
  return (
    (f.season ? 1 : 0) +
    f.diners.length +
    (f.loved ? 1 : 0) +
    (f.quick ? 1 : 0) +
    (f.minStars > 0 ? 1 : 0)
  );
}

function getDinerPreference(
  recipe: RecipeWithDetails,
  diner: Diner
): Preference {
  return (
    (recipe.preferences.find((p) => p.diner === diner)?.preference as Preference) ??
    "like"
  );
}

export function applyRecipeFilters(
  recipes: RecipeWithDetails[],
  f: RecipeFilters
): RecipeWithDetails[] {
  const search = f.search.trim().toLowerCase();
  return recipes.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search)) return false;
    if (f.season && r.season !== f.season) return false;
    if (f.minStars > 0 && r.weight < f.minStars) return false;
    if (f.quick) {
      const time = (r.prepTime ?? 0) + (r.cookTime ?? 0);
      if (time === 0 || time > 30) return false;
    }
    if (f.diners.length > 0) {
      const allAccept = f.diners.every(
        (d) => getDinerPreference(r, d) !== "dislike"
      );
      if (!allAccept) return false;
    }
    if (f.loved) {
      const scope =
        f.diners.length > 0
          ? f.diners
          : r.preferences.map((p) => p.diner);
      const someLove = scope.some(
        (d) => getDinerPreference(r, d) === "love"
      );
      if (!someLove) return false;
    }
    return true;
  });
}
