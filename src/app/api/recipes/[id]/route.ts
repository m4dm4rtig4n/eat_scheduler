import { NextRequest, NextResponse } from "next/server";
import { getRecipe, updateRecipe, deleteRecipe } from "@/lib/db/recipes";
import { recipeInputSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const recipe = await getRecipe(Number(id));
  if (!recipe) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json(recipe);
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await request.json();
  const parsed = recipeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const updated = await updateRecipe(Number(id), parsed.data);
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await deleteRecipe(Number(id));
  return new NextResponse(null, { status: 204 });
}
