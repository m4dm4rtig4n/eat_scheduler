import { listRecipes } from "@/lib/db/recipes";
import { PageHeader } from "@/components/page-header";
import { SlotFavoritesView } from "@/components/slot-favorites-view";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const recipes = await listRecipes();

  return (
    <>
      <PageHeader
        title="Favoris hebdo"
        subtitle="Recettes privilégiées par créneau (jour × midi/soir)"
      />
      <SlotFavoritesView recipes={recipes} />
    </>
  );
}
