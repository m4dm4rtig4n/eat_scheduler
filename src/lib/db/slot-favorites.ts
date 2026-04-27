import { and, eq } from "drizzle-orm";
import { db, schema } from "./index";
import type { DayOfWeek } from "@/lib/days";

const { slotFavorites } = schema;

export type MealType = "lunch" | "dinner";

export type SlotFavorite = {
  dayOfWeek: DayOfWeek;
  mealType: MealType;
  recipeId: number;
  pinned: boolean;
};

export type SlotFavoriteEntry = {
  recipeId: number;
  pinned: boolean;
};

/** Liste tous les favoris (pour affichage de la grille hebdo). */
export async function listAllFavorites(): Promise<SlotFavorite[]> {
  const rows = await (db as any).select().from(slotFavorites);
  return rows.map((r: any) => ({
    dayOfWeek: r.dayOfWeek as DayOfWeek,
    mealType: r.mealType as MealType,
    recipeId: r.recipeId,
    pinned: Boolean(r.pinned),
  }));
}

/** Liste les entrées favorites (id + pinned) pour un slot donné. */
export async function listFavoritesForSlot(
  dayOfWeek: DayOfWeek,
  mealType: MealType
): Promise<SlotFavoriteEntry[]> {
  const rows = await (db as any)
    .select()
    .from(slotFavorites)
    .where(
      and(
        eq(slotFavorites.dayOfWeek, dayOfWeek),
        eq(slotFavorites.mealType, mealType)
      )
    );
  return rows.map((r: any) => ({
    recipeId: r.recipeId,
    pinned: Boolean(r.pinned),
  }));
}

/** Remplace tous les favoris d'un slot par la liste fournie. */
export async function setFavoritesForSlot(
  dayOfWeek: DayOfWeek,
  mealType: MealType,
  entries: SlotFavoriteEntry[]
): Promise<void> {
  await (db as any)
    .delete(slotFavorites)
    .where(
      and(
        eq(slotFavorites.dayOfWeek, dayOfWeek),
        eq(slotFavorites.mealType, mealType)
      )
    );
  if (entries.length > 0) {
    await (db as any).insert(slotFavorites).values(
      entries.map((e) => ({
        dayOfWeek,
        mealType,
        recipeId: e.recipeId,
        pinned: e.pinned,
      }))
    );
  }
}
