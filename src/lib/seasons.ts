export const SEASONS = ["summer", "winter", "all"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS: Record<Season, string> = {
  summer: "Été",
  winter: "Hiver",
  all: "Toute saison",
};

export const SEASON_EMOJI: Record<Season, string> = {
  summer: "🌞",
  winter: "❄️",
  all: "🌍",
};

export const SEASON_COLORS: Record<Season, string> = {
  summer: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  winter: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  all: "bg-muted text-muted-foreground border-border",
};

/**
 * Détecte la saison à partir d'une date.
 * Convention France : mai-septembre = été, le reste = hiver.
 */
export function getSeasonFromDate(date: Date): "summer" | "winter" {
  const m = date.getMonth() + 1;
  return m >= 5 && m <= 9 ? "summer" : "winter";
}

export function isSeason(value: string): value is Season {
  return value === "summer" || value === "winter" || value === "all";
}

/**
 * Vrai si une recette de saison `recipeSeason` est servable
 * dans le contexte d'une saison `currentSeason`.
 */
export function isRecipeInSeason(
  recipeSeason: Season,
  currentSeason: "summer" | "winter"
): boolean {
  return recipeSeason === "all" || recipeSeason === currentSeason;
}
