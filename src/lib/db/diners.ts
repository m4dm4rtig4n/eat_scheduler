import { eq, asc, max } from "drizzle-orm";
import { db, schema } from "./index";
import type {
  DinerConfig,
  ColorKey,
  DinerUnavailableSlot,
} from "@/lib/diners";

const { diners, dinerUnavailableSlots } = schema;

function rowToConfig(
  row: any,
  unavailableSlots: DinerUnavailableSlot[] = []
): DinerConfig {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    initials: row.initials,
    colorKey: row.colorKey as ColorKey,
    coefficient: row.coefficient,
    position: row.position,
    archived: !!row.archived,
    unavailableSlots,
  };
}

export async function listDiners(
  includeArchived = false
): Promise<DinerConfig[]> {
  const [rows, slotRows] = await Promise.all([
    (db as any).select().from(diners).orderBy(asc(diners.position)),
    (db as any).select().from(dinerUnavailableSlots),
  ]);

  const slotsByDinerId = new Map<number, DinerUnavailableSlot[]>();
  for (const s of slotRows) {
    const list = slotsByDinerId.get(s.dinerId) ?? [];
    list.push({
      dayOfWeek: s.dayOfWeek,
      mealType: s.mealType as "lunch" | "dinner",
    });
    slotsByDinerId.set(s.dinerId, list);
  }

  const all = rows.map((r: any) =>
    rowToConfig(r, slotsByDinerId.get(r.id) ?? [])
  );
  return includeArchived ? all : all.filter((d: DinerConfig) => !d.archived);
}

export type DinerInput = {
  key: string;
  label: string;
  initials: string;
  colorKey: ColorKey;
  coefficient: number;
};

export async function createDiner(input: DinerInput): Promise<DinerConfig> {
  // Position = max actuelle + 1
  const [{ maxPos }] = await (db as any)
    .select({ maxPos: max(diners.position) })
    .from(diners);
  const nextPos = (maxPos ?? -1) + 1;
  const [created] = await (db as any)
    .insert(diners)
    .values({
      key: input.key,
      label: input.label,
      initials: input.initials,
      colorKey: input.colorKey,
      coefficient: input.coefficient,
      position: nextPos,
      archived: false,
    })
    .returning();
  return rowToConfig(created);
}

export async function updateDiner(
  id: number,
  input: Partial<Omit<DinerInput, "key">> & {
    archived?: boolean;
    position?: number;
  }
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (input.label !== undefined) set.label = input.label;
  if (input.initials !== undefined) set.initials = input.initials;
  if (input.colorKey !== undefined) set.colorKey = input.colorKey;
  if (input.coefficient !== undefined) set.coefficient = input.coefficient;
  if (input.archived !== undefined) set.archived = input.archived;
  if (input.position !== undefined) set.position = input.position;
  if (Object.keys(set).length === 0) return;
  await (db as any).update(diners).set(set).where(eq(diners.id, id));
}

export async function archiveDiner(id: number): Promise<void> {
  await (db as any)
    .update(diners)
    .set({ archived: true })
    .where(eq(diners.id, id));
}

export async function reorderDiners(
  orderedIds: number[]
): Promise<void> {
  // Met à jour la position pour chaque id selon son index
  for (let i = 0; i < orderedIds.length; i++) {
    await (db as any)
      .update(diners)
      .set({ position: i })
      .where(eq(diners.id, orderedIds[i]));
  }
}

export async function findDinerByKey(
  key: string
): Promise<DinerConfig | undefined> {
  const rows = await (db as any)
    .select()
    .from(diners)
    .where(eq(diners.key, key))
    .limit(1);
  return rows[0] ? rowToConfig(rows[0]) : undefined;
}

export async function findDinerById(
  id: number
): Promise<DinerConfig | undefined> {
  const rows = await (db as any)
    .select()
    .from(diners)
    .where(eq(diners.id, id))
    .limit(1);
  if (!rows[0]) return undefined;
  const slotRows = await (db as any)
    .select()
    .from(dinerUnavailableSlots)
    .where(eq(dinerUnavailableSlots.dinerId, id));
  const slots: DinerUnavailableSlot[] = slotRows.map((s: any) => ({
    dayOfWeek: s.dayOfWeek,
    mealType: s.mealType as "lunch" | "dinner",
  }));
  return rowToConfig(rows[0], slots);
}

/**
 * Remplace l'ensemble des indisponibilités récurrentes d'un convive.
 * Pattern delete-then-insert : simple, dédupliqué via la PK composite,
 * et la table reste en cohérence forte avec l'UI (tout-ou-rien).
 */
export async function setUnavailableSlots(
  dinerId: number,
  slots: DinerUnavailableSlot[]
): Promise<void> {
  await (db as any)
    .delete(dinerUnavailableSlots)
    .where(eq(dinerUnavailableSlots.dinerId, dinerId));
  if (slots.length === 0) return;
  // Dédup défensif côté code au cas où le caller envoie des doublons
  const seen = new Set<string>();
  const rows: { dinerId: number; dayOfWeek: number; mealType: string }[] = [];
  for (const s of slots) {
    const k = `${s.dayOfWeek}|${s.mealType}`;
    if (seen.has(k)) continue;
    seen.add(k);
    rows.push({ dinerId, dayOfWeek: s.dayOfWeek, mealType: s.mealType });
  }
  await (db as any).insert(dinerUnavailableSlots).values(rows);
}
