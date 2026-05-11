import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "./index";

const { mealSlotOverrides } = schema;

export type MealType = "lunch" | "dinner";

/**
 * Override ponctuel de présence d'un convive sur un créneau précis
 * (date × midi/soir). `present=false` = forcé absent malgré présence par
 * défaut. `present=true` = forcé présent malgré absence récurrente.
 *
 * L'absence de ligne = pas d'override, on utilise le comportement par défaut
 * (réglages convives + `unavailableSlots` récurrents).
 *
 * Utilisé par le générateur de menus pour ajuster la liste des convives
 * à servir avant le tirage des recettes du slot concerné.
 */
export type MealSlotOverride = {
  date: string; // YYYY-MM-DD
  mealType: MealType;
  dinerKey: string;
  present: boolean;
};

/** Liste les overrides dans une fenêtre [startDate, endDate]. */
export async function listOverridesBetween(
  startDate: string,
  endDate: string
): Promise<MealSlotOverride[]> {
  const rows = await (db as any)
    .select()
    .from(mealSlotOverrides)
    .where(
      and(
        gte(mealSlotOverrides.date, startDate),
        lte(mealSlotOverrides.date, endDate)
      )
    );
  return rows.map((r: any) => ({
    date: typeof r.date === "string" ? r.date : new Date(r.date).toISOString().slice(0, 10),
    mealType: r.mealType as MealType,
    dinerKey: r.dinerKey,
    present: Boolean(r.present),
  }));
}

/**
 * Remplace l'ensemble des overrides d'un slot précis (date × mealType) par
 * la liste fournie. L'UI envoie toujours l'état souhaité complet pour le slot
 * (idempotent, pas de delta).
 */
export async function setOverridesForSlot(
  date: string,
  mealType: MealType,
  overrides: Array<{ dinerKey: string; present: boolean }>
): Promise<void> {
  await (db as any)
    .delete(mealSlotOverrides)
    .where(
      and(
        eq(mealSlotOverrides.date, date),
        eq(mealSlotOverrides.mealType, mealType)
      )
    );
  if (overrides.length > 0) {
    await (db as any).insert(mealSlotOverrides).values(
      overrides.map((o) => ({
        date,
        mealType,
        dinerKey: o.dinerKey,
        present: o.present,
      }))
    );
  }
}
