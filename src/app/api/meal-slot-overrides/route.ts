import { NextRequest, NextResponse } from "next/server";
import {
  listOverridesBetween,
  setOverridesForSlot,
} from "@/lib/db/meal-slot-overrides";
import { mealSlotOverridesSchema } from "@/lib/validators";

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
  const overrides = await listOverridesBetween(start, end);
  return NextResponse.json(overrides);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const parsed = mealSlotOverridesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { date, mealType, overrides } = parsed.data;
  await setOverridesForSlot(
    date,
    mealType,
    overrides.map((o) => ({ dinerKey: o.dinerKey, present: o.present }))
  );
  return new NextResponse(null, { status: 204 });
}
