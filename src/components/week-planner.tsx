"use client";

import { useState, useTransition, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  X,
  Sparkles,
  Loader2,
  Star,
} from "lucide-react";
import { SlotFavoritesModal } from "@/components/slot-favorites-modal";
import { Button } from "@/components/ui/button";
import {
  addDays,
  formatDateISO,
  startOfWeek,
  formatDayShortFR,
  cn,
} from "@/lib/utils";
import {
  DINERS,
  DINER_INITIALS,
  DINER_COLORS,
  DINER_LABELS,
  type Diner,
} from "@/lib/diners";
import type { PlannedMealWithRecipe } from "@/lib/db/meals";
import type { RecipeWithDetails } from "@/lib/db/recipes";

type MealSlot = "lunch" | "dinner";

const MEAL_LABELS: Record<MealSlot, string> = {
  lunch: "Midi",
  dinner: "Soir",
};

export function WeekPlanner({
  recipes,
  initialMeals,
  initialWeekStart,
}: {
  recipes: RecipeWithDetails[];
  initialMeals: PlannedMealWithRecipe[];
  initialWeekStart: string;
}) {
  const [weekStart, setWeekStart] = useState(() => new Date(initialWeekStart));
  const [meals, setMeals] = useState(initialMeals);
  const [picker, setPicker] = useState<{
    date: string;
    mealType: MealSlot;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const start = formatDateISO(weekStart);
    const end = formatDateISO(addDays(weekStart, 6));
    fetch(`/api/meals?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then(setMeals)
      .catch(() => {});
  }, [weekStart]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const findMeals = (date: string, mealType: MealSlot) =>
    meals.filter((m) => m.date === date && m.mealType === mealType);

  const refresh = async () => {
    const start = formatDateISO(weekStart);
    const end = formatDateISO(addDays(weekStart, 6));
    const r = await fetch(`/api/meals?start=${start}&end=${end}`);
    setMeals(await r.json());
  };

  const assignRecipe = (recipeId: number) => {
    if (!picker) return;
    startTransition(async () => {
      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: picker.date,
          mealType: picker.mealType,
          recipeId,
          servingsMultiplier: 1,
          diners: [...DINERS],
        }),
      });
      setPicker(null);
      refresh();
    });
  };

  const updateMultiplier = (mealId: number, delta: number) => {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    const next = Math.max(
      0.5,
      Math.round((meal.servingsMultiplier + delta) * 2) / 2
    );
    setMeals((curr) =>
      curr.map((m) => (m.id === mealId ? { ...m, servingsMultiplier: next } : m))
    );
    fetch(`/api/meals/${mealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servingsMultiplier: next }),
    });
  };

  const removeMeal = (mealId: number) => {
    setMeals((curr) => curr.filter((m) => m.id !== mealId));
    fetch(`/api/meals/${mealId}`, { method: "DELETE" });
  };

  const generate = async (mode: "fill" | "replace") => {
    setGenerating(true);
    setGenerateOpen(false);
    try {
      const start = formatDateISO(weekStart);
      const end = formatDateISO(addDays(weekStart, 6));
      const res = await fetch("/api/meals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start,
          endDate: end,
          mode,
          mealTypes: ["lunch", "dinner"],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Erreur lors de la génération");
        return;
      }
      await refresh();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">
            Semaine du {weekStart.getDate()}{" "}
            {weekStart.toLocaleDateString("fr-FR", { month: "short" })}
          </p>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="text-xs text-primary hover:underline"
          >
            Aujourd'hui
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekStart((d) => addDays(d, 7))}
          aria-label="Semaine suivante"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          onClick={() => setGenerateOpen(true)}
          disabled={generating || recipes.length === 0}
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Générer la semaine
        </Button>
        <Button
          variant="outline"
          size="md"
          onClick={() => setFavoritesOpen(true)}
          disabled={recipes.length === 0}
          aria-label="Favoris hebdo"
          title="Favoris hebdo"
        >
          <Star className="size-4" />
        </Button>
      </div>

      <ul className="space-y-3">
        {days.map((day) => {
          const dateISO = formatDateISO(day);
          const isToday = formatDateISO(new Date()) === dateISO;
          return (
            <li
              key={dateISO}
              className={cn(
                "rounded-xl border p-3",
                isToday
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <p className="text-sm font-medium capitalize mb-2">
                {formatDayShortFR(day)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["lunch", "dinner"] as MealSlot[]).map((slot) => {
                  const slotMeals = findMeals(dateISO, slot);
                  return (
                    <div
                      key={slot}
                      className="bg-background border border-border rounded-lg p-2 min-h-20"
                    >
                      <p className="text-xs text-muted-foreground mb-1.5">
                        {MEAL_LABELS[slot]}
                      </p>
                      {slotMeals.length > 0 ? (
                        <div className="space-y-1.5">
                          {slotMeals.map((meal) => (
                            <MealCard
                              key={meal.id}
                              meal={meal}
                              onIncrement={() => updateMultiplier(meal.id, 0.5)}
                              onDecrement={() => updateMultiplier(meal.id, -0.5)}
                              onRemove={() => removeMeal(meal.id)}
                            />
                          ))}
                          <button
                            onClick={() =>
                              setPicker({ date: dateISO, mealType: slot })
                            }
                            className="w-full flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          >
                            <Plus className="size-3" />
                            Ajouter un plat
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setPicker({ date: dateISO, mealType: slot })
                          }
                          className="w-full h-full min-h-12 flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Plus className="size-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {picker && (
        <RecipePicker
          recipes={recipes}
          onSelect={assignRecipe}
          onClose={() => setPicker(null)}
          slotLabel={`${MEAL_LABELS[picker.mealType]}, ${new Date(
            picker.date
          ).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}`}
        />
      )}

      {generateOpen && (
        <GenerateDialog
          onCancel={() => setGenerateOpen(false)}
          onConfirm={generate}
        />
      )}

      {favoritesOpen && (
        <SlotFavoritesModal
          recipes={recipes}
          onClose={() => setFavoritesOpen(false)}
        />
      )}
    </div>
  );
}

function DinerBadges({ diners }: { diners: Diner[] }) {
  const isAll = diners.length === DINERS.length;
  if (isAll) return null;
  return (
    <div className="flex gap-0.5">
      {diners.map((d) => (
        <span
          key={d}
          title={DINER_LABELS[d]}
          className={cn(
            "inline-flex items-center justify-center size-4 rounded-full text-[9px] font-bold text-white",
            DINER_COLORS[d]
          )}
        >
          {DINER_INITIALS[d]}
        </span>
      ))}
    </div>
  );
}

function MealCard({
  meal,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  meal: PlannedMealWithRecipe;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const totalServings = (
    meal.recipe.servings * meal.servingsMultiplier
  ).toFixed(meal.servingsMultiplier % 1 === 0 ? 0 : 1);

  return (
    <div className="space-y-1 bg-card border border-border rounded p-1.5">
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">
          {meal.recipe.name}
        </p>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-600 shrink-0"
          aria-label="Retirer"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={onDecrement}
            className="size-5 rounded bg-muted hover:bg-muted/70 flex items-center justify-center"
            aria-label="Moins"
          >
            <Minus className="size-3" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums px-0.5">
            {totalServings}
          </span>
          <button
            onClick={onIncrement}
            className="size-5 rounded bg-muted hover:bg-muted/70 flex items-center justify-center"
            aria-label="Plus"
          >
            <Plus className="size-3" />
          </button>
        </div>
        <DinerBadges diners={meal.diners} />
      </div>
    </div>
  );
}

function RecipePicker({
  recipes,
  onSelect,
  onClose,
  slotLabel,
}: {
  recipes: RecipeWithDetails[];
  onSelect: (id: number) => void;
  onClose: () => void;
  slotLabel: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground capitalize">
              {slotLabel}
            </p>
            <button
              onClick={onClose}
              className="size-8 flex items-center justify-center rounded hover:bg-muted"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Rechercher une recette…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
            autoFocus
          />
        </div>
        <ul className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <li className="text-center py-8 text-sm text-muted-foreground">
              Aucune recette
            </li>
          ) : (
            filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onSelect(r.id)}
                  className="w-full text-left px-3 py-3 rounded-lg hover:bg-muted active:bg-muted/70 transition-colors"
                >
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.servings} pers · {r.ingredients.length} ingrédients
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function GenerateDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (mode: "fill" | "replace") => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card w-full max-w-sm rounded-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Générer la semaine
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            En tenant compte des préférences de chacun.
          </p>
        </div>
        <div className="space-y-2">
          <Button
            variant="primary"
            className="w-full justify-start"
            onClick={() => onConfirm("fill")}
          >
            Compléter les créneaux vides
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onConfirm("replace")}
          >
            Remplacer toute la semaine
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onCancel}
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
