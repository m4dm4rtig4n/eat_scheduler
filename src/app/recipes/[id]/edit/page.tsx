import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RecipeForm } from "@/components/recipe-form";
import { Button } from "@/components/ui/button";
import { getRecipe } from "@/lib/db/recipes";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(Number(id));
  if (!recipe) notFound();

  return (
    <>
      <PageHeader
        title={recipe.name}
        back={
          <Link href="/recipes">
            <Button variant="ghost" size="icon" aria-label="Retour">
              <ChevronLeft className="size-5" />
            </Button>
          </Link>
        }
      />
      <RecipeForm initial={recipe} recipeId={recipe.id} />
    </>
  );
}
