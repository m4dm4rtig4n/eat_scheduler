export const DINERS = ["clement", "nath", "enfant"] as const;
export type Diner = (typeof DINERS)[number];

export const DINER_LABELS: Record<Diner, string> = {
  clement: "Clément",
  nath: "Nath",
  enfant: "Enfant",
};

export const DINER_INITIALS: Record<Diner, string> = {
  clement: "C",
  nath: "N",
  enfant: "E",
};

export const DINER_COLORS: Record<Diner, string> = {
  clement: "bg-blue-500",
  nath: "bg-pink-500",
  enfant: "bg-green-500",
};

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

export function isDiner(value: string): value is Diner {
  return (DINERS as readonly string[]).includes(value);
}

export function isPreference(value: string): value is Preference {
  return value === "love" || value === "like" || value === "dislike";
}
