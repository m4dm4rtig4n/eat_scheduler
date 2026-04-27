"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChefHat,
  Clock,
  Plus,
  Search,
  Star,
  Users,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeFilterChips } from "@/components/recipe-filter-chips";
import {
  applyRecipeFilters,
  emptyRecipeFilters,
  activeFilterCount,
} from "@/lib/recipe-filters";
import {
  PREFERENCE_EMOJI,
  activeDinerKeys,
  dinerInitials,
  dinerLabel,
  dinerColorBg,
  type Diner,
  type Preference,
} from "@/lib/diners";
import { useDiners } from "@/components/diners-provider";
import { SEASON_EMOJI, SEASON_LABELS, SEASON_COLORS } from "@/lib/seasons";
import { DAY_LABELS_SHORT, type DayOfWeek } from "@/lib/days";
import { cn } from "@/lib/utils";
import type { RecipeWithDetails } from "@/lib/db/recipes";

/**
 * Génère un label compact des restrictions de slots.
 * Ex : "Sam, Dim soir" si tous les slots sont uniquement le soir et concernent samedi+dimanche.
 *      "5 créneaux" sinon (résumé).
 */
function summarizeAllowedSlots(
  slots: RecipeWithDetails["allowedSlots"]
): string | null {
  if (slots.length === 0) return null;

  const lunchDays = new Set<DayOfWeek>();
  const dinnerDays = new Set<DayOfWeek>();
  for (const s of slots) {
    if (s.mealType === "lunch") lunchDays.add(s.dayOfWeek);
    else dinnerDays.add(s.dayOfWeek);
  }

  const fmtDays = (set: Set<DayOfWeek>) =>
    [...set]
      .sort((a, b) => a - b)
      .map((d) => DAY_LABELS_SHORT[d])
      .join(", ");

  if (lunchDays.size === 0 && dinnerDays.size > 0) {
    return `${fmtDays(dinnerDays)} soir`;
  }
  if (dinnerDays.size === 0 && lunchDays.size > 0) {
    return `${fmtDays(lunchDays)} midi`;
  }
  // Cas mixte : on résume
  return `${slots.length} créneaux`;
}

export function RecipesBrowser({ recipes }: { recipes: RecipeWithDetails[] }) {
  const [filters, setFilters] = useState(emptyRecipeFilters);

  const filtered = useMemo(
    () => applyRecipeFilters(recipes, filters),
    [recipes, filters]
  );

  const active = activeFilterCount(filters);
  const hasQuery = filters.search.trim().length > 0 || active > 0;

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="space-y-3 sticky top-[57px] bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 z-20 -mx-4 px-4 py-2 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Rechercher une recette…"
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            className="w-full h-11 rounded-lg border border-border bg-card pl-10 pr-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <RecipeFilterChips filters={filters} onChange={setFilters} />
        {hasQuery && (
          <p className="text-xs text-muted-foreground px-0.5">
            {filtered.length} sur {recipes.length} recette
            {recipes.length > 1 ? "s" : ""}
            {active > 0 && " · filtres actifs"}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyResults
          hasQuery={hasQuery}
          onReset={() => setFilters(emptyRecipeFilters())}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: RecipeWithDetails }) {
  const dinersConfig = useDiners();
  const dinerKeys = activeDinerKeys(dinersConfig);
  const prefByDiner = new Map<Diner, Preference>(
    recipe.preferences.map((p) => [p.diner, p.preference])
  );
  const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

  return (
    <Link
      href={`/recipes/${recipe.id}/edit`}
      className="group block bg-card border border-border rounded-[var(--radius-lg)] p-4 shadow-soft hover:shadow-lift hover:border-border-strong active:translate-y-px transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        <RecipeThumbnail recipe={recipe} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="font-bold text-base flex-1 leading-snug group-hover:text-primary transition-colors">
              {recipe.name}
            </h2>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium shrink-0",
                SEASON_COLORS[recipe.season]
              )}
              title={SEASON_LABELS[recipe.season]}
            >
              <span>{SEASON_EMOJI[recipe.season]}</span>
              <span className="hidden sm:inline">{SEASON_LABELS[recipe.season]}</span>
            </span>
          </div>

          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {recipe.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {recipe.servings} pers.
            </span>
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {totalTime} min
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <ChefHat className="size-3.5" />
              {recipe.ingredients.length} ingr.
            </span>
            {summarizeAllowedSlots(recipe.allowedSlots) && (
              <span className="inline-flex items-center gap-1 text-primary font-medium">
                <CalendarRange className="size-3.5" />
                {summarizeAllowedSlots(recipe.allowedSlots)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          {dinerKeys.map((d) => {
            const pref = prefByDiner.get(d) ?? "like";
            return (
              <span
                key={d}
                className="inline-flex items-center gap-0.5"
                title={`${dinerLabel(dinersConfig, d)} : ${pref}`}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold text-white ring-2 ring-card",
                    dinerColorBg(dinersConfig, d)
                  )}
                >
                  {dinerInitials(dinersConfig, d)}
                </span>
                <span className="text-sm leading-none">
                  {PREFERENCE_EMOJI[pref]}
                </span>
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={cn(
                "size-3.5",
                i < recipe.weight
                  ? "fill-gold text-gold"
                  : "text-border-strong"
              )}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}

function RecipeThumbnail({ recipe }: { recipe: RecipeWithDetails }) {
  if (recipe.imageUrl) {
    return (
      <div className="relative size-16 sm:size-20 shrink-0 rounded-md overflow-hidden bg-muted ring-1 ring-border">
        <Image
          src={recipe.imageUrl}
          alt={recipe.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div className="size-16 sm:size-20 shrink-0 rounded-md bg-primary-soft ring-1 ring-border flex items-center justify-center">
      <ChefHat className="size-7 text-primary/70" />
    </div>
  );
}

function EmptyResults({
  hasQuery,
  onReset,
}: {
  hasQuery: boolean;
  onReset: () => void;
}) {
  if (hasQuery) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-4xl mb-3">🔎</p>
        <p className="font-semibold mb-1">Aucune recette trouvée</p>
        <p className="text-sm text-muted-foreground mb-4">
          Essaie d'ajuster ta recherche ou tes filtres.
        </p>
        <Button variant="outline" size="md" onClick={onReset}>
          Réinitialiser
        </Button>
      </div>
    );
  }
  return (
    <div className="text-center py-16 px-6">
      <span className="inline-flex items-center justify-center size-20 rounded-full bg-primary-soft mb-5 shadow-soft">
        <ChefHat className="size-10 text-primary" />
      </span>
      <h2 className="font-bold text-lg mb-1">Ton carnet est vide</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Ajoute tes premières recettes pour commencer à planifier tes repas.
      </p>
      <Link href="/recipes/new">
        <Button size="lg">
          <Plus className="size-4" />
          Créer une recette
        </Button>
      </Link>
    </div>
  );
}
