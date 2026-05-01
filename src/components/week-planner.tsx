"use client";

import { useState, useTransition, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  Loader2,
  Star,
  Sun,
  Moon,
  Search,
  Users,
  Clock,
  Pin,
} from "lucide-react";
import { RecipeFilterChips } from "@/components/recipe-filter-chips";
import { Button } from "@/components/ui/button";
import {
  applyRecipeFilters,
  emptyRecipeFilters,
  activeFilterCount,
  type RecipeFilters,
} from "@/lib/recipe-filters";
import { getDayOfWeekFromIso } from "@/lib/days";
import { isRecipeAllowedAtSlot } from "@/lib/recipe-slots";
import {
  addDays,
  formatDateISO,
  startOfWeek,
  cn,
} from "@/lib/utils";
import {
  activeDinerKeys,
  availableDinerKeysForSlot,
  dinerInitials,
  dinerLabel,
  dinerColorBg,
  dinerCoefficient,
  totalShares,
  type Diner,
  type DinerConfig,
} from "@/lib/diners";
import { useDiners } from "@/components/diners-provider";
import { SEASON_EMOJI, SEASON_LABELS } from "@/lib/seasons";
import type { PlannedMealWithRecipe } from "@/lib/db/meals";
import type { RecipeWithDetails } from "@/lib/db/recipes";
import type { SlotFavorite } from "@/lib/db/slot-favorites";

type MealSlot = "lunch" | "dinner";

const SLOT_META: Record<
  MealSlot,
  { label: string; icon: typeof Sun; bg: string; ring: string; iconColor: string }
