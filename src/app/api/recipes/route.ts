import { NextRequest, NextResponse } from "next/server";
import { listRecipes, createRecipe } from "@/lib/db/recipes";
import { recipeInputSchema } from "@/lib/validators";

export async function GET() {
  const recipes = await listRecipes();
  return NextResponse.json(recipes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = recipeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const created = await createRecipe(parsed.data);
  return NextResponse.json(created, { status: 201 });
}
