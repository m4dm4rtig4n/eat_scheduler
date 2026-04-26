import { NextRequest, NextResponse } from "next/server";
import { listMealsBetween } from "@/lib/db/meals";
import { buildShoppingList } from "@/lib/shopping-list";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json(
      { error: "Paramètres start et end requis (YYYY-MM-DD)" },
      { status: 400 }
    );
  }
  const meals = await listMealsBetween(start, end);
  const list = buildShoppingList(meals);
  return NextResponse.json({ items: list, mealsCount: meals.length });
}
