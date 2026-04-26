import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RecipeForm } from "@/components/recipe-form";
import { Button } from "@/components/ui/button";

export default function NewRecipePage() {
  return (
    <>
      <PageHeader
        title="Nouvelle recette"
        back={
          <Link href="/recipes">
            <Button variant="ghost" size="icon" aria-label="Retour">
              <ChevronLeft className="size-5" />
            </Button>
          </Link>
        }
      />
      <RecipeForm />
    </>
  );
}
