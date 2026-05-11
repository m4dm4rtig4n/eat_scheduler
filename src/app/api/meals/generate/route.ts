import { NextRequest, NextResponse } from "next/server";
import { generateMealsSchema } from "@/lib/validators";
import { listRecipes } from "@/lib/db/recipes";
import {
  listMealsBetween,
  createMeals,
  deleteMealsBetween,
} from "@/lib/db/meals";
import { listAllFavorites } from "@/lib/db/slot-favorites";
import { listOverridesBetween } from "@/lib/db/meal-slot-overrides";
import { generateWeekPlan } from "@/lib/meal-generator";
import { activeDiners } from "@/lib/diners";
import { listDiners } from "@/lib/db/diners";
import { addDays, formatDateISO, startOfWeek } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = generateMealsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { startDate, endDate, mode, mealTypes, seasonOverride, excludeRecipeIds } =
    parsed.data;

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

  // Fenêtre de récence : on étend à la semaine ISO complète qui contient
  // [startDate, endDate]. Pour une régénération slot-par-slot, ça garantit
  // que le générateur "voit" tous les autres repas de la semaine, pas
  // seulement les voisins ±3 jours, et évite donc de retomber sur un plat
  // déjà cuisiné un autre jour.
  const recencyStart = formatDateISO(startOfWeek(new Date(startDate)));
  const recencyEnd = formatDateISO(addDays(startOfWeek(new Date(endDate)), 6));

  const [existingMeals, slotFavorites, allDiners, slotOverrides] =
    await Promise.all([
      listMealsBetween(recencyStart, recencyEnd),
      listAllFavorites(),
      listDiners(),
      // On charge les overrides uniquement sur la fenêtre de génération réelle
      // [startDate, endDate], pas sur la fenêtre étendue de récence : un convive
      // marqué absent un dimanche précédent ne doit pas influencer la génération
      // du lundi.
      listOverridesBetween(startDate, endDate),
    ]);
  const dinerConfigs = activeDiners(allDiners);
  if (dinerConfigs.length === 0) {
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
      .map((m) => ({
        date: m.date,
        mealType: m.mealType,
        recipeId: m.recipeId,
        diners: m.diners,
      })),
    dinerConfigs,
    seasonOverride,
    slotFavorites,
    excludeRecipeIds,
    slotOverrides: slotOverrides.map((o) => ({
      date: o.date,
      mealType: o.mealType,
      dinerKey: o.dinerKey,
      present: o.present,
    })),
  });

  const allMeals = slots.flatMap((s) => s.meals);
  const inserted = await createMeals(allMeals);

  return NextResponse.json({
    inserted,
    slotsGenerated: slots.length,
    plats: allMeals.length,
  });
}
