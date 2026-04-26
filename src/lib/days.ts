/**
 * Convention : 0 = lundi, 6 = dimanche.
 * On normalise depuis JS Date (où 0 = dimanche).
 */
export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: "Lundi",
  1: "Mardi",
  2: "Mercredi",
  3: "Jeudi",
  4: "Vendredi",
  5: "Samedi",
  6: "Dimanche",
};

export const DAY_LABELS_SHORT: Record<DayOfWeek, string> = {
  0: "Lun",
  1: "Mar",
  2: "Mer",
  3: "Jeu",
  4: "Ven",
  5: "Sam",
  6: "Dim",
};

/** Convertit un Date JS en DayOfWeek (lundi=0). */
export function getDayOfWeek(date: Date): DayOfWeek {
  const js = date.getDay(); // 0 = dim, 1 = lun, …, 6 = sam
  return ((js + 6) % 7) as DayOfWeek;
}

/** Convertit une date YYYY-MM-DD en DayOfWeek (lundi=0). */
export function getDayOfWeekFromIso(iso: string): DayOfWeek {
  return getDayOfWeek(new Date(iso));
}
