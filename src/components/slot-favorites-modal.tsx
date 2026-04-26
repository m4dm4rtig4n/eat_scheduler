"use client";

import { useEffect, useState } from "react";
import { X, Star, Search, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DAYS_OF_WEEK,
  DAY_LABELS,
  DAY_LABELS_SHORT,
  type DayOfWeek,
} from "@/lib/days";
import type { RecipeWithDetails } from "@/lib/db/recipes";
import type { SlotFavorite, MealType } from "@/lib/db/slot-favorites";

const MEAL_TYPES: MealType[] = ["lunch", "dinner"];
const MEAL_LABELS: Record<MealType, string> = { lunch: "Midi", dinner: "Soir" };

type SlotKey = `${DayOfWeek}|${MealType}`;

function key(day: DayOfWeek, meal: MealType): SlotKey {
  return `${day}|${meal}`;
}

export function SlotFavoritesModal({
  recipes,
  onClose,
}: {
  recipes: RecipeWithDetails[];
  onClose: () => void;
}) {
  const [favorites, setFavorites] = useState<Map<SlotKey, Set<number>>>(
    new Map()
  );
  const [editing, setEditing] = useState<{
    day: DayOfWeek;
    meal: MealType;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/slot-favorites")
      .then((r) => r.json())
      .then((data: SlotFavorite[]) => {
        const map = new Map<SlotKey, Set<number>>();
        for (const f of data) {
          const k = key(f.dayOfWeek, f.mealType);
          if (!map.has(k)) map.set(k, new Set());
          map.get(k)!.add(f.recipeId);
        }
        setFavorites(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  const saveSlot = async (
    day: DayOfWeek,
    meal: MealType,
    recipeIds: number[]
  ) => {
    setFavorites((curr) => {
      const next = new Map(curr);
      next.set(key(day, meal), new Set(recipeIds));
      return next;
    });
    await fetch("/api/slot-favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: day,
        mealType: meal,
        recipeIds,
      }),
    });
  };

  if (editing) {
    const current = favorites.get(key(editing.day, editing.meal)) ?? new Set();
    return (
      <SlotEditor
        recipes={recipes}
        day={editing.day}
        meal={editing.meal}
        selectedIds={current}
        onBack={() => setEditing(null)}
        onSave={(ids) => {
          saveSlot(editing.day, editing.meal, ids);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="size-5 text-amber-500" />
            <h3 className="font-semibold text-lg">Favoris hebdo</h3>
          </div>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          Choisis tes recettes favorites pour chaque jour. Elles seront
          privilégiées lors de la génération.
        </div>
        <div className="overflow-y-auto p-2">
          {loading ? (
            <p className="text-center py-8 text-sm text-muted-foreground">
              Chargement…
            </p>
          ) : (
            <ul className="space-y-2">
              {DAYS_OF_WEEK.map((day) => (
                <li
                  key={day}
                  className="bg-background border border-border rounded-lg p-2"
                >
                  <p className="text-sm font-medium mb-2 px-1">
                    {DAY_LABELS[day]}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {MEAL_TYPES.map((meal) => {
                      const ids = favorites.get(key(day, meal)) ?? new Set();
                      const names = Array.from(ids)
                        .map((id) => recipeById.get(id)?.name)
                        .filter(Boolean) as string[];
                      return (
                        <button
                          key={meal}
                          onClick={() => setEditing({ day, meal })}
                          className="text-left rounded border border-border p-2 hover:bg-muted transition-colors min-h-16"
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {MEAL_LABELS[meal]}
                          </p>
                          {names.length === 0 ? (
                            <p className="text-xs text-muted-foreground/70">
                              + ajouter
                            </p>
                          ) : (
                            <ul className="text-xs space-y-0.5">
                              {names.slice(0, 3).map((n) => (
                                <li key={n} className="truncate">
                                  ⭐ {n}
                                </li>
                              ))}
                              {names.length > 3 && (
                                <li className="text-muted-foreground">
                                  +{names.length - 3} autres
                                </li>
                              )}
                            </ul>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotEditor({
  recipes,
  day,
  meal,
  selectedIds,
  onBack,
  onSave,
}: {
  recipes: RecipeWithDetails[];
  day: DayOfWeek;
  meal: MealType;
  selectedIds: Set<number>;
  onBack: () => void;
  onSave: (ids: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(selectedIds));
  const [search, setSearch] = useState("");

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) => {
    setSelected((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
              Retour
            </button>
            <p className="text-sm font-medium">
              {DAY_LABELS_SHORT[day]} · {MEAL_LABELS[meal]}
            </p>
            <Button
              size="sm"
              onClick={() => onSave(Array.from(selected))}
            >
              Enregistrer
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher une recette…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm"
            />
          </div>
        </div>
        <ul className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <li className="text-center py-8 text-sm text-muted-foreground">
              Aucune recette
            </li>
          ) : (
            filtered.map((r) => {
              const isSelected = selected.has(r.id);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => toggle(r.id)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                      isSelected
                        ? "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                        : "hover:bg-muted active:bg-muted/70"
                    )}
                  >
                    <span
                      className={cn(
                        "size-6 rounded-full border-2 flex items-center justify-center shrink-0",
                        isSelected
                          ? "bg-amber-400 border-amber-400"
                          : "border-border"
                      )}
                    >
                      {isSelected && (
                        <Star className="size-3 fill-white text-white" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.servings} pers · {r.ingredients.length} ingr
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
