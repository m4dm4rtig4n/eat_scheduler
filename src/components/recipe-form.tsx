"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Download, Loader2, Star, ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import type { RecipeInput } from "@/lib/validators";
import type { RecipeWithDetails } from "@/lib/db/recipes";
import {
  PREFERENCE_EMOJI,
  activeDinerKeys,
  dinerLabel,
  type Diner,
  type Preference,
} from "@/lib/diners";
import { useDiners } from "@/components/diners-provider";
import {
  SEASONS,
  SEASON_LABELS,
  SEASON_EMOJI,
  type Season,
} from "@/lib/seasons";
import {
  DAYS_OF_WEEK,
  DAY_LABELS_SHORT,
  type DayOfWeek,
} from "@/lib/days";
import { cn } from "@/lib/utils";

type SlotKey = `${DayOfWeek}|lunch` | `${DayOfWeek}|dinner`;

type FormState = {
  name: string;
  description: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  instructions: string;
  sourceUrl: string;
  imageUrl: string;
  weight: number;
  season: Season;
  allowedSlots: Set<SlotKey>;
  excludedSlots: Set<SlotKey>;
  ingredients: Array<{ name: string; quantity: string }>;
  preferences: Record<Diner, Preference>;
};

function defaultPreferences(diners: Diner[]): Record<Diner, Preference> {
  return diners.reduce(
    (acc, d) => ({ ...acc, [d]: "like" as Preference }),
    {} as Record<Diner, Preference>
  );
}

function emptyState(diners: Diner[]): FormState {
  return {
    name: "",
    description: "",
    servings: 2,
    prepTime: "",
    cookTime: "",
    instructions: "",
    sourceUrl: "",
    imageUrl: "",
    weight: 3,
    season: "all",
    allowedSlots: new Set(),
    excludedSlots: new Set(),
    ingredients: [{ name: "", quantity: "" }],
    preferences: defaultPreferences(diners),
  };
}

function fromRecipe(r: RecipeWithDetails, diners: Diner[]): FormState {
  const prefs = defaultPreferences(diners);
  for (const p of r.preferences) {
    prefs[p.diner] = p.preference;
  }
  return {
    name: r.name,
    description: r.description ?? "",
    servings: r.servings,
    prepTime: r.prepTime?.toString() ?? "",
    cookTime: r.cookTime?.toString() ?? "",
    instructions: r.instructions ?? "",
    sourceUrl: r.sourceUrl ?? "",
    imageUrl: r.imageUrl ?? "",
    weight: r.weight,
    season: r.season,
    allowedSlots: new Set(
      r.allowedSlots.map(
        (s) => `${s.dayOfWeek}|${s.mealType}` as SlotKey
      )
    ),
    excludedSlots: new Set(
      r.excludedSlots.map(
        (s) => `${s.dayOfWeek}|${s.mealType}` as SlotKey
      )
    ),
    ingredients:
      r.ingredients.length > 0
        ? r.ingredients.map(({ name, quantity }) => ({ name, quantity }))
        : [{ name: "", quantity: "" }],
    preferences: prefs,
  };
}

function toRecipeInput(s: FormState, diners: Diner[]): RecipeInput {
  return {
    name: s.name.trim(),
    description: s.description.trim() || null,
    servings: s.servings,
    prepTime: s.prepTime ? parseInt(s.prepTime, 10) : null,
    cookTime: s.cookTime ? parseInt(s.cookTime, 10) : null,
    instructions: s.instructions.trim() || null,
    sourceUrl: s.sourceUrl.trim() || null,
    imageUrl: s.imageUrl.trim() || null,
    weight: s.weight,
    season: s.season,
    ingredients: s.ingredients
      .filter((i) => i.name.trim() && i.quantity.trim())
      .map((i, position) => ({
        name: i.name.trim(),
        quantity: i.quantity.trim(),
        position,
      })),
    preferences: diners.map((d) => ({
      diner: d,
      preference: s.preferences[d] ?? "like",
    })),
    allowedSlots: Array.from(s.allowedSlots).map((key) => {
      const [day, meal] = key.split("|");
      return {
        dayOfWeek: parseInt(day, 10),
        mealType: meal as "lunch" | "dinner",
      };
    }),
    excludedSlots: Array.from(s.excludedSlots).map((key) => {
      const [day, meal] = key.split("|");
      return {
        dayOfWeek: parseInt(day, 10),
        mealType: meal as "lunch" | "dinner",
      };
    }),
  };
}

