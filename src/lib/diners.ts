// Configuration des convives — désormais dynamique (table SQL `diners`).
// Ce fichier ne contient plus que les types, helpers de calcul, et palettes statiques.

export type Diner = string; // = key dans la table diners

export type Preference = "love" | "like" | "dislike";

export const PREFERENCE_LABELS: Record<Preference, string> = {
  love: "Adore",
  like: "Aime",
  dislike: "N'aime pas",
};

export const PREFERENCE_EMOJI: Record<Preference, string> = {
  love: "❤️",
  like: "😐",
  dislike: "👎",
};

export const PREFERENCE_WEIGHT: Record<Preference, number> = {
  love: 3,
  like: 1,
  dislike: 0,
};

export function isPreference(value: string): value is Preference {
  return value === "love" || value === "like" || value === "dislike";
}

// Configuration runtime d'un convive.
// `id` est présent pour les données venant de la DB, absent pour le fallback statique.
export type DinerConfig = {
  id?: number;
  key: Diner;
  label: string;
  initials: string;
  colorKey: ColorKey;
  coefficient: number;
  position: number;
  archived?: boolean;
};

// Palette de couleurs disponibles pour les convives
export const COLOR_KEYS = [
  "blue",
  "pink",
  "rose",
  "emerald",
  "amber",
  "violet",
  "teal",
  "orange",
  "lime",
  "fuchsia",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const COLOR_BG: Record<ColorKey, string> = {
  blue: "bg-blue-500",
  pink: "bg-pink-500",
  rose: "bg-rose-400",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  teal: "bg-teal-500",
  orange: "bg-orange-500",
  lime: "bg-lime-500",
  fuchsia: "bg-fuchsia-500",
};

export const COLOR_LABEL: Record<ColorKey, string> = {
  blue: "Bleu",
  pink: "Rose",
  rose: "Vieux rose",
  emerald: "Vert",
  amber: "Ambre",
  violet: "Violet",
  teal: "Sarcelle",
  orange: "Orange",
  lime: "Citron",
  fuchsia: "Fuchsia",
};

export function isColorKey(value: string): value is ColorKey {
  return (COLOR_KEYS as readonly string[]).includes(value);
}

// Configuration par défaut utilisée comme fallback (SSR sans DB, ou avant fetch).
export const FALLBACK_DINERS: DinerConfig[] = [
  { key: "clement", label: "Clément", initials: "C", colorKey: "blue", coefficient: 1.0, position: 0 },
  { key: "nath", label: "Nath", initials: "N", colorKey: "pink", coefficient: 1.0, position: 1 },
  { key: "chloe", label: "Chloé", initials: "Ch", colorKey: "rose", coefficient: 0.5, position: 2 },
  { key: "simon", label: "Simon", initials: "S", colorKey: "emerald", coefficient: 0.5, position: 3 },
];

// Lookup helpers — toujours travailler avec un `DinerConfig[]` chargé.
export function findDiner(
  diners: DinerConfig[],
  key: Diner
): DinerConfig | undefined {
  return diners.find((d) => d.key === key);
}

export function dinerLabel(diners: DinerConfig[], key: Diner): string {
  return findDiner(diners, key)?.label ?? key;
}

export function dinerInitials(diners: DinerConfig[], key: Diner): string {
  return findDiner(diners, key)?.initials ?? "?";
}

export function dinerColorBg(diners: DinerConfig[], key: Diner): string {
  const d = findDiner(diners, key);
  return d ? COLOR_BG[d.colorKey] : "bg-muted";
}

export function dinerCoefficient(diners: DinerConfig[], key: Diner): number {
  return findDiner(diners, key)?.coefficient ?? 1.0;
}

/**
 * Calcule le total en parts (équivalent adulte) d'une liste de convives.
 */
export function totalShares(diners: DinerConfig[], keys: Diner[]): number {
  return keys.reduce((sum, k) => sum + dinerCoefficient(diners, k), 0);
}

/**
 * Filtre une liste de convives pour ne garder que les actifs (non archivés)
 * dans l'ordre de leur position.
 */
export function activeDiners(diners: DinerConfig[]): DinerConfig[] {
  return diners
    .filter((d) => !d.archived)
    .sort((a, b) => a.position - b.position);
}

/**
 * Retourne les keys actives (toutes les non-archivées) dans l'ordre canonique.
 */
export function activeDinerKeys(diners: DinerConfig[]): Diner[] {
  return activeDiners(diners).map((d) => d.key);
}
