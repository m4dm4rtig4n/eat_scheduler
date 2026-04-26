import { eq, asc, desc } from "drizzle-orm";
import { db, schema } from "./index";
import type { RecipeInput } from "@/lib/validators";
import type { Diner, Preference } from "@/lib/diners";
import type { Season } from "@/lib/seasons";

const { recipes, recipeIngredients, recipePreferences } = schema;

export type RecipeWithDetails = {
  id: number;
  name: string;
  description: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  instructions: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  weight: number;
  season: Season;
  createdAt: Date | string;
  ingredients: Array<{
    id: number;
    name: string;
    quantity: string;
    position: number;
  }>;
  preferences: Array<{
    diner: Diner;
    preference: Preference;
  }>;
};

export async function listRecipes(): Promise<RecipeWithDetails[]> {
  const result = await (db as any).query.recipes.findMany({
    orderBy: [desc(recipes.createdAt)],
    with: {
      ingredients: {
        orderBy: [asc(recipeIngredients.position)],
      },
      preferences: true,
    },
  });
  return result as RecipeWithDetails[];
}

export async function getRecipe(
  id: number
): Promise<RecipeWithDetails | null> {
  const result = await (db as any).query.recipes.findFirst({
    where: eq(recipes.id, id),
    with: {
      ingredients: {
        orderBy: [asc(recipeIngredients.position)],
      },
      preferences: true,
    },
  });
  return (result ?? null) as RecipeWithDetails | null;
}

export async function createRecipe(
  input: RecipeInput
): Promise<RecipeWithDetails> {
  const [created] = await (db as any)
    .insert(recipes)
    .values({
      name: input.name,
      description: input.description || null,
      servings: input.servings,
      prepTime: input.prepTime ?? null,
      cookTime: input.cookTime ?? null,
      instructions: input.instructions || null,
      sourceUrl: input.sourceUrl || null,
      imageUrl: input.imageUrl || null,
      weight: input.weight,
      season: input.season,
    })
    .returning();

  if (input.ingredients.length > 0) {
    await (db as any).insert(recipeIngredients).values(
      input.ingredients.map((ing, index) => ({
        recipeId: created.id,
        name: ing.name,
        quantity: ing.quantity,
        position: ing.position ?? index,
      }))
    );
  }

  if (input.preferences.length > 0) {
    await (db as any).insert(recipePreferences).values(
      input.preferences.map((p) => ({
        recipeId: created.id,
        diner: p.diner,
        preference: p.preference,
      }))
    );
  }

  const full = await getRecipe(created.id);
  if (!full) throw new Error("Échec création recette");
  return full;
}

export async function updateRecipe(
  id: number,
  input: RecipeInput
): Promise<RecipeWithDetails> {
  await (db as any)
    .update(recipes)
    .set({
      name: input.name,
      description: input.description || null,
      servings: input.servings,
      prepTime: input.prepTime ?? null,
      cookTime: input.cookTime ?? null,
      instructions: input.instructions || null,
      sourceUrl: input.sourceUrl || null,
      imageUrl: input.imageUrl || null,
      weight: input.weight,
      season: input.season,
    })
    .where(eq(recipes.id, id));

  await (db as any)
    .delete(recipeIngredients)
    .where(eq(recipeIngredients.recipeId, id));

  if (input.ingredients.length > 0) {
    await (db as any).insert(recipeIngredients).values(
      input.ingredients.map((ing, index) => ({
        recipeId: id,
        name: ing.name,
        quantity: ing.quantity,
        position: ing.position ?? index,
      }))
    );
  }

  await (db as any)
    .delete(recipePreferences)
    .where(eq(recipePreferences.recipeId, id));

  if (input.preferences.length > 0) {
    await (db as any).insert(recipePreferences).values(
      input.preferences.map((p) => ({
        recipeId: id,
        diner: p.diner,
        preference: p.preference,
      }))
    );
  }

  const full = await getRecipe(id);
  if (!full) throw new Error("Recette introuvable après mise à jour");
  return full;
}

export async function deleteRecipe(id: number): Promise<void> {
  await (db as any).delete(recipes).where(eq(recipes.id, id));
}
