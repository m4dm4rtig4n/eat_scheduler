"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
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
  MoreVertical,
  ArrowRightLeft,
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
  // ID du repas source d'un swap en cours. null = pas de swap actif.
  const [swapSourceMealId, setSwapSourceMealId] = useState<number | null>(null);
  // ID du meal en cours de drag (null sinon). Utilisé pour le DragOverlay.
  const [draggingMealId, setDraggingMealId] = useState<number | null>(null);
  // ID du slot actuellement survolé pendant un drag (`{date}|{mealType}` ou null).
  // Sert à calculer quelle MealCard affichera l'overlay « sera remplacée ».
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  // ID du meal précisément survolé pendant un drag (carte sous le pointeur).
  // Quand non-null, l'overlay « sera remplacée » se pose sur cette carte
  // précise au lieu de tomber par défaut sur la 1re non-pinnée du slot.
  const [dragOverMealId, setDragOverMealId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  // Sensors @dnd-kit : Pointer (souris+stylus, activation à 8px) + Touch
  // (mobile, activation après 200ms long-press pour ne pas confondre avec
  // un scroll vertical) + Keyboard (accessibilité).
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Échap annule un swap en cours
  useEffect(() => {
    if (swapSourceMealId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSwapSourceMealId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [swapSourceMealId]);

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
        const availableDiners = presentByDefault.filter((d) => !taken.has(d));
        // Si tout le monde est déjà pris OU absent par défaut, on crée le repas
        // sans convive. L'utilisateur pourra en ajouter manuellement.
        const recipe = recipes.find((r) => r.id === recipeId);
        const shares = totalShares(dinersConfig, availableDiners);
        const servingsMultiplier =
          recipe && recipe.servings > 0 ? shares / recipe.servings : 1;

        // Transfert : retirer ces diners des sibling meals où ils sont déjà.
        // On skip les meals pinnés : ils sont figés et leurs diners ne doivent
        // jamais être modifiés implicitement.
        const toAssign = new Set(availableDiners);
        const siblingPatches: Promise<unknown>[] = [];
        for (const s of siblings) {
          if (s.pinned) continue;
          const reduced = s.diners.filter((d) => !toAssign.has(d));
          if (reduced.length === s.diners.length) continue; // rien à retirer
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
    // TODO(toi) : explique en 1-2 lignes la nouvelle sémantique du pin
    // vis-à-vis des convives, pourquoi modifier les parts reste autorisé
    // alors que la recette et la position restent figées par le pin.
    const isPresent = meal.diners.includes(diner);

    // Calcul du nouvel état pour ce repas
    const nextDinersThis = isPresent
      ? meal.diners.filter((d) => d !== diner)
      : [...meal.diners, diner];
    const orderedThis = dinerKeysActive.filter((d) =>
      nextDinersThis.includes(d)
    );
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
          m.diners.includes(diner) &&
          !m.pinned // ne jamais modifier les diners d'un meal pinné
      );
      for (const s of siblings) {
        const reduced = s.diners.filter((d) => d !== diner);
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

  // Toggle l'état pinned d'un repas (préservé lors de la régénération).
  const togglePin = (mealId: number) => {
    const meal = meals.find((m) => m.id === mealId);
    if (!meal) return;
    const next = !meal.pinned;
    setMeals((curr) =>
      curr.map((m) => (m.id === mealId ? { ...m, pinned: next } : m))
    );
    fetch(`/api/meals/${mealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: next }),
    });
  };

  // Exécute l'échange entre le meal source et le slot cible.
  // Cas 1 (slot cible vide) : déplace simplement le meal vers le nouveau slot.
  // Cas 2 (slot cible avec meals) : permute les `recipeId` entre source et
  // premier meal du slot cible. Les autres meals du slot cible restent.
  const executeSwap = (targetDate: string, targetMealType: MealSlot) => {
    if (swapSourceMealId === null) return;
    const source = meals.find((m) => m.id === swapSourceMealId);
    if (!source) {
      setSwapSourceMealId(null);
      return;
    }
    // Un meal pinné ne peut pas être déplacé (sa date / mealType est figée).
    // L'utilisateur doit désépingler avant de pouvoir échanger.
    if (source.pinned) {
      setSwapSourceMealId(null);
      return;
    }
    // Pas de swap "sur soi-même"
    if (source.date === targetDate && source.mealType === targetMealType) {
      setSwapSourceMealId(null);
      return;
    }

    const targetMeals = meals.filter(
      (m) => m.date === targetDate && m.mealType === targetMealType
    );

    // Si le slot cible contient un meal pinné, on annule l'échange : on ne
    // veut pas écraser sa recette. (On pourrait permuter avec un meal non
    // pinné du slot, mais c'est peu intuitif. Plus simple : refuser.)
    if (targetMeals.some((m) => m.pinned)) {
      setSwapSourceMealId(null);
      return;
    }

    if (targetMeals.length === 0) {
      // Cas 1 : déplacement simple
      setMeals((curr) =>
        curr.map((m) =>
          m.id === source.id
            ? { ...m, date: targetDate, mealType: targetMealType }
            : m
        )
      );
      fetch(`/api/meals/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: targetDate,
          mealType: targetMealType,
        }),
      });
    } else {
      // Cas 2 : permutation des recettes entre source et premier meal cible
      const target = targetMeals[0];
      setMeals((curr) =>
        curr.map((m) => {
          if (m.id === source.id) return { ...m, recipeId: target.recipeId, recipe: target.recipe };
          if (m.id === target.id) return { ...m, recipeId: source.recipeId, recipe: source.recipe };
          return m;
        })
      );
      Promise.all([
        fetch(`/api/meals/${source.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId: target.recipeId }),
        }),
        fetch(`/api/meals/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId: source.recipeId }),
        }),
      ]);
    }

    setSwapSourceMealId(null);
  };

  // Détermine quel meal du slot survolé sera VISUELLEMENT remplacé par le
  // drag en cours (overlay « sera remplacée »).
  //
  // Doit refléter EXACTEMENT la branche swap de `executeDragDrop` : si
  // l'utilisateur lâche, est-ce qu'un swap (échange de recipeId) aura lieu
  // et quelle est la cible exacte ? Si pas de cible (drop dans le vide),
  // retourner null → ce sera un déplacement simple (cohabitation).
  //
  // Note : l'état `pinned` ne bloque pas le swap. Le pin protège un créneau
  // contre la régénération auto, pas contre une action manuelle utilisateur.
  const getReplacedMealId = (
    sourceMealId: number,
    overSlot: { date: string; mealType: MealSlot } | null,
    overMealId: number | null
  ): number | null => {
    const source = meals.find((m) => m.id === sourceMealId);
    if (!source) return null;

    // Cas prioritaire : on survole une carte précise. C'est elle la cible
    // si elle est différente de la source. L'état pinned ne bloque plus :
    // un swap conserve les pin sur les positions (les recettes voyagent).
    if (overMealId !== null) {
      const overMeal = meals.find((m) => m.id === overMealId);
      if (!overMeal) return null;
      if (overMeal.id === source.id) return null;
      return overMeal.id;
    }

    // Sinon : on survole l'espace vide d'un slot. Pas de remplacement
    // (cohabitation par défaut), sauf cas legacy : slot avec exactement
    // une carte → on garde le swap implicite (peu importe son état pin).
    if (!overSlot) return null;
    if (source.date === overSlot.date && source.mealType === overSlot.mealType)
      return null;
    const targetMeals = meals.filter(
      (m) => m.date === overSlot.date && m.mealType === overSlot.mealType
    );
    if (targetMeals.length !== 1) return null;
    return targetMeals[0]!.id;
  };

  // Variante de executeSwap utilisée par le drag & drop.
  // Sémantique du swap : on échange recipeId, recipe ET pinned entre source
  // et cible. Le pin "voyage avec le plat" : si tu drag un plat pinné, son
  // pin part avec lui. C'est cohérent avec l'intention utilisateur ("j'ai
  // épinglé CETTE recette pour cette semaine, où qu'elle aille").
  // Si pas de cible (drop dans le vide), c'est un déplacement simple (move),
  // qui conserve naturellement le pinned car le source garde ses attributs.
  const executeDragDrop = (
    sourceMealId: number,
    targetDate: string,
    targetMealType: MealSlot,
    targetMealId: number | null
  ) => {
    const source = meals.find((m) => m.id === sourceMealId);
    if (!source) return;
    if (source.date === targetDate && source.mealType === targetMealType) return;

    // Cible explicite : la carte précise sous le pointeur. Sinon, fallback
    // sur l'unique carte du slot (s'il n'en a qu'une), sinon pas de cible
    // → déplacement simple. Cohérent avec getReplacedMealId.
    const targetMeals = meals.filter(
      (m) => m.date === targetDate && m.mealType === targetMealType
    );
    const explicitTarget =
      targetMealId !== null
        ? targetMeals.find((m) => m.id === targetMealId)
        : undefined;
    const fallbackTarget =
      targetMeals.length === 1 ? targetMeals[0] : undefined;
    const swapTarget = explicitTarget ?? fallbackTarget;

    if (swapTarget && swapTarget.id !== source.id) {
      const target = swapTarget;
      setMeals((curr) =>
        curr.map((m) => {
          if (m.id === source.id)
            return {
              ...m,
              recipeId: target.recipeId,
              recipe: target.recipe,
              pinned: target.pinned,
            };
          if (m.id === target.id)
            return {
              ...m,
              recipeId: source.recipeId,
              recipe: source.recipe,
              pinned: source.pinned,
            };
          return m;
        })
      );
      Promise.all([
        fetch(`/api/meals/${source.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId: target.recipeId,
            pinned: target.pinned,
          }),
        }),
        fetch(`/api/meals/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId: source.recipeId,
            pinned: source.pinned,
          }),
        }),
      ]);
      return;
    }

    // Sinon : déplacement simple du source vers target. Le source garde tous
    // ses attributs (recipeId, diners, pinned, etc.), seul (date, mealType)
    // change. Si la cible avait un pinné, ils cohabiteront sur le même slot.
    setMeals((curr) =>
      curr.map((m) =>
        m.id === source.id
          ? { ...m, date: targetDate, mealType: targetMealType }
          : m
      )
    );
    fetch(`/api/meals/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: targetDate,
        mealType: targetMealType,
      }),
    });
  };

  // Handlers DnD. Les IDs sont :
  //  - draggable        : `meal:{id}` (un meal qu'on peut prendre)
  //  - droppable slot   : `slot:{date}|{mealType}` (espace vide d'un slot)
  //  - droppable carte  : `meal-target:{id}` (une carte précise dans un slot)
  // dnd-kit privilégie automatiquement le droppable le plus imbriqué via la
  // détection de collision, donc une carte l'emporte sur son slot parent.
  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("meal:")) {
      setDraggingMealId(parseInt(id.slice(5), 10));
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) {
      setDragOverSlotId(null);
      setDragOverMealId(null);
      return;
    }
    if (overId.startsWith("meal-target:")) {
      const overMealId = parseInt(overId.slice("meal-target:".length), 10);
      setDragOverMealId(overMealId);
      const overMeal = meals.find((m) => m.id === overMealId);
      setDragOverSlotId(
        overMeal ? `${overMeal.date}|${overMeal.mealType}` : null
      );
      return;
    }
    if (overId.startsWith("slot:")) {
      setDragOverSlotId(overId.slice(5));
      setDragOverMealId(null);
      return;
    }
    setDragOverSlotId(null);
    setDragOverMealId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const overMealIdAtEnd = dragOverMealId;
    setDraggingMealId(null);
    setDragOverSlotId(null);
    setDragOverMealId(null);

    const { active, over } = event;
    if (!over) return;
    const sourceId = String(active.id);
    if (!sourceId.startsWith("meal:")) return;
    const mealId = parseInt(sourceId.slice(5), 10);

    const targetId = String(over.id);
    if (targetId.startsWith("meal-target:")) {
      const overMealId = parseInt(targetId.slice("meal-target:".length), 10);
      const overMeal = meals.find((m) => m.id === overMealId);
      if (!overMeal) return;
      executeDragDrop(
        mealId,
        overMeal.date,
        overMeal.mealType as MealSlot,
        overMealId
      );
      return;
    }
    if (targetId.startsWith("slot:")) {
      const [date, mealType] = targetId.slice(5).split("|") as [
        string,
        MealSlot
      ];
      executeDragDrop(mealId, date, mealType, overMealIdAtEnd);
      return;
    }
  };

  const draggedMeal =
    draggingMealId !== null ? meals.find((m) => m.id === draggingMealId) : null;

  // Parse `dragOverSlotId` ("date|mealType") en objet typé pour `getReplacedMealId`.
  const overSlotParsed = (() => {
    if (!dragOverSlotId) return null;
    const [date, mealType] = dragOverSlotId.split("|") as [string, MealSlot];
    return { date, mealType };
  })();
  const replacedMealId =
    draggingMealId !== null
      ? getReplacedMealId(draggingMealId, overSlotParsed, dragOverMealId)
      : null;

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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDraggingMealId(null);
        setDragOverSlotId(null);
        setDragOverMealId(null);
      }}
    >
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

      {swapSourceMealId !== null && (
        <div className="sticky top-0 z-30 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-lg)] bg-primary text-primary-foreground shadow-lift animate-[fade-in_0.15s_ease-out]">
          <ArrowRightLeft className="size-4 shrink-0" />
          <span className="flex-1 text-sm font-medium">
            Choisis le slot cible — Échap pour annuler
          </span>
          <button
            type="button"
            onClick={() => setSwapSourceMealId(null)}
            className="size-7 inline-flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Annuler l'échange"
          >
            <X className="size-4" />
          </button>
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
                  // Slot peut accueillir un swap si un swap est actif ET que
                  // ce slot n'est pas celui de la source elle-même.
                  const swapSource =
                    swapSourceMealId !== null
                      ? meals.find((m) => m.id === swapSourceMealId)
                      : null;
                  const isSwapSource =
                    !!swapSource &&
                    swapSource.date === dateISO &&
                    swapSource.mealType === slot;
                  const isSwapTarget =
                    swapSourceMealId !== null && !isSwapSource && !isPast;
                  return (
                    <DroppableSlot
                      key={slot}
                      slotId={`slot:${dateISO}|${slot}`}
                      isPast={isPast}
                      ariaLabelledby={`slot-${dateISO}-${slot}`}
                      className={cn(
                        "relative rounded-[var(--radius-lg)] border overflow-hidden flex flex-col",
                        // Sur desktop, étire la section pour remplir la row du
                        // subgrid parent → frontières Midi/Soir alignées entre cards.
                        "lg:h-full",
                        meta.bg,
                        "border-transparent ring-1",
                        meta.ring,
                        isSwapTarget &&
                          "ring-2 ring-primary/60 cursor-pointer hover:ring-primary"
                      )}
                    >
                      {isSwapTarget && (
                        <button
                          type="button"
                          onClick={() => executeSwap(dateISO, slot)}
                          className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 hover:bg-primary/20 backdrop-blur-[1px] transition-colors"
                          aria-label={`Échanger avec ${meta.label} ${dateISO}`}
                        >
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lift">
                            <ArrowRightLeft className="size-3.5" />
                            Échanger ici
                          </span>
                        </button>
                      )}
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
                                pinned={
                                  isMealPinned(meal) || meal.pinned
                                }
                                swapHighlight={swapSourceMealId === meal.id}
                                willBeReplaced={replacedMealId === meal.id}
                                onReplace={() =>
                                  setPicker({
                                    date: dateISO,
                                    mealType: slot,
                                    replaceMealId: meal.id,
                                  })
                                }
                                onToggleDiner={(d) => toggleDiner(meal.id, d)}
                                onRemove={() => removeMeal(meal.id)}
                                onTogglePin={() => togglePin(meal.id)}
                                onStartSwap={() =>
                                  setSwapSourceMealId(meal.id)
                                }
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
                          <div className="flex gap-1.5 lg:flex-1">
                            <button
                              onClick={() =>
                                setPicker({ date: dateISO, mealType: slot })
                              }
                              className="group flex-1 h-full min-h-14 lg:min-h-32 flex items-center justify-center gap-2 px-3 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary-soft/30 text-muted-foreground hover:text-primary transition-all"
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
                              className="inline-flex items-center justify-center min-h-14 lg:min-h-32 px-3 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary-soft/30 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
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
                    </DroppableSlot>
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

    {/* Aperçu qui suit le pointeur pendant le drag (DragOverlay = portal) */}
    <DragOverlay dropAnimation={null}>
      {draggedMeal ? (
        <div className="rotate-2 opacity-90 shadow-lift">
          <MealCardPreview meal={draggedMeal} pinned={draggedMeal.pinned} />
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}

/**
 * Wrapper droppable pour une <section> de slot. Utilise `useDroppable` de
 * @dnd-kit pour s'enregistrer comme cible de drop. `isPast` désactive le drop
 * sur les jours passés (qu'on n'autorise pas à modifier).
 */
function DroppableSlot({
  slotId,
  isPast,
  ariaLabelledby,
  className,
  children,
}: {
  slotId: string;
  isPast: boolean;
  ariaLabelledby: string;
  className: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    disabled: isPast,
  });
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={ariaLabelledby}
      className={cn(
        className,
        // Highlight visuel quand un drag est au-dessus (en plus du highlight
        // du mode swap classique, qui utilise isSwapTarget).
        isOver && "ring-2 ring-primary"
      )}
    >
      {children}
    </section>
  );
}

/**
 * Aperçu compact d'un meal pour le DragOverlay. Réutilise MealThumbnail
 * et le titre, sans les contrôles ni les avatars (overlay = visuel pur).
 */
function MealCardPreview({
  meal,
  pinned,
}: {
  meal: PlannedMealWithRecipe;
  pinned: boolean;
}) {
  return (
    <div
      className={cn(
        "relative bg-background border rounded-[var(--radius-lg)] overflow-hidden w-48",
        pinned ? "border-primary/40 bg-primary-soft/20" : "border-border"
      )}
    >
      {pinned && (
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white px-2 py-0.5 rounded-full bg-primary backdrop-blur-sm shadow-soft z-10">
          <Pin className="size-3" />
          Épinglé
        </span>
      )}
      {/* Layout fixe (pas de variante lg:) pour éviter que la thumbnail
          prenne toute la largeur via `lg:w-full` héritée de MealThumbnail. */}
      <div className="flex items-center gap-3 p-3">
        <div className="size-16 shrink-0 rounded-lg overflow-hidden bg-muted ring-1 ring-border relative">
          {meal.recipe.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meal.recipe.imageUrl}
              alt={meal.recipe.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-gold-soft to-accent">
              <span className="text-2xl font-black text-primary/70">
                {meal.recipe.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight tracking-tight line-clamp-2">
            {meal.recipe.name}
          </p>
        </div>
      </div>
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
  swapHighlight = false,
  willBeReplaced = false,
  onReplace,
  onToggleDiner,
  onRemove,
  onTogglePin,
  onStartSwap,
}: {
  meal: PlannedMealWithRecipe;
  readOnly?: boolean;
  pinned?: boolean;
  /** Met en évidence la carte source pendant un swap en cours. */
  swapHighlight?: boolean;
  /** Affiche un overlay « sera remplacée » pendant un drag survolant ce slot. */
  willBeReplaced?: boolean;
  onReplace?: () => void;
  onToggleDiner: (diner: Diner) => void;
  onRemove: () => void;
  onTogglePin?: () => void;
  onStartSwap?: () => void;
}) {
  const dinersConfig = useDiners();
  const dinerKeys = activeDinerKeys(dinersConfig);
  const shares = totalShares(dinersConfig, meal.diners);
  const sharesLabel = shares.toFixed(shares % 1 === 0 ? 0 : 1);
  const canReplace = !readOnly && !!onReplace;
  const presentSet = new Set(meal.diners);

  // Drag & drop : le card lui-même est draggable (sauf en lecture seule).
  // Les boutons enfants (kebab, avatars, titre) gardent leur onClick : @dnd-kit
  // ne déclenche le drag que si le pointeur bouge de >8px (PointerSensor
  // activationConstraint), donc un click simple passe sans interférer.
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `meal:${meal.id}`,
    disabled: readOnly,
  });
  // Et la carte est aussi droppable : permet de cibler précisément CETTE
  // carte comme destination du swap (au lieu de tomber sur la 1re du slot).
  // Désactivé sur soi-même via `disabled` pour éviter un drop sur sa propre
  // carte source (qui n'aurait aucun sens et perturberait la collision).
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `meal-target:${meal.id}`,
    disabled: readOnly || isDragging,
  });
  // Merge des deux refs sur le même <div>.
  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };
  const [menuOpen, setMenuOpen] = useState(false);
  // Position du menu en coordonnées viewport (position: fixed) — nécessaire
  // car la MealCard parente a overflow-hidden qui rognerait un menu absolute.
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const kebabRef = useRef<HTMLButtonElement>(null);

  // Calcule la position du menu juste après ouverture
  const openMenu = () => {
    const rect = kebabRef.current?.getBoundingClientRect();
    if (rect) {
      // Aligné sous le bouton, à droite (le menu s'étend vers la gauche via -translate-x)
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.right,
      });
    }
    setMenuOpen(true);
  };

  // Ferme le menu au clic extérieur ou Échap
  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-meal-menu]")) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onScroll = () => setMenuOpen(false);
    document.addEventListener("click", onClickOutside);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("click", onClickOutside);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative bg-background border rounded-[var(--radius-lg)] overflow-hidden transition-colors touch-none",
        pinned
          ? "border-primary/40 bg-primary-soft/20"
          : "border-border",
        !readOnly && "hover:border-border-strong",
        swapHighlight && "ring-2 ring-primary shadow-lift",
        willBeReplaced && "ring-4 ring-danger shadow-lift scale-[1.01]",
        isDragging && "opacity-30"
      )}
    >
      {willBeReplaced && (
        <div
          aria-hidden
          className="absolute inset-0 z-30 flex items-center justify-center bg-danger/40 backdrop-blur-[2px] pointer-events-none rounded-[var(--radius-lg)] animate-[fade-in_0.15s_ease-out]"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger text-white text-xs font-bold shadow-lift uppercase tracking-wider">
            <ArrowRightLeft className="size-3.5" />
            Sera remplacée
          </span>
        </div>
      )}
      {!readOnly && (
        <div className="absolute top-2 right-2 z-10" data-meal-menu>
          <button
            ref={kebabRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (menuOpen) setMenuOpen(false);
              else openMenu();
            }}
            className="size-7 flex items-center justify-center rounded-full text-white/90 bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors"
            aria-label="Plus d'actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="size-4" />
          </button>
          {menuOpen && menuPos && (
            <div
              role="menu"
              data-meal-menu
              style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                transform: "translateX(-100%)",
              }}
              className="z-50 min-w-44 rounded-lg border border-border bg-card shadow-lift py-1 animate-[fade-in_0.12s_ease-out]"
            >
              {onTogglePin && (
                <button
                  role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onTogglePin();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted text-left"
                >
                  <Pin
                    className={cn(
                      "size-4",
                      pinned ? "fill-primary text-primary" : "text-muted-foreground"
                    )}
                  />
                  {pinned ? "Désépingler" : "Épingler"}
                </button>
              )}
              {onStartSwap && (
                <button
                  role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onStartSwap();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted text-left"
                >
                  <ArrowRightLeft className="size-4 text-muted-foreground" />
                  Échanger avec…
                </button>
              )}
              <div className="my-1 border-t border-border" />
              <button
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onRemove();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger-soft text-left"
              >
                <X className="size-4" />
                Retirer
              </button>
            </div>
          )}
        </div>
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

      <div className="px-3 pb-3 pt-1 lg:px-2 lg:pb-2 border-t border-border/60">
        {(() => {
          const presentDiners = dinerKeys.filter((d) => presentSet.has(d));
          const absentDiners = dinerKeys.filter((d) => !presentSet.has(d));
          const renderPill = (d: Diner) => {
            const isPresent = presentSet.has(d);
            const coef = dinerCoefficient(dinersConfig, d);
            return (
              <button
                key={d}
                type="button"
                disabled={readOnly}
                onClick={() => onToggleDiner(d)}
                className={cn(
                  "group/diner relative inline-flex items-center gap-1.5 sm:gap-2 lg:gap-1 px-2 sm:px-3 lg:px-1.5 h-12 lg:h-10 rounded-full border text-sm font-medium transition-all",
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
                    "inline-flex items-center justify-center size-7 lg:size-6 rounded-full text-xs lg:text-[10px] font-bold text-white shrink-0",
                    dinerColorBg(dinersConfig, d)
                  )}
                >
                  {dinerInitials(dinersConfig, d)}
                </span>
                <span className="hidden sm:inline lg:hidden">
                  {dinerLabel(dinersConfig, d)}
                </span>
              </button>
            );
          };
          return (
            <>
              {presentDiners.length > 0 && (
                <div className="flex items-center justify-start lg:justify-center gap-1 sm:gap-1.5 lg:gap-1 flex-wrap">
                  {presentDiners.map(renderPill)}
                </div>
              )}
              {absentDiners.length > 0 && presentDiners.length > 0 && (
                <div className="my-1.5 border-t border-border/40" aria-hidden />
              )}
              {absentDiners.length > 0 && (
                <div className="flex items-center justify-start lg:justify-center gap-1 sm:gap-1.5 lg:gap-1 flex-wrap">
                  {absentDiners.map(renderPill)}
                </div>
              )}
            </>
          );
        })()}
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
