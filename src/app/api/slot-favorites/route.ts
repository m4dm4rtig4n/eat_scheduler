import { NextRequest, NextResponse } from "next/server";
import { listAllFavorites, setFavoritesForSlot } from "@/lib/db/slot-favorites";
import { slotFavoritesSchema } from "@/lib/validators";
import type { DayOfWeek } from "@/lib/days";
import type {
  MealType,
  SlotFavoriteEntry,
} from "@/lib/db/slot-favorites";

export async function GET() {
  const all = await listAllFavorites();
  return NextResponse.json(all);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const parsed = slotFavoritesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { dayOfWeek, mealType, entries, recipeIds } = parsed.data;

  // Format moderne : `entries` (avec pinned). Legacy : `recipeIds`.
  const finalEntries: SlotFavoriteEntry[] =
    entries ??
    (recipeIds ?? []).map((recipeId) => ({ recipeId, pinned: false }));

  await setFavoritesForSlot(
    dayOfWeek as DayOfWeek,
    mealType as MealType,
    finalEntries
  );
  return new NextResponse(null, { status: 204 });
}
