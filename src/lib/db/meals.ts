import { and, eq, gte, lte, asc, inArray } from "drizzle-orm";
import { db, schema } from "./index";
import type { PlannedMealInput } from "@/lib/validators";
import type { Diner } from "@/lib/diners";

const { plannedMeals, recipeIngredients } = schema;

export type PlannedMealWithRecipe = {
  id: number;
  date: string;
  mealType: string;
  recipeId: number;
  servingsMultiplier: number;
  diners: Diner[];
  notes: string | null;
  recipe: {
    id: number;
    name: string;
    servings: number;
    weight: number;
    imageUrl: string | null;
    ingredients: Array<{ name: string; quantity: string }>;
  };
};

function parseDiners(raw: unknown): Diner[] {
  if (typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is Diner => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

export async function listMealsBetween(
  startDate: string,
  endDate: string
): Promise<PlannedMealWithRecipe[]> {
  const result = await (db as any).query.plannedMeals.findMany({
    where: and(
      gte(plannedMeals.date, startDate),
      lte(plannedMeals.date, endDate)
    ),
    orderBy: [asc(plannedMeals.date), asc(plannedMeals.mealType)],
    with: {
      recipe: {
        with: {
          ingredients: {
            orderBy: [asc(recipeIngredients.position)],
          },
        },
      },
    },
  });
  return result.map((row: any) => ({
    id: row.id,
    date:
      typeof row.date === "string"
        ? row.date
        : row.date.toISOString().split("T")[0],
    mealType: row.mealType,
    recipeId: row.recipeId,
    servingsMultiplier: row.servingsMultiplier,
    diners: parseDiners(row.diners),
    notes: row.notes,
    recipe: {
      id: row.recipe.id,
      name: row.recipe.name,
      servings: row.recipe.servings,
      weight: row.recipe.weight ?? 3,
      imageUrl: row.recipe.imageUrl ?? null,
      ingredients: row.recipe.ingredients.map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
      })),
    },
  }));
}

export async function createMeal(
  input: PlannedMealInput
): Promise<{ id: number }> {
  const [created] = await (db as any)
    .insert(plannedMeals)
    .values({
      date: input.date,
      mealType: input.mealType,
      recipeId: input.recipeId,
      servingsMultiplier: input.servingsMultiplier,
      diners: JSON.stringify(input.diners),
      notes: input.notes ?? null,
    })
    .returning({ id: plannedMeals.id });
  return created;
}

export async function createMeals(
  inputs: PlannedMealInput[]
): Promise<number> {
  if (inputs.length === 0) return 0;
  await (db as any).insert(plannedMeals).values(
    inputs.map((input) => ({
      date: input.date,
      mealType: input.mealType,
      recipeId: input.recipeId,
      servingsMultiplier: input.servingsMultiplier,
      diners: JSON.stringify(input.diners),
      notes: input.notes ?? null,
    }))
  );
  return inputs.length;
}

export async function updateMeal(
  id: number,
  input: Partial<PlannedMealInput>
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (input.date !== undefined) set.date = input.date;
  if (input.mealType !== undefined) set.mealType = input.mealType;
  if (input.recipeId !== undefined) set.recipeId = input.recipeId;
  if (input.servingsMultiplier !== undefined)
    set.servingsMultiplier = input.servingsMultiplier;
  if (input.diners !== undefined) set.diners = JSON.stringify(input.diners);
  if (input.notes !== undefined) set.notes = input.notes;

  if (Object.keys(set).length === 0) return;

  await (db as any).update(plannedMeals).set(set).where(eq(plannedMeals.id, id));
}

export async function deleteMeal(id: number): Promise<void> {
  await (db as any).delete(plannedMeals).where(eq(plannedMeals.id, id));
}

export async function deleteMealsBetween(
  startDate: string,
  endDate: string,
  mealTypes?: string[]
): Promise<void> {
  const conditions = [
    gte(plannedMeals.date, startDate),
    lte(plannedMeals.date, endDate),
  ];
  if (mealTypes && mealTypes.length > 0) {
    conditions.push(inArray(plannedMeals.mealType, mealTypes));
  }
  await (db as any).delete(plannedMeals).where(and(...conditions));
}
