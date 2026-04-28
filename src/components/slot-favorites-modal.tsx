"use client";

import { useEffect, useState } from "react";
import { X, Star, Pin, Search, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DAYS_OF_WEEK,
  DAY_LABELS,
  DAY_LABELS_SHORT,
  type DayOfWeek,
} from "@/lib/days";
import type { RecipeWithDetails } from "@/lib/db/recipes";
import type {
  SlotFavorite,
  MealType,
  SlotFavoriteEntry,
} from "@/lib/db/slot-favorites";

const MEAL_TYPES: MealType[] = ["lunch", "dinner"];
const MEAL_LABELS: Record<MealType, string> = { lunch: "Midi", dinner: "Soir" };

type SlotKey = `${DayOfWeek}|${MealType}`;
type EntryMap = Map<number, boolean>; // recipeId → pinned

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
  const [favorites, setFavorites] = useState<Map<SlotKey, EntryMap>>(new Map());
  const [editing, setEditing] = useState<{
    day: DayOfWeek;
    meal: MealType;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/slot-favorites")
      .then((r) => r.json())
      .then((data: SlotFavorite[]) => {
        const map = new Map<SlotKey, EntryMap>();
        for (const f of data) {
          const k = key(f.dayOfWeek, f.mealType);
          if (!map.has(k)) map.set(k, new Map());
          map.get(k)!.set(f.recipeId, Boolean(f.pinned));
        }
        setFavorites(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  const saveSlot = async (
    day: DayOfWeek,
    meal: MealType,
    entries: SlotFavoriteEntry[]
  ) => {
    const entryMap: EntryMap = new Map(
      entries.map((e) => [e.recipeId, e.pinned])
    );
    setFavorites((curr) => {
      const next = new Map(curr);
      next.set(key(day, meal), entryMap);
      return next;
    });
    await fetch("/api/slot-favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek: day,
        mealType: meal,
        entries,
      }),
    });
  };

  if (editing) {
    const current = favorites.get(key(editing.day, editing.meal)) ?? new Map();
    return (
      <SlotEditor
        recipes={recipes}
        day={editing.day}
        meal={editing.meal}
        currentEntries={current}
        onBack={() => setEditing(null)}
        onSave={(entries) => {
          saveSlot(editing.day, editing.meal, entries);
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
        className="bg-card w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col"
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
        <div className="px-4 py-2 text-xs text-muted-foreground space-y-1">
          <p>
            <Star className="inline size-3 fill-amber-400 text-amber-500" /> Favori : recette privilégiée (boost ×3 au tirage).
          </p>
          <p>
            <Pin className="inline size-3 text-primary" /> Épinglé : recette imposée (toujours placée sur ce slot).
          </p>
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
                      const entries =
                        favorites.get(key(day, meal)) ?? new Map();
                      const list = Array.from(entries.entries())
                        .map(([id, pinned]) => {
                          const recipe = recipeById.get(id);
                          return recipe
                            ? { name: recipe.name, pinned }
                            : null;
                        })
                        .filter((x): x is { name: string; pinned: boolean } => x !== null);
                      return (
                        <button
                          key={meal}
                          onClick={() => setEditing({ day, meal })}
                          className="text-left rounded border border-border p-2 hover:bg-muted transition-colors min-h-16"
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {MEAL_LABELS[meal]}
                          </p>
                          {list.length === 0 ? (
                            <p className="text-xs text-muted-foreground/70">
                              + ajouter
                            </p>
                          ) : (
                            <ul className="text-xs space-y-0.5">
                              {list.slice(0, 3).map((item) => (
                                <li
                                  key={item.name}
                                  className="truncate flex items-center gap-1"
                                >
                                  {item.pinned ? (
                                    <Pin className="size-3 text-primary shrink-0" />
                                  ) : (
                                    <Star className="size-3 fill-amber-400 text-amber-500 shrink-0" />
                                  )}
                                  <span className="truncate">{item.name}</span>
                                </li>
                              ))}
                              {list.length > 3 && (
                                <li className="text-muted-foreground">
                                  +{list.length - 3} autres
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

type EntryState = "none" | "favorite" | "pinned";

function getEntryState(entries: EntryMap, id: number): EntryState {
  if (!entries.has(id)) return "none";
  return entries.get(id) ? "pinned" : "favorite";
}

function SlotEditor({
  recipes,
  day,
  meal,
  currentEntries,
  onBack,
  onSave,
}: {
  recipes: RecipeWithDetails[];
  day: DayOfWeek;
  meal: MealType;
  currentEntries: EntryMap;
  onBack: () => void;
  onSave: (entries: SlotFavoriteEntry[]) => void;
}) {
  const [entries, setEntries] = useState<EntryMap>(new Map(currentEntries));
  const [search, setSearch] = useState("");

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Cycle : none → favorite → pinned → none
  const cycle = (id: number) => {
    setEntries((curr) => {
      const next = new Map(curr);
      const state = getEntryState(curr, id);
      if (state === "none") next.set(id, false); // → favorite
      else if (state === "favorite") next.set(id, true); // → pinned
      else next.delete(id); // → none
      return next;
    });
  };

  const handleSave = () => {
    const out: SlotFavoriteEntry[] = Array.from(entries.entries()).map(
      ([recipeId, pinned]) => ({ recipeId, pinned })
    );
    onSave(out);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-card w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col">
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
            <Button size="sm" onClick={handleSave}>
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
          <p className="text-xs text-muted-foreground mt-2 px-0.5">
            Tape sur une recette pour cycler : neutre → favori → épinglé
          </p>
        </div>
        <ul className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <li className="text-center py-8 text-sm text-muted-foreground">
              Aucune recette
            </li>
          ) : (
            filtered.map((r) => {
              const state = getEntryState(entries, r.id);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => cycle(r.id)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                      state === "favorite" &&
                        "bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50",
                      state === "pinned" &&
                        "bg-primary/10 hover:bg-primary/15",
                      state === "none" && "hover:bg-muted active:bg-muted/70"
                    )}
                  >
                    <span
                      className={cn(
                        "size-7 rounded-full border-2 flex items-center justify-center shrink-0",
                        state === "favorite" &&
                          "bg-amber-400 border-amber-400 text-white",
                        state === "pinned" &&
                          "bg-primary border-primary text-primary-foreground",
                        state === "none" && "border-border"
                      )}
                    >
                      {state === "favorite" && (
                        <Star className="size-3.5 fill-white" />
                      )}
                      {state === "pinned" && <Pin className="size-3.5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.servings} pers · {r.ingredients.length} ingr
                        {state === "favorite" && (
                          <span className="ml-1 text-amber-600">· Favori</span>
                        )}
                        {state === "pinned" && (
                          <span className="ml-1 text-primary font-medium">
                            · Épinglé
                          </span>
                        )}
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