export function RecipeForm({
  initial,
  recipeId,
}: {
  initial?: RecipeWithDetails;
  recipeId?: number;
}) {
  const router = useRouter();
  const dinersConfig = useDiners();
  const dinerKeys = activeDinerKeys(dinersConfig);
  const [state, setState] = useState<FormState>(
    initial ? fromRecipe(initial, dinerKeys) : emptyState(dinerKeys)
  );
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchingImage, setSearchingImage] = useState(false);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);
  const [imageCandidates, setImageCandidates] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearchImage = async () => {
    const query = state.name.trim();
    if (!query) {
      setImageSearchError("Renseigne d'abord le nom de la recette");
      return;
    }
    setSearchingImage(true);
    setImageSearchError(null);
    try {
      const res = await fetch(
        `/api/images/search?q=${encodeURIComponent(query)}&count=6`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la recherche");
      if (!data.urls || data.urls.length === 0) {
        setImageCandidates([]);
        setImageSearchError("Aucune image trouvée pour ce nom");
        return;
      }
      setImageCandidates(data.urls);
    } catch (e) {
      setImageCandidates([]);
      setImageSearchError(
        e instanceof Error ? e.message : "Erreur de recherche d'image"
      );
    } finally {
      setSearchingImage(false);
    }
  };

  const pickCandidate = (url: string) => {
    setState((s) => ({ ...s, imageUrl: url }));
    setImageCandidates([]);
  };

  const isEdit = recipeId !== undefined;

  const handleImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de l'import");
      setState((prev) => ({
        ...prev,
        name: data.name,
        description: data.description ?? "",
        servings: data.servings,
        prepTime: data.prepTime?.toString() ?? "",
        cookTime: data.cookTime?.toString() ?? "",
        instructions: data.instructions ?? "",
        sourceUrl: data.sourceUrl ?? importUrl.trim(),
        imageUrl: data.imageUrl ?? "",
        ingredients:
          data.ingredients.length > 0
            ? data.ingredients.map((i: { name: string; quantity: string }) => ({
                name: i.name,
                quantity: i.quantity,
              }))
            : [{ name: "", quantity: "" }],
      }));
      setImportUrl("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Erreur d'import");
    } finally {
      setImporting(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = toRecipeInput(state, dinerKeys);
    if (!input.name) {
      setError("Le nom est obligatoire");
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        isEdit ? `/api/recipes/${recipeId}` : "/api/recipes",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      router.push("/recipes");
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!isEdit) return;
    if (!confirm("Supprimer cette recette ?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Erreur lors de la suppression");
        return;
      }
      router.push("/recipes");
      router.refresh();
    });
  };

  const updateIngredient = (
    index: number,
    field: "name" | "quantity",
    value: string
  ) => {
    setState((s) => ({
      ...s,
      ingredients: s.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  const addIngredient = () => {
    setState((s) => ({
      ...s,
      ingredients: [...s.ingredients, { name: "", quantity: "" }],
    }));
  };

  const removeIngredient = (index: number) => {
    setState((s) => ({
      ...s,
      ingredients:
        s.ingredients.length === 1
          ? [{ name: "", quantity: "" }]
          : s.ingredients.filter((_, i) => i !== index),
    }));
  };

  const cyclePreference = (diner: Diner) => {
    const order: Preference[] = ["like", "love", "dislike"];
    const current = state.preferences[diner];
    const next = order[(order.indexOf(current) + 1) % order.length];
    setState((s) => ({
      ...s,
      preferences: { ...s.preferences, [diner]: next },
    }));
  };

  return (
    <form onSubmit={submit} className="px-4 py-4 space-y-6">
      {!isEdit && (
        <div className="bg-accent/40 border border-accent rounded-xl p-3 space-y-2">
          <Label className="text-accent-foreground">
            Importer depuis une URL
          </Label>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://www.marmiton.org/..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              disabled={importing}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleImport}
              disabled={importing || !importUrl.trim()}
            >
              {importing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </Button>
          </div>
          {importError && (
            <p className="text-xs text-red-600">{importError}</p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="name">Nom *</Label>
        <Input
          id="name"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label>Préférence générale</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setState((s) => ({ ...s, weight: n }))}
              className="inline-flex items-center justify-center size-11"
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "size-7 transition-colors",
                  n <= state.weight
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Saison</Label>
        <div className="grid grid-cols-3 gap-2">
          {SEASONS.map((season) => {
            const active = state.season === season;
            return (
              <button
                key={season}
                type="button"
                onClick={() => setState((s) => ({ ...s, season }))}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors",
                  active
                    ? season === "summer"
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : season === "winter"
                      ? "border-sky-400 bg-sky-50 dark:bg-sky-950/30"
                      : "border-primary bg-primary/5"
                    : "border-border bg-muted/40"
                )}
              >
                <span className="text-2xl">{SEASON_EMOJI[season]}</span>
                <span className="text-sm font-medium">
                  {SEASON_LABELS[season]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <SlotRestrictionsField
        allowedSlots={state.allowedSlots}
        excludedSlots={state.excludedSlots}
        onChange={(next) =>
          setState((s) => ({
            ...s,
            allowedSlots: next.allowedSlots,
            excludedSlots: next.excludedSlots,
          }))
        }
      />

      <div>
        <Label>Préférences par convive</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Cliquer pour faire défiler : neutre → adore → n'aime pas
        </p>
        <div
          className={cn(
            "grid gap-2",
            dinerKeys.length <= 2
              ? "grid-cols-2"
              : dinerKeys.length === 3
              ? "grid-cols-3"
              : "grid-cols-2 sm:grid-cols-4"
          )}
        >
          {dinerKeys.map((diner) => {
            const pref = state.preferences[diner] ?? "like";
            return (
              <button
                key={diner}
                type="button"
                onClick={() => cyclePreference(diner)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors",
                  pref === "love" && "border-pink-400 bg-pink-50 dark:bg-pink-950/30",
                  pref === "like" && "border-border bg-muted/40",
                  pref === "dislike" &&
                    "border-red-300 bg-red-50 dark:bg-red-950/30"
                )}
              >
                <span className="text-2xl">{PREFERENCE_EMOJI[pref]}</span>
                <span className="text-sm font-medium">
                  {dinerLabel(dinersConfig, diner)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={state.description}
          onChange={(e) =>
            setState((s) => ({ ...s, description: e.target.value }))
          }
          rows={2}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="imageUrl" className="mb-0">
            Image
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSearchImage}
            disabled={searchingImage || !state.name.trim()}
          >
            {searchingImage ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Trouver
          </Button>
        </div>
        <div className="flex gap-3 items-start">
          <div className="relative size-24 shrink-0 rounded-md overflow-hidden bg-muted ring-1 ring-border flex items-center justify-center">
            {state.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.imageUrl}
                alt={state.name || "Aperçu"}
                className="size-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <ImageIcon className="size-7 text-muted-foreground/50" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Input
              id="imageUrl"
              type="url"
              placeholder="https://images.pexels.com/..."
              value={state.imageUrl}
              onChange={(e) =>
                setState((s) => ({ ...s, imageUrl: e.target.value }))
              }
            />
            {state.imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setState((s) => ({ ...s, imageUrl: "" }))}
              >
                <X className="size-4" />
                Retirer
              </Button>
            )}
            {imageSearchError && (
              <p className="text-xs text-red-600">{imageSearchError}</p>
            )}
          </div>
        </div>

        {imageCandidates.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                Choisis une image ({imageCandidates.length} propositions)
              </p>
              <button
                type="button"
                onClick={() => setImageCandidates([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {imageCandidates.map((url) => {
                const selected = url === state.imageUrl;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => pickCandidate(url)}
                    className={cn(
                      "relative aspect-square rounded-md overflow-hidden ring-2 transition-all hover:opacity-90",
                      selected
                        ? "ring-primary"
                        : "ring-transparent hover:ring-border-strong"
                    )}
                    aria-label="Sélectionner cette image"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="servings">Portions</Label>
          <Input
            id="servings"
            type="number"
            min={1}
            value={state.servings}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                servings: Math.max(1, parseInt(e.target.value, 10) || 1),
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="prepTime">Prép. (min)</Label>
          <Input
            id="prepTime"
            type="number"
            min={0}
            value={state.prepTime}
            onChange={(e) =>
              setState((s) => ({ ...s, prepTime: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="cookTime">Cuiss. (min)</Label>
          <Input
            id="cookTime"
            type="number"
            min={0}
            value={state.cookTime}
            onChange={(e) =>
              setState((s) => ({ ...s, cookTime: e.target.value }))
            }
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="mb-0">Ingrédients</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addIngredient}
          >
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
        <ul className="space-y-2">
          {state.ingredients.map((ing, index) => (
            <li key={index} className="flex gap-2 items-start">
              <Input
                placeholder="Quantité"
                value={ing.quantity}
                onChange={(e) =>
                  updateIngredient(index, "quantity", e.target.value)
                }
                className="w-28"
              />
              <Input
                placeholder="Ingrédient"
                value={ing.name}
                onChange={(e) =>
                  updateIngredient(index, "name", e.target.value)
                }
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(index)}
                aria-label="Supprimer"
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          value={state.instructions}
          onChange={(e) =>
            setState((s) => ({ ...s, instructions: e.target.value }))
          }
          rows={6}
        />
      </div>

      <div>
        <Label htmlFor="sourceUrl">URL source</Label>
        <Input
          id="sourceUrl"
          type="url"
          value={state.sourceUrl}
          onChange={(e) =>
            setState((s) => ({ ...s, sourceUrl: e.target.value }))
          }
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="lg" className="flex-1" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? "Enregistrer" : "Créer"}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </form>
  );
}

type RestrictionMode = "always" | "only" | "except";

function SlotRestrictionsField({
  allowedSlots,
  excludedSlots,
  onChange,
}: {
  allowedSlots: Set<SlotKey>;
  excludedSlots: Set<SlotKey>;
  onChange: (next: {
    allowedSlots: Set<SlotKey>;
    excludedSlots: Set<SlotKey>;
  }) => void;
}) {
  // Détermination du mode courant à partir des données.
  const mode: RestrictionMode =
    allowedSlots.size > 0 ? "only" : excludedSlots.size > 0 ? "except" : "always";

  const activeSlots = mode === "only" ? allowedSlots : excludedSlots;

  const setMode = (next: RestrictionMode) => {
    if (next === "always") {
      onChange({ allowedSlots: new Set(), excludedSlots: new Set() });
    } else if (next === "only") {
      // Si on switche depuis "except", on transfère les slots vers allowed
      const slots = new Set(activeSlots);
      onChange({ allowedSlots: slots, excludedSlots: new Set() });
    } else {
      const slots = new Set(activeSlots);
      onChange({ allowedSlots: new Set(), excludedSlots: slots });
    }
  };

  const updateActiveSlots = (next: Set<SlotKey>) => {
    if (mode === "only") {
      onChange({ allowedSlots: next, excludedSlots: new Set() });
    } else if (mode === "except") {
      onChange({ allowedSlots: new Set(), excludedSlots: next });
    }
  };

  const toggleSlot = (key: SlotKey) => {
    if (mode === "always") {
      // Premier clic depuis "always" : on bascule en mode "only" avec ce slot
      onChange({ allowedSlots: new Set([key]), excludedSlots: new Set() });
      return;
    }
    const next = new Set(activeSlots);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    updateActiveSlots(next);
  };

  const setAll = (lunch: boolean, dinner: boolean) => {
    const next = new Set<SlotKey>();
    for (const day of DAYS_OF_WEEK) {
      if (lunch) next.add(`${day}|lunch`);
      if (dinner) next.add(`${day}|dinner`);
    }
    if (mode === "always") {
      onChange({ allowedSlots: next, excludedSlots: new Set() });
    } else {
      updateActiveSlots(next);
    }
  };

  const setWeekendOnly = () => {
    const next = new Set<SlotKey>();
    for (const day of [4, 5, 6] as DayOfWeek[]) {
      next.add(`${day}|lunch`);
      next.add(`${day}|dinner`);
    }
    if (mode === "always") {
      onChange({ allowedSlots: next, excludedSlots: new Set() });
    } else {
      updateActiveSlots(next);
    }
  };

  const helperText =
    mode === "always"
      ? "Disponible toute la semaine (clique sur un créneau pour restreindre)"
      : mode === "only"
      ? `Proposée uniquement sur ${activeSlots.size} créneau${activeSlots.size > 1 ? "x" : ""}`
      : `Exclue de ${activeSlots.size} créneau${activeSlots.size > 1 ? "x" : ""}`;

  // Couleur des cases selon mode + état (cochée ou non)
  const getCellClasses = (active: boolean) => {
    if (mode === "always") {
      return "bg-primary/10 border-primary/60 text-primary";
    }
    if (mode === "only") {
      return active
        ? "bg-primary/15 border-primary text-primary font-bold"
        : "bg-muted/30 border-border text-muted-foreground/40";
    }
    // mode === "except"
    return active
      ? "bg-danger-soft border-danger text-danger font-bold"
      : "bg-card border-border text-foreground-soft";
  };

  return (
    <div>
      <Label>Disponibilité</Label>

      {/* Sélecteur de mode */}
      <div className="grid grid-cols-3 gap-1 mb-2 p-1 rounded-lg bg-muted/40 border border-border">
        {(
          [
            ["always", "Toujours"],
            ["only", "Uniquement"],
            ["except", "Sauf"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "h-9 rounded-md text-xs font-semibold transition-all",
              mode === m
                ? m === "except"
                  ? "bg-danger-soft text-danger shadow-soft"
                  : "bg-card text-primary shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-2">{helperText}</p>

      {mode !== "always" && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          <QuickAction onClick={() => setAll(false, true)}>
            Soir
          </QuickAction>
          <QuickAction onClick={() => setAll(true, false)}>
            Midi
          </QuickAction>
          <QuickAction onClick={setWeekendOnly}>Weekend</QuickAction>
          <QuickAction onClick={() => updateActiveSlots(new Set())}>
            Vider
          </QuickAction>
        </div>
      )}

      <div className="grid grid-cols-8 gap-1 text-xs">
        <div></div>
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center font-semibold text-muted-foreground py-1"
          >
            {DAY_LABELS_SHORT[day]}
          </div>
        ))}
        {(["lunch", "dinner"] as const).flatMap((meal) => [
          <div
            key={`${meal}-label`}
            className="text-xs font-semibold text-muted-foreground self-center"
          >
            {meal === "lunch" ? "Midi" : "Soir"}
          </div>,
          ...DAYS_OF_WEEK.map((day) => {
            const key = `${day}|${meal}` as SlotKey;
            const active = activeSlots.has(key);
            const symbol =
              mode === "always"
                ? "·"
                : mode === "only"
                ? active
                  ? "✓"
                  : "·"
                : active
                ? "✕"
                : "·";
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleSlot(key)}
                className={cn(
                  "h-11 rounded-md border text-sm transition-colors",
                  getCellClasses(active)
                )}
                aria-label={`${DAY_LABELS_SHORT[day]} ${meal === "lunch" ? "midi" : "soir"}`}
                aria-pressed={active}
              >
                {symbol}
              </button>
            );
          }),
        ])}
      </div>
    </div>
  );
}

function QuickAction({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center px-2.5 h-7 rounded-full text-xs font-medium border border-border bg-card hover:border-primary hover:bg-primary-soft/40 hover:text-primary text-muted-foreground transition-colors"
    >
      {children}
    </button>
  );
}
