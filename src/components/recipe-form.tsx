"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, Download, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import type { RecipeInput } from "@/lib/validators";
import type { RecipeWithDetails } from "@/lib/db/recipes";
import {
  DINERS,
  DINER_LABELS,
  PREFERENCE_EMOJI,
  type Diner,
  type Preference,
} from "@/lib/diners";
import {
  SEASONS,
  SEASON_LABELS,
  SEASON_EMOJI,
  type Season,
} from "@/lib/seasons";
import { cn } from "@/lib/utils";

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
  ingredients: Array<{ name: string; quantity: string }>;
  preferences: Record<Diner, Preference>;
};

function defaultPreferences(): Record<Diner, Preference> {
  return DINERS.reduce(
    (acc, d) => ({ ...acc, [d]: "like" as Preference }),
    {} as Record<Diner, Preference>
  );
}

function emptyState(): FormState {
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
    ingredients: [{ name: "", quantity: "" }],
    preferences: defaultPreferences(),
  };
}

function fromRecipe(r: RecipeWithDetails): FormState {
  const prefs = defaultPreferences();
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
    ingredients:
      r.ingredients.length > 0
        ? r.ingredients.map(({ name, quantity }) => ({ name, quantity }))
        : [{ name: "", quantity: "" }],
    preferences: prefs,
  };
}

function toRecipeInput(s: FormState): RecipeInput {
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
    preferences: DINERS.map((d) => ({
      diner: d,
      preference: s.preferences[d],
    })),
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
  const [state, setState] = useState<FormState>(
    initial ? fromRecipe(initial) : emptyState()
  );
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    const input = toRecipeInput(state);
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
              className="p-1.5"
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

      <div>
        <Label>Préférences par convive</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Cliquer pour faire défiler : neutre → adore → n'aime pas
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DINERS.map((diner) => {
            const pref = state.preferences[diner];
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
                <span className="text-sm font-medium">{DINER_LABELS[diner]}</span>
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
