"use client";

import { useState } from "react";
import {
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  COLOR_KEYS,
  COLOR_BG,
  COLOR_LABEL,
  type DinerConfig,
  type ColorKey,
} from "@/lib/diners";
import { cn } from "@/lib/utils";
import { useDinersContext } from "@/components/diners-provider";

type FullDiner = DinerConfig & { id: number };

export function SettingsView({
  initialDiners,
}: {
  initialDiners: DinerConfig[];
}) {
  const { refresh } = useDinersContext();
  const [diners, setDiners] = useState<FullDiner[]>(
    (initialDiners as FullDiner[]).slice().sort((a, b) => a.position - b.position)
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = async () => {
    const r = await fetch("/api/diners?archived=true");
    const data: FullDiner[] = await r.json();
    setDiners(data.sort((a, b) => a.position - b.position));
    refresh();
  };

  const move = async (id: number, delta: -1 | 1) => {
    const active = diners.filter((d) => !d.archived);
    const idx = active.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const target = idx + delta;
    if (target < 0 || target >= active.length) return;
    const reordered = [...active];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setDiners((curr) => {
      // optimistic: rewrite positions
      const map = new Map(reordered.map((d, i) => [d.id, i]));
      return curr
        .map((d) => (map.has(d.id) ? { ...d, position: map.get(d.id)! } : d))
        .sort((a, b) => a.position - b.position);
    });
    await fetch("/api/diners/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((d) => d.id) }),
    });
    reload();
  };

  const archive = async (id: number) => {
    if (
      !confirm(
        "Archiver cette personne ? Ses préférences existantes sont conservées."
      )
    )
      return;
    await fetch(`/api/diners/${id}`, { method: "DELETE" });
    reload();
  };

  const restore = async (id: number) => {
    await fetch(`/api/diners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    reload();
  };

  const active = diners.filter((d) => !d.archived);
  const archived = diners.filter((d) => d.archived);

  return (
    <div className="px-4 py-4 space-y-5">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            Personnes actives
          </h2>
          {!creating && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Ajouter
            </Button>
          )}
        </div>

        {creating && (
          <DinerEditor
            mode="create"
            existingKeys={diners.map((d) => d.key)}
            onCancel={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              reload();
            }}
          />
        )}

        {active.length === 0 && !creating ? (
          <EmptyActive onCreate={() => setCreating(true)} />
        ) : (
          <ul className="space-y-2 mt-3">
            {active.map((d, i) => (
              <li key={d.id}>
                {editingId === d.id ? (
                  <DinerEditor
                    mode="edit"
                    diner={d}
                    existingKeys={diners
                      .map((x) => x.key)
                      .filter((k) => k !== d.key)}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      reload();
                    }}
                  />
                ) : (
                  <DinerRow
                    diner={d}
                    canMoveUp={i > 0}
                    canMoveDown={i < active.length - 1}
                    onMoveUp={() => move(d.id, -1)}
                    onMoveDown={() => move(d.id, 1)}
                    onEdit={() => setEditingId(d.id)}
                    onArchive={() => archive(d.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Personnes archivées
          </h2>
          <ul className="space-y-2">
            {archived.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg opacity-70"
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center size-8 rounded-full text-xs font-bold text-white shrink-0 grayscale",
                    COLOR_BG[d.colorKey]
                  )}
                >
                  {d.initials}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{d.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Coefficient {d.coefficient}
                  </p>
                </div>
                <button
                  onClick={() => restore(d.id)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1"
                >
                  <RotateCcw className="size-3.5" />
                  Restaurer
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground text-center px-2 leading-relaxed">
        Le coefficient de part détermine combien chaque personne compte dans le
        calcul du nombre de portions d'un repas. <br />
        Un adulte = 1, un enfant = 0,5 (par défaut).
      </p>
    </div>
  );
}

function EmptyActive({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-border rounded-[var(--radius-lg)]">
      <span className="inline-flex items-center justify-center size-16 rounded-full bg-primary-soft mb-4">
        <Users className="size-8 text-primary" />
      </span>
      <p className="font-semibold mb-1">Aucune personne configurée</p>
      <p className="text-sm text-muted-foreground mb-5">
        Ajoute les membres de ton foyer pour commencer.
      </p>
      <Button onClick={onCreate}>
        <Plus className="size-4" />
        Ajouter une personne
      </Button>
    </div>
  );
}

function DinerRow({
  diner,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onArchive,
}: {
  diner: FullDiner;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-[var(--radius-lg)] shadow-soft">
      <span
        className={cn(
          "inline-flex items-center justify-center size-10 rounded-full text-sm font-bold text-white shrink-0",
          COLOR_BG[diner.colorKey]
        )}
      >
        {diner.initials}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-bold leading-tight truncate">{diner.label}</p>
        <p className="text-xs text-muted-foreground">
          Coefficient ×{diner.coefficient}
        </p>
      </div>
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Monter"
        >
          <ArrowUp className="size-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="size-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          aria-label="Descendre"
        >
          <ArrowDown className="size-3.5" />
        </button>
      </div>
      <button
        onClick={onEdit}
        className="size-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary-soft/40 transition-colors shrink-0"
        aria-label="Modifier"
      >
        <Pencil className="size-4" />
      </button>
      <button
        onClick={onArchive}
        className="size-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft transition-colors shrink-0"
        aria-label="Archiver"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function DinerEditor({
  mode,
  diner,
  existingKeys,
  onCancel,
  onSaved,
}: {
  mode: "create" | "edit";
  diner?: FullDiner;
  existingKeys: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(diner?.label ?? "");
  const [initials, setInitials] = useState(diner?.initials ?? "");
  const [colorKey, setColorKey] = useState<ColorKey>(diner?.colorKey ?? "blue");
  const [coefficient, setCoefficient] = useState<number>(
    diner?.coefficient ?? 1.0
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-générer les initiales si label change et créateur n'a pas saisi
  const onLabelChange = (v: string) => {
    setLabel(v);
    if (mode === "create" && !initials) {
      const auto = v
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2);
      setInitials(auto.toUpperCase());
    }
  };

  const submit = async () => {
    setError(null);
    if (!label.trim()) return setError("Nom requis");
    if (!initials.trim()) return setError("Initiales requises");

    setSubmitting(true);
    try {
      if (mode === "create") {
        let key = slugify(label);
        if (!key) {
          setError("Nom invalide");
          return;
        }
        // collision: ajouter un suffixe numérique
        let i = 2;
        while (existingKeys.includes(key)) {
          key = `${slugify(label)}-${i++}`;
        }
        const res = await fetch("/api/diners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            label: label.trim(),
            initials: initials.trim(),
            colorKey,
            coefficient,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error ?? "Erreur");
          return;
        }
      } else if (diner) {
        const res = await fetch(`/api/diners/${diner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: label.trim(),
            initials: initials.trim(),
            colorKey,
            coefficient,
          }),
        });
        if (!res.ok) {
          setError("Erreur lors de l'enregistrement");
          return;
        }
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-card border border-primary/40 rounded-[var(--radius-lg)] shadow-lift space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center justify-center size-10 rounded-full text-sm font-bold text-white shrink-0",
            COLOR_BG[colorKey]
          )}
        >
          {initials || "?"}
        </span>
        <p className="font-semibold text-sm flex-1">
          {mode === "create" ? "Nouvelle personne" : "Modifier"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label htmlFor="diner-label">Nom</Label>
          <Input
            id="diner-label"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Ex: Maxime"
            autoFocus
            maxLength={50}
          />
        </div>
        <div>
          <Label htmlFor="diner-initials">Initiales</Label>
          <Input
            id="diner-initials"
            value={initials}
            onChange={(e) => setInitials(e.target.value.slice(0, 3))}
            placeholder="Mx"
            maxLength={3}
            className="uppercase"
          />
        </div>
      </div>

      <div>
        <Label>Couleur</Label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColorKey(c)}
              className={cn(
                "size-9 rounded-full ring-2 transition-all",
                COLOR_BG[c],
                colorKey === c
                  ? "ring-foreground scale-110 shadow-soft"
                  : "ring-transparent hover:scale-105"
              )}
              aria-label={COLOR_LABEL[c]}
              title={COLOR_LABEL[c]}
            />
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="diner-coef">
          Coefficient de part : ×{coefficient.toFixed(1)}
        </Label>
        <input
          id="diner-coef"
          type="range"
          min={0.1}
          max={2}
          step={0.1}
          value={coefficient}
          onChange={(e) => setCoefficient(parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
          <span>0.1</span>
          <span>0.5 (enfant)</span>
          <span>1 (adulte)</span>
          <span>2</span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger bg-danger-soft px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="md"
          className="flex-1"
          onClick={onCancel}
          disabled={submitting}
        >
          <X className="size-4" />
          Annuler
        </Button>
        <Button
          variant="primary"
          size="md"
          className="flex-1"
          onClick={submit}
          disabled={submitting}
        >
          <Check className="size-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
