import Link from "next/link";
import { Plus, Clock, Users, Star } from "lucide-react";
import { listRecipes } from "@/lib/db/recipes";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  DINERS,
  DINER_INITIALS,
  DINER_COLORS,
  DINER_LABELS,
  PREFERENCE_EMOJI,
  type Diner,
  type Preference,
} from "@/lib/diners";
import {
  SEASON_EMOJI,
  SEASON_LABELS,
  SEASON_COLORS,
} from "@/lib/seasons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await listRecipes();

  return (
    <>
      <PageHeader
        title="Recettes"
        action={
          <Link href="/recipes/new">
            <Button size="sm" className="gap-1">
              <Plus className="size-4" />
              Nouveau
            </Button>
          </Link>
        }
      />
      <div className="px-4 py-4">
        {recipes.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {recipes.map((recipe) => {
              const prefByDiner = new Map<Diner, Preference>(
                recipe.preferences.map((p) => [p.diner, p.preference])
              );
              return (
                <li key={recipe.id}>
                  <Link
                    href={`/recipes/${recipe.id}/edit`}
                    className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 active:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-medium text-base flex-1">
                        {recipe.name}
                      </h2>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-xs",
                            SEASON_COLORS[recipe.season]
                          )}
                          title={SEASON_LABELS[recipe.season]}
                        >
                          {SEASON_EMOJI[recipe.season]}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-3.5",
                                i < recipe.weight
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {recipe.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {recipe.servings} pers.
                      </span>
                      {(recipe.prepTime || recipe.cookTime) && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min
                        </span>
                      )}
                      <span>· {recipe.ingredients.length} ingr.</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {DINERS.map((d) => {
                        const pref = prefByDiner.get(d) ?? "like";
                        return (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1 text-xs"
                            title={`${DINER_LABELS[d]} : ${pref}`}
                          >
                            <span
                              className={cn(
                                "inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold text-white",
                                DINER_COLORS[d]
                              )}
                            >
                              {DINER_INITIALS[d]}
                            </span>
                            <span>{PREFERENCE_EMOJI[pref]}</span>
                          </span>
                        );
                      })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="text-muted-foreground mb-4">Aucune recette pour l'instant</p>
      <Link href="/recipes/new">
        <Button>
          <Plus className="size-4" />
          Créer une recette
        </Button>
      </Link>
    </div>
  );
}
