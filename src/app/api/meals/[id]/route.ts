import { NextRequest, NextResponse } from "next/server";
import { updateMeal, deleteMeal } from "@/lib/db/meals";
import { plannedMealUpdateSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = plannedMealUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  await updateMeal(Number(id), parsed.data);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await deleteMeal(Number(id));
  return new NextResponse(null, { status: 204 });
}
