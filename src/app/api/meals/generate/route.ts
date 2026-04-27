import { NextRequest, NextResponse } from "next/server";
import { generateMealsSchema } from "@/lib/validators";
import { listRecipes } from "@/lib/db/recipes";
import {
  listMealsBetween,
  createMeals,
  deleteMealsBetween,
} from "@/lib/db/meals";
import { listAllFavorites } from "@/lib/db/slot-favorites";
import { generateWeekPlan } from "@/lib/meal-generator";
import { activeDinerKeys } from "@/lib/diners";
import { listDiners } from "@/lib/db/diners";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = generateMealsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { startDate, endDate, mode, mealTypes, seasonOverride } = parsed.data;

  const recipes = await listRecipes();
  if (recipes.length === 0) {
    return NextResponse.json(
      { error: "Aucune recette disponible pour la génération" },
      { status: 422 }
    );
  }

  if (mode === "replace") {
    await deleteMealsBetween(startDate, endDate, mealTypes);
  }

  const [existingMeals, slotFavorites, allDiners] = await Promise.all([
    listMealsBetween(startDate, endDate),
    listAllFavorites(),
    listDiners(),
  ]);
  const dinerKeys = activeDinerKeys(allDiners);
  if (dinerKeys.length === 0) {
    return NextResponse.json(
      { error: "Aucune personne configurée. Va dans les Réglages." },
      { status: 422 }
    );
  }
  const slots = generateWeekPlan({
    recipes,
    startDate,
    endDate,
    mealTypes,
    existingMeals: existingMeals
      .filter((m) => mealTypes.includes(m.mealType as "lunch" | "dinner"))
      .map((m) => ({ date: m.date, mealType: m.mealType, recipeId: m.recipeId })),
    diners: dinerKeys,
    seasonOverride,
    slotFavorites,
  });

  const allMeals = slots.flatMap((s) => s.meals);
  const inserted = await createMeals(allMeals);

  return NextResponse.json({
    inserted,
    slotsGenerated: slots.length,
    plats: allMeals.length,
  });
}
