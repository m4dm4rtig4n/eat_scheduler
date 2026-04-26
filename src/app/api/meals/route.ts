import { NextRequest, NextResponse } from "next/server";
import { listMealsBetween, createMeal } from "@/lib/db/meals";
import { plannedMealSchema } from "@/lib/validators";

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
  return NextResponse.json(meals);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = plannedMealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const created = await createMeal(parsed.data);
  return NextResponse.json(created, { status: 201 });
}