> = {
  lunch: {
    label: "Midi",
    icon: Sun,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    ring: "ring-amber-200/60 dark:ring-amber-800/40",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  dinner: {
    label: "Soir",
    icon: Moon,
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    ring: "ring-indigo-200/60 dark:ring-indigo-800/40",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
};

const FULL_DAY_NAMES = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export function WeekPlanner({
  recipes,
  initialMeals,
  initialWeekStart,
}: {
  recipes: RecipeWithDetails[];
  initialMeals: PlannedMealWithRecipe[];
  initialWeekStart: string;
}) {
  const dinersConfig = useDiners();
  const dinerKeysActive = activeDinerKeys(dinersConfig);
  const [weekStart, setWeekStart] = useState(() => new Date(initialWeekStart));
  const [meals, setMeals] = useState(initialMeals);
  const [picker, setPicker] = useState<{
    date: string;
    mealType: MealSlot;
    replaceMealId?: number;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [slotFavorites, setSlotFavorites] = useState<SlotFavorite[]>([]);
  const [, startTransition] = useTransition();

  const loadFavorites = () => {
    fetch("/api/slot-favorites")
      .then((r) => r.json())
      .then(setSlotFavorites)
      .catch(() => {});
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  // Index : "{dayOfWeek}|{mealType}|{recipeId}" → pinned
  const pinnedIndex = new Set<string>();
  for (const f of slotFavorites) {
    if (f.pinned) {
      pinnedIndex.add(`${f.dayOfWeek}|${f.mealType}|${f.recipeId}`);
    }
  }
  const isMealPinned = (m: PlannedMealWithRecipe) => {
    const dow = getDayOfWeekFromIso(m.date);
    return pinnedIndex.has(`${dow}|${m.mealType}|${m.recipeId}`);
  };

  useEffect(() => {
    const start = formatDateISO(weekStart);
    const end = formatDateISO(addDays(weekStart, 6));
    fetch(`/api/meals?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then(setMeals)
      .catch(() => {});
  }, [weekStart]);


  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayISO = formatDateISO(new Date());

  // Partition : jours passés (en bas, repliés) vs présent + futurs (en haut)
  const pastDays = days.filter((d) => formatDateISO(d) < todayISO);
  const upcomingDays = days.filter((d) => formatDateISO(d) >= todayISO);

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
      if (picker.replaceMealId) {
        // Remplacement : on garde l'ID du repas, on swappe juste la recette
        // et on remet le multiplier à 1 puisque la nouvelle recette peut
        // avoir un servings différent.
        await fetch(`/api/meals/${picker.replaceMealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId, servingsMultiplier: 1 }),
        });
      } else {
        // Diners déjà occupés par un autre repas du même slot
        const siblings = meals.filter(
          (m) =>
            m.date === picker.date && m.mealType === picker.mealType
        );
        const taken = new Set<Diner>();
        for (const m of siblings) {
          for (const d of m.diners) taken.add(d);
        }
        // Convives disponibles par défaut sur ce slot (jour × midi/soir),
        // selon les indispos récurrentes configurées en réglages.
        const dow = getDayOfWeekFromIso(picker.date);
        const presentByDefault = availableDinerKeysForSlot(
          dinersConfig,
          dinerKeysActive,
          dow,
          picker.mealType
        );
        let availableDiners = presentByDefault.filter((d) => !taken.has(d));
        // Fallback : si tout le monde est déjà pris OU absent par défaut,
        // on prend juste le premier convive actif pour respecter le validator
        // (min 1). L'utilisateur pourra ajuster manuellement.
        if (availableDiners.length === 0 && dinerKeysActive.length > 0) {
          availableDiners = [dinerKeysActive[0]];
        }
        const recipe = recipes.find((r) => r.id === recipeId);
        const shares = totalShares(dinersConfig, availableDiners);
        const servingsMultiplier =
          recipe && recipe.servings > 0 ? shares / recipe.servings : 1;

        // Transfert : retirer ces diners des sibling meals où ils sont déjà
        const toAssign = new Set(availableDiners);
        const siblingPatches: Promise<unknown>[] = [];
        for (const s of siblings) {
          const reduced = s.diners.filter((d) => !toAssign.has(d));
          if (reduced.length === s.diners.length) continue; // rien à retirer
          if (reduced.length === 0) continue; // ne pas vider le sibling
          const orderedReduced = dinerKeysActive.filter((d) =>
            reduced.includes(d)
          );
          const sShares = totalShares(dinersConfig, orderedReduced);
          siblingPatches.push(
            fetch(`/api/meals/${s.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                diners: orderedReduced,
                servingsMultiplier: sShares / s.recipe.servings,
              }),
            })
          );
        }

        await Promise.all([
          ...siblingPatches,
          fetch("/api/meals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: picker.date,
              mealType: picker.mealType,
              recipeId,
              servingsMultiplier,
              diners: availableDiners,
            }),
          }),
        ]);
      }
      setPicker(null);
      refresh();
    });
  };

  // Toggle un convive sur un repas. Le multiplier est dérivé des coefs.
  // Si on ajoute un convive, on le retire automatiquement des autres repas du
  // même slot (un convive ne mange qu'à un endroit pour un service donné).
  const toggleDiner = (mealId: number, diner: Diner) => {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    const isPresent = meal.diners.includes(diner);

    // Calcul du nouvel état pour ce repas
    const nextDinersThis = isPresent
      ? meal.diners.filter((d) => d !== diner)
      : [...meal.diners, diner];
    const orderedThis = dinerKeysActive.filter((d) =>
      nextDinersThis.includes(d)
    );
    if (orderedThis.length === 0) return; // au moins un convive
    const sharesThis = totalShares(dinersConfig, orderedThis);
    const multiplierThis = sharesThis / meal.recipe.servings;

    // Repas sœurs : autres plats du même slot dont on doit retirer ce convive
    // (uniquement quand on ajoute, pas quand on retire)
    type Update = {
      id: number;
      diners: Diner[];
      servingsMultiplier: number;
    };
    const updates: Update[] = [
      { id: mealId, diners: orderedThis, servingsMultiplier: multiplierThis },
    ];

    if (!isPresent) {
      const siblings = meals.filter(
        (m) =>
          m.id !== mealId &&
          m.date === meal.date &&
          m.mealType === meal.mealType &&
          m.diners.includes(diner)
      );
      for (const s of siblings) {
        const reduced = s.diners.filter((d) => d !== diner);
        if (reduced.length === 0) continue; // on n'enlève pas le dernier convive
        const ordered = dinerKeysActive.filter((d) => reduced.includes(d));
        const shares = totalShares(dinersConfig, ordered);
        updates.push({
          id: s.id,
          diners: ordered,
          servingsMultiplier: shares / s.recipe.servings,
        });
      }
    }

    // Optimistic update
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    setMeals((curr) =>
      curr.map((m) => {
        const u = updateMap.get(m.id);
        return u
          ? { ...m, diners: u.diners, servingsMultiplier: u.servingsMultiplier }
          : m;
      })
    );

    // Envoi des PATCH en parallèle
    for (const u of updates) {
      fetch(`/api/meals/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diners: u.diners,
          servingsMultiplier: u.servingsMultiplier,
        }),
      });
    }
  };

  const removeMeal = (mealId: number) => {
    setMeals((curr) => curr.filter((m) => m.id !== mealId));
    fetch(`/api/meals/${mealId}`, { method: "DELETE" });
  };

  const [regeneratingSlot, setRegeneratingSlot] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const regenerateSlot = async (date: string, mealType: MealSlot) => {
    const slotKey = `${date}|${mealType}`;
    setRegeneratingSlot(slotKey);
    // On exclut explicitement les recettes actuelles du slot pour forcer
    // le tirage à proposer autre chose. Sinon le générateur peut retomber
    // sur la même recette à cause du tirage pondéré sur top-K.
    const excludeRecipeIds = meals
      .filter((m) => m.date === date && m.mealType === mealType)
      .map((m) => m.recipeId);
    try {
      const res = await fetch("/api/meals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: date,
          endDate: date,
          mode: "replace",
          mealTypes: [mealType],
          excludeRecipeIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Erreur lors de la régénération");
        return;
      }
      await refresh();
    } finally {
      setRegeneratingSlot(null);
    }
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

  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekRangeLabel = sameMonth
    ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("fr-FR", { month: "long" })}`
    : `${weekStart.getDate()} ${weekStart.toLocaleDateString("fr-FR", { month: "short" })} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("fr-FR", { month: "short" })}`;

  // Détection des "raccourcis" pour mettre en évidence la card active
  const currentWeekStart = startOfWeek(new Date());
  const nextWeekStart = addDays(currentWeekStart, 7);
  const currentWeekStartISO = formatDateISO(currentWeekStart);
  const weekStartISO = formatDateISO(weekStart);
  const isCurrentWeek = weekStartISO === currentWeekStartISO;
  const isNextWeek = weekStartISO === formatDateISO(nextWeekStart);

  const formatWeekRange = (start: Date) => {
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    return sameMonth
      ? `${start.getDate()} – ${end.getDate()} ${end.toLocaleDateString("fr-FR", { month: "short" })}`
      : `${start.getDate()} ${start.toLocaleDateString("fr-FR", { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString("fr-FR", { month: "short" })}`;
  };
  const currentWeekRange = formatWeekRange(currentWeekStart);
  const nextWeekRange = formatWeekRange(nextWeekStart);

  const totalMeals = meals.length;
  const filledSlots = new Set(meals.map((m) => `${m.date}-${m.mealType}`)).size;

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between gap-2 mb-4 bg-card-warm rounded-[var(--radius-lg)] px-2 py-3 border border-border shadow-soft">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekStart((d) => addDays(d, -7))}
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="text-center flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-0.5">
            Semaine
          </p>
          <p className="text-lg font-black capitalize leading-tight tracking-tight truncate">
            {weekRangeLabel}
          </p>
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

      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
        <button
          type="button"
          onClick={() => setWeekStart(currentWeekStart)}
          aria-pressed={isCurrentWeek}
          className={cn(
            "rounded-[var(--radius-lg)] px-3 py-2.5 text-center transition-all border shadow-soft",
            isCurrentWeek
              ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground border-primary shadow-lift"
              : "bg-card-warm border-border hover:border-border-strong hover:bg-card"
          )}
        >
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.18em]",
              isCurrentWeek ? "opacity-90" : "text-primary"
            )}
          >
            Cette semaine
          </p>
          <p className="text-sm font-bold tracking-tight truncate mt-0.5">
            {currentWeekRange}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(nextWeekStart)}
          aria-pressed={isNextWeek}
          className={cn(
            "rounded-[var(--radius-lg)] px-3 py-2.5 text-center transition-all border shadow-soft",
            isNextWeek
              ? "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground border-primary shadow-lift"
              : "bg-card-warm border-border hover:border-border-strong hover:bg-card"
          )}
        >
          <p
            className={cn(
              "text-[10px] font-bold uppercase tracking-[0.18em]",
              isNextWeek ? "opacity-90" : "text-primary"
            )}
          >
            Semaine prochaine
          </p>
          <p className="text-sm font-bold tracking-tight truncate mt-0.5">
            {nextWeekRange}
          </p>
        </button>
      </div>

      {totalMeals > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground px-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary"></span>
            {filledSlots} créneaux planifiés
          </span>
          <span>·</span>
          <span>{totalMeals} repas</span>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        <Button
          variant="primary"
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
      </div>

      <ul className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-7 lg:grid-rows-[auto_auto_auto] lg:gap-3">
        {/* Desktop : 7 jours sur une ligne (passés inclus, grisés).
            Mobile : seulement upcomingDays — les passés vont dans la section repliable plus bas. */}
        {days.map((day) => {
          const dateISO = formatDateISO(day);
          const isToday = todayISO === dateISO;
          const isPast = dateISO < todayISO;
          const isUpcoming = !isPast;
          const dayName = FULL_DAY_NAMES[day.getDay()];
          return (
            <li
              key={dateISO}
              className={cn(
                "rounded-[var(--radius-lg)] overflow-hidden transition-all",
                // Sur mobile : flex column simple. Sur desktop : subgrid sur 3 lignes
                // (header, midi, soir) — toutes les cards partagent le même rythme
                // vertical, donc les blocs Soir s'alignent peu importe la quantité
                // de plats au midi.
                "lg:grid lg:grid-rows-subgrid lg:row-span-3",
                isToday
                  ? "bg-card shadow-lift ring-2 ring-primary/40"
                  : "bg-card border border-border shadow-soft",
                // Sur mobile (default) : on cache les jours passés (gérés par la section repliable)
                !isUpcoming && "hidden lg:grid",
                // Sur desktop : les jours passés sont grisés
                isPast && "lg:opacity-60 lg:saturate-50"
              )}
            >
              {/* Header compact desktop : 1 ligne "Lun 4 mai" */}
              <div
                className={cn(
                  "hidden lg:flex items-baseline gap-1.5 px-3 py-2.5",
                  isToday
                    ? "bg-gradient-to-r from-primary to-primary-hover text-primary-foreground"
                    : "bg-card-warm border-b border-border"
                )}
              >
                <span
                  className={cn(
                    "font-black text-base tracking-tight capitalize truncate",
                    isToday ? "text-primary-foreground" : "text-foreground"
                  )}
                >
                  {day.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums truncate",
                    isToday ? "opacity-90" : "text-muted-foreground"
                  )}
                >
                  {day.getDate()}{" "}
                  {day
                    .toLocaleDateString("fr-FR", { month: "short" })
                    .replace(".", "")}
                </span>
              </div>

              {/* Header détaillé mobile+tablette : badge date + nom du jour */}
              <div
                className={cn(
                  "relative flex lg:hidden items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3.5",
                  isToday
                    ? "bg-gradient-to-r from-primary to-primary-hover text-primary-foreground"
                    : "bg-card-warm border-b border-border"
                )}
              >
                <div
                  className={cn(
                    "flex flex-col items-center justify-center size-12 sm:size-16 rounded-xl sm:rounded-2xl shrink-0 leading-none shadow-soft",
                    isToday
                      ? "bg-white/25 backdrop-blur ring-2 ring-white/40"
                      : "bg-background border border-border-strong"
                  )}
                >
                  <span
                    className={cn(
                      "text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] leading-none",
                      isToday ? "opacity-90" : "text-primary"
                    )}
                  >
                    {day.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
                  </span>
                  <span className="text-xl sm:text-3xl font-black tabular-nums leading-none mt-0.5 sm:mt-1">
                    {day.getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-black text-lg sm:text-2xl leading-tight tracking-tight capitalize truncate",
                      isToday ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {dayName}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold mt-0.5 truncate",
                      isToday ? "opacity-80" : "text-muted-foreground"
                    )}
                  >
                    {day.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-3 lg:gap-2 lg:p-2 lg:grid lg:grid-rows-subgrid lg:row-span-2">
                {(["lunch", "dinner"] as MealSlot[]).map((slot) => {
                  const slotMeals = findMeals(dateISO, slot);
                  const meta = SLOT_META[slot];
                  const SlotIcon = meta.icon;
                  return (
                    <section
                      key={slot}
                      aria-labelledby={`slot-${dateISO}-${slot}`}
                      className={cn(
                        "rounded-[var(--radius-lg)] border overflow-hidden flex flex-col",
                        // Sur desktop, étire la section pour remplir la row du
                        // subgrid parent → frontières Midi/Soir alignées entre cards.
                        "lg:h-full",
                        meta.bg,
                        "border-transparent ring-1",
                        meta.ring
                      )}
                    >
                      <header
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card/40 backdrop-blur-sm"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center size-7 rounded-full ring-1 bg-card",
                            meta.ring
                          )}
                        >
                          <SlotIcon
                            className={cn("size-3.5", meta.iconColor)}
                            strokeWidth={2.4}
                          />
                        </div>
                        <span
                          id={`slot-${dateISO}-${slot}`}
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-[0.18em]",
                            meta.iconColor
                          )}
                        >
                          {meta.label}
                        </span>
                        {slotMeals.length > 0 && (
                          <span className="ml-auto text-[10px] font-semibold text-muted-foreground tabular-nums">
                            {slotMeals.length} plat
                            {slotMeals.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </header>

                      <div className="p-2 sm:p-3 lg:p-2 lg:flex-1 flex flex-col">
                        {slotMeals.length > 0 ? (
                          <div className="space-y-2">
                            {slotMeals.map((meal) => (
                              <MealCard
                                key={meal.id}
                                meal={meal}
                                readOnly={isPast}
                                pinned={isMealPinned(meal)}
                                onReplace={() =>
                                  setPicker({
                                    date: dateISO,
                                    mealType: slot,
                                    replaceMealId: meal.id,
                                  })
                                }
                                onToggleDiner={(d) => toggleDiner(meal.id, d)}
                                onRemove={() => removeMeal(meal.id)}
                              />
                            ))}
                            {!isPast && (
                              <div className="flex gap-1 sm:gap-1.5">
                                <button
                                  onClick={() =>
                                    setPicker({
                                      date: dateISO,
                                      mealType: slot,
                                    })
                                  }
                                  className="flex-1 min-w-0 flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary-soft/40 rounded-lg transition-colors"
                                  aria-label="Ajouter un plat"
                                  title="Ajouter un plat"
                                >
                                  <Plus className="size-3.5 shrink-0" />
                                  <span className="truncate lg:hidden">
                                    Ajouter un plat
                                  </span>
                                </button>
                                <button
                                  onClick={() => regenerateSlot(dateISO, slot)}
                                  disabled={
                                    regeneratingSlot === `${dateISO}|${slot}` ||
                                    recipes.length === 0
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary-soft/40 rounded-lg transition-colors disabled:opacity-50 shrink-0 lg:flex-1"
                                  title="Régénérer ce repas"
                                  aria-label="Régénérer ce repas"
                                >
                                  {regeneratingSlot === `${dateISO}|${slot}` ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="size-3.5" />
                                  )}
                                  <span className="hidden sm:inline lg:hidden">
                                    Régénérer
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : isPast ? (
                          <div className="min-h-14 flex items-center px-3 rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground/60 italic">
                            Aucun plat planifié
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() =>
                                setPicker({ date: dateISO, mealType: slot })
                              }
                              className="group flex-1 h-full min-h-14 flex items-center gap-2 px-3 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary-soft/30 text-muted-foreground hover:text-primary transition-all"
                            >
                              <Plus className="size-4 transition-transform group-hover:rotate-90" />
                              <span className="text-sm">Choisir un plat…</span>
                            </button>
                            <button
                              onClick={() => regenerateSlot(dateISO, slot)}
                              disabled={
                                regeneratingSlot === `${dateISO}|${slot}` ||
                                recipes.length === 0
                              }
                              className="inline-flex items-center justify-center min-h-14 px-3 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary-soft/30 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                              title="Générer un plat pour ce créneau"
                              aria-label="Générer un plat pour ce créneau"
                            >
                              {regeneratingSlot === `${dateISO}|${slot}` ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Sparkles className="size-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {pastDays.length > 0 && (
        <div className="mt-5 lg:hidden">
          <button
            type="button"
            onClick={() => setShowPast((s) => !s)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-border bg-card-warm hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={showPast}
          >
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4" />
              {pastDays.length} jour{pastDays.length > 1 ? "s" : ""} déjà passé
              {pastDays.length > 1 ? "s" : ""}
            </span>
            <ChevronRight
              className={cn(
                "size-4 transition-transform",
                showPast && "rotate-90"
              )}
            />
          </button>

          {showPast && (
            <ul className="space-y-3 mt-3 animate-[fade-in_0.2s_ease-out]">
              {pastDays.map((day) => {
                const dateISO = formatDateISO(day);
                const isPast = true;
                const dayName = FULL_DAY_NAMES[day.getDay()];
                return (
                  <li
                    key={dateISO}
                    className="rounded-[var(--radius-lg)] overflow-hidden bg-card border border-border opacity-70 saturate-75"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                      <div className="flex flex-col items-center justify-center size-12 rounded-xl shrink-0 leading-none bg-background border border-border">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground leading-none">
                          {day.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}
                        </span>
                        <span className="text-xl font-black tabular-nums leading-none mt-0.5 text-muted-foreground">
                          {day.getDate()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base capitalize text-muted-foreground tracking-tight">
                          {dayName}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/70 mt-0.5">
                          {day.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 p-3">
                      {(["lunch", "dinner"] as MealSlot[]).map((slot) => {
                        const slotMeals = findMeals(dateISO, slot);
                        const meta = SLOT_META[slot];
                        const SlotIcon = meta.icon;
                        return (
                          <section
                            key={slot}
                            className={cn(
                              "rounded-[var(--radius-lg)] overflow-hidden ring-1",
                              meta.bg,
                              meta.ring
                            )}
                          >
                            <header className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card/40 backdrop-blur-sm">
                              <div
                                className={cn(
                                  "flex items-center justify-center size-7 rounded-full ring-1 bg-card",
                                  meta.ring
                                )}
                              >
                                <SlotIcon
                                  className={cn("size-3.5", meta.iconColor)}
                                  strokeWidth={2.4}
                                />
                              </div>
                              <span
                                className={cn(
                                  "text-[11px] font-bold uppercase tracking-[0.18em]",
                                  meta.iconColor
                                )}
                              >
                                {meta.label}
                              </span>
                            </header>
                            <div className="p-2 sm:p-3">
                              {slotMeals.length > 0 ? (
                                <div className="space-y-2">
                                  {slotMeals.map((meal) => (
                                    <MealCard
                                      key={meal.id}
                                      meal={meal}
                                      readOnly={isPast}
                                      pinned={isMealPinned(meal)}
                                      onToggleDiner={() => {}}
                                      onRemove={() => removeMeal(meal.id)}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="min-h-12 flex items-center px-3 rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground/60 italic">
                                  Aucun plat planifié
                                </div>
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {picker && (
        <RecipePicker
          recipes={recipes}
          slotDate={picker.date}
          slotMealType={picker.mealType}
          mode={picker.replaceMealId ? "replace" : "add"}
          onSelect={assignRecipe}
          onClose={() => setPicker(null)}
          slotLabel={`${SLOT_META[picker.mealType].label}, ${new Date(
            picker.date
          ).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}`}
          slotIcon={SLOT_META[picker.mealType].icon}
        />
      )}

      {generateOpen && (
        <GenerateDialog
          onCancel={() => setGenerateOpen(false)}
          onConfirm={generate}
        />
      )}
    </div>
  );
}

function MealThumbnail({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  if (imageUrl) {
    return (
      <div className="relative size-16 sm:size-20 lg:size-auto lg:w-full lg:aspect-[4/3] rounded-lg overflow-hidden shrink-0 bg-muted ring-1 ring-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  // Fallback : initiale du plat sur fond gradient chaud
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="relative size-16 sm:size-20 lg:size-auto lg:w-full lg:aspect-[4/3] rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-primary/20 via-gold-soft to-accent flex items-center justify-center">
      <span className="text-3xl lg:text-2xl font-black text-primary/70">
        {initial}
      </span>
    </div>
  );
}

function MealCard({
  meal,
  readOnly = false,
  pinned = false,
  onReplace,
  onToggleDiner,
  onRemove,
}: {
  meal: PlannedMealWithRecipe;
  readOnly?: boolean;
  pinned?: boolean;
  onReplace?: () => void;
  onToggleDiner: (diner: Diner) => void;
  onRemove: () => void;
}) {
  const dinersConfig = useDiners();
  const dinerKeys = activeDinerKeys(dinersConfig);
  const shares = totalShares(dinersConfig, meal.diners);
  const sharesLabel = shares.toFixed(shares % 1 === 0 ? 0 : 1);
  const canReplace = !readOnly && !!onReplace;
  const presentSet = new Set(meal.diners);

  return (
    <div
      className={cn(
        "group relative bg-background border rounded-[var(--radius-lg)] overflow-hidden transition-colors",
        pinned
          ? "border-primary/40 bg-primary-soft/20"
          : "border-border",
        !readOnly && "hover:border-border-strong"
      )}
    >
      {!readOnly && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 size-7 flex items-center justify-center rounded-full text-white/90 bg-black/30 hover:bg-danger hover:text-white backdrop-blur-sm transition-colors z-10"
          aria-label="Retirer"
        >
          <X className="size-4" />
        </button>
      )}
      {pinned && (
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white px-2 py-0.5 rounded-full bg-primary backdrop-blur-sm shadow-soft z-10">
          <Pin className="size-3" aria-label="Épinglé" />
          Épinglé
        </span>
      )}

      <div className="flex items-stretch gap-3 p-3 lg:flex-col lg:gap-2 lg:p-2">
        <MealThumbnail
          imageUrl={meal.recipe.imageUrl}
          name={meal.recipe.name}
        />
        <div className="flex-1 min-w-0 flex flex-col justify-center min-h-16 sm:min-h-20 lg:min-h-0 lg:items-center lg:text-center">
          {canReplace ? (
            <button
              type="button"
              onClick={onReplace}
              className="text-left text-base sm:text-xl lg:text-sm font-bold leading-tight tracking-tight hover:text-primary transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 line-clamp-2 lg:min-h-[2lh] pr-8 lg:pr-0 lg:text-center w-full"
              title="Cliquer pour remplacer ce plat"
            >
              {meal.recipe.name}
            </button>
          ) : (
            <p className="text-base sm:text-xl lg:text-sm font-bold leading-tight tracking-tight line-clamp-2 lg:min-h-[2lh] pr-8 lg:pr-0 lg:text-center w-full">
              {meal.recipe.name}
            </p>
          )}
          <div className="mt-1.5 lg:mt-1 flex items-center gap-1 text-sm lg:text-xs font-semibold tabular-nums text-muted-foreground lg:justify-center">
            <Users className="size-3.5" />
            <span>
              <span className="text-foreground">{sharesLabel}</span>
              <span> {shares <= 1 ? "part" : "parts"}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-start lg:justify-center gap-1 sm:gap-1.5 lg:gap-1 flex-wrap px-3 pb-3 pt-1 lg:px-2 lg:pb-2 border-t border-border/60">
        {dinerKeys.map((d) => {
          const isPresent = presentSet.has(d);
          const coef = dinerCoefficient(dinersConfig, d);
          const coefLabel = coef === 1 ? "" : `${coef}`;
          return (
            <button
              key={d}
              type="button"
              disabled={readOnly}
              onClick={() => onToggleDiner(d)}
              className={cn(
                "group/diner relative inline-flex items-center gap-1 sm:gap-1.5 lg:gap-0.5 px-1.5 sm:px-2 lg:px-1 h-8 lg:h-7 rounded-full border text-xs font-medium transition-all",
                isPresent
                  ? "bg-card border-border-strong shadow-soft"
                  : "bg-muted/40 border-transparent text-muted-foreground/60 grayscale opacity-60 hover:opacity-100",
                !readOnly && "cursor-pointer hover:scale-105 active:scale-95",
                readOnly && "cursor-default"
              )}
              aria-pressed={isPresent}
              title={`${dinerLabel(dinersConfig, d)} (${coef} part${coef <= 1 ? "" : "s"})`}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center size-5 lg:size-4 rounded-full text-[10px] lg:text-[8px] font-bold text-white shrink-0",
                  dinerColorBg(dinersConfig, d)
                )}
              >
                {dinerInitials(dinersConfig, d)}
              </span>
              <span className="hidden sm:inline lg:hidden">
                {dinerLabel(dinersConfig, d)}
              </span>
              {coefLabel && (
                <span className="text-[10px] lg:text-[9px] font-semibold text-muted-foreground tabular-nums">
                  ×{coefLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecipePicker({
  recipes,
  slotDate,
  slotMealType,
  mode = "add",
  onSelect,
  onClose,
  slotLabel,
  slotIcon: SlotIcon,
}: {
  recipes: RecipeWithDetails[];
  slotDate: string;
  slotMealType: MealSlot;
  mode?: "add" | "replace";
  onSelect: (id: number) => void;
  onClose: () => void;
  slotLabel: string;
  slotIcon: typeof Sun;
}) {
  const [filters, setFilters] = useState<RecipeFilters>(emptyRecipeFilters);
  const reset = () => setFilters(emptyRecipeFilters());
  const activeCount = activeFilterCount(filters);

  // Étape 1 : on bloque les recettes restreintes à un autre slot.
  // Étape 2 : on applique les filtres rapides (recherche, saison, etc.).
  const dayOfWeek = getDayOfWeekFromIso(slotDate);
  const eligibleRecipes = recipes.filter((r) =>
    isRecipeAllowedAtSlot(r, dayOfWeek, slotMealType)
  );
  const filtered = applyRecipeFilters(eligibleRecipes, filters);
  const hiddenByRestriction = recipes.length - eligibleRecipes.length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-[fade-in_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-2xl rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] max-h-[90dvh] flex flex-col shadow-lift animate-[slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center justify-center size-8 rounded-lg bg-primary-soft text-primary shrink-0">
                <SlotIcon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary leading-none">
                  {mode === "replace" ? "Remplacer" : "Ajouter"}
                </p>
                <p className="text-sm font-medium capitalize truncate mt-0.5">
                  {slotLabel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="size-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher une recette…"
              value={filters.search}
              onChange={(e) =>
                setFilters((f) => ({ ...f, search: e.target.value }))
              }
              className="w-full h-11 rounded-lg border border-border bg-background pl-10 pr-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              autoFocus
            />
          </div>
          <RecipeFilterChips filters={filters} onChange={setFilters} />
          <p className="text-xs text-muted-foreground px-0.5">
            {filtered.length} recette{filtered.length > 1 ? "s" : ""}
            {activeCount > 0 && " (filtres actifs)"}
            {hiddenByRestriction > 0 && (
              <span className="ml-1">
                · {hiddenByRestriction} masquée{hiddenByRestriction > 1 ? "s" : ""} par restriction
              </span>
            )}
          </p>
        </div>
        <ul className="overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <li className="text-center py-12">
              <p className="text-4xl mb-2">🍽️</p>
              <p className="text-sm text-muted-foreground">
                Aucune recette trouvée
              </p>
              {activeCount > 0 && (
                <button
                  onClick={reset}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </li>
          ) : (
            filtered.map((r) => {
              const time = (r.prepTime ?? 0) + (r.cookTime ?? 0);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => onSelect(r.id)}
                    className="group w-full text-left px-3 py-3 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold truncate flex-1">
                          {r.name}
                        </p>
                        <span
                          className="text-xs shrink-0"
                          title={SEASON_LABELS[r.season]}
                        >
                          {SEASON_EMOJI[r.season]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" />
                          {r.servings}
                        </span>
                        {time > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            {time} min
                          </span>
                        )}
                        <span>· {r.ingredients.length} ingr.</span>
                        {r.weight >= 4 && (
                          <span className="inline-flex items-center gap-0.5 text-gold">
                            <Star className="size-3 fill-gold" />
                            {r.weight}
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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


function GenerateDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (mode: "fill" | "replace") => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-[fade-in_0.2s_ease-out]"
      onClick={onCancel}
    >
      <div
        className="bg-card w-full max-w-sm rounded-[var(--radius-lg)] p-5 space-y-4 shadow-lift animate-[slide-up_0.3s_cubic-bezier(0.22,1,0.36,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-soft shrink-0">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h3 className="font-bold text-lg leading-tight">
              Générer la semaine
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              En tenant compte des préférences de chacun.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-start"
            onClick={() => onConfirm("fill")}
          >
            <Plus className="size-4" />
            Compléter les créneaux vides
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start"
            onClick={() => onConfirm("replace")}
          >
            <Sparkles className="size-4" />
            Remplacer toute la semaine
          </Button>
          <Button
            variant="ghost"
            size="md"
            className="w-full"
            onClick={onCancel}
          >
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
