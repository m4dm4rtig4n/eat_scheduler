import { NextRequest, NextResponse } from "next/server";
import { importUrlSchema } from "@/lib/validators";
import { parseRecipeFromUrl } from "@/lib/import/parse-recipe";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = importUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "URL invalide", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const recipe = await parseRecipeFromUrl(parsed.data.url);
    return NextResponse.json(recipe);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur d'import";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
