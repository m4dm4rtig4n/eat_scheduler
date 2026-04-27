import Link from "next/link";
import { Plus } from "lucide-react";
import { listRecipes } from "@/lib/db/recipes";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RecipesBrowser } from "@/components/recipes-browser";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await listRecipes();

  return (
    <>
      <PageHeader
        title="Recettes"
        subtitle={
          recipes.length > 0
            ? `${recipes.length} recette${recipes.length > 1 ? "s" : ""} dans ton carnet`
            : undefined
        }
        action={
          <Link href="/recipes/new">
            <Button size="sm" className="gap-1">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </Link>
        }
      />
      <RecipesBrowser recipes={recipes} />
    </>
  );
}
