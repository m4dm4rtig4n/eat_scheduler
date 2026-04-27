import { NextRequest, NextResponse } from "next/server";
import { searchRecipeImages } from "@/lib/import/search-image";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const countParam = request.nextUrl.searchParams.get("count");
  const count = Math.min(
    Math.max(parseInt(countParam ?? "6", 10) || 6, 1),
    20
  );
  if (!query) {
    return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  }
  try {
    const urls = await searchRecipeImages(query, count);
    return NextResponse.json({ urls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
