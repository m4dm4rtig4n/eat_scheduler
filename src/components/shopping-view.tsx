"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, formatDateISO, startOfWeek } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ShoppingItem } from "@/lib/shopping-list";

const STORAGE_KEY_CHECKED = "eat-shopping-checked";

export function ShoppingView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [mealsCount, setMealsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_CHECKED);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const start = formatDateISO(weekStart);
    const end = formatDateISO(addDays(weekStart, 6));
    setLoading(true);
    fetch(`/api/shopping-list?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items);
        setMealsCount(data.mealsCount);
      })
      .finally(() => setLoading(false));
  }, [weekStart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_CHECKED,
        JSON.stringify([...checked])
      );
    } catch {}
  }, [checked]);

  const toggle = (name: string) => {
    setChecked((curr) => {
      const next = new Set(curr);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const clearChecked = () => setChecked(new Set());

  const checkedCount = items.filter((i) => checked.has(i.name)).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;
  const allDone = items.length > 0 && checkedCount === items.length;

  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekLabel = sameMonth
    ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("fr-FR", { month: "long" })}`
    : `${weekStart.getDate()} ${weekStart.toLocaleDateString("fr-FR", { month: "short" })} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("fr-FR", { month: "short" })}`;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2 bg-card-warm rounded-[var(--radius-lg)] px-2 py-3 border border-border shadow-soft">
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
            {weekLabel}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {mealsCount} repas · {items.length} ingrédients
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

      {items.length > 0 && (
        <div
          className={cn(
            "rounded-[var(--radius-lg)] p-4 border shadow-soft transition-all",
            allDone
              ? "bg-gradient-to-br from-accent to-accent/60 border-accent-foreground/20"
              : "bg-card border-border"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-2">
              {allDone ? (
                <span className="inline-flex items-center justify-center size-8 rounded-full bg-accent-foreground text-accent">
                  <Sparkles className="size-4" />
                </span>
              ) : (
                <span className="inline-flex items-center justify-center size-8 rounded-full bg-primary-soft text-primary">
                  <ShoppingBasket className="size-4" />
                </span>
              )}
              <div>
                <p className="text-sm font-semibold">
                  {allDone
                    ? "Liste terminée !"
                    : `${checkedCount} / ${items.length} cochés`}
                </p>
                {!allDone && checkedCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Plus que {items.length - checkedCount} articles
                  </p>
                )}
              </div>
            </div>
            {checkedCount > 0 && (
              <button
                onClick={clearChecked}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Tout décocher
              </button>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                allDone
                  ? "bg-accent-foreground"
                  : "bg-gradient-to-r from-primary to-primary-hover"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="h-14 rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="text-center py-16 px-6">
          <span className="inline-flex items-center justify-center size-16 rounded-full bg-primary-soft mb-4">
            <ShoppingBasket className="size-8 text-primary" />
          </span>
          <p className="font-semibold mb-1">Aucun repas planifié</p>
          <p className="text-sm text-muted-foreground">
            Planifie des repas pour générer ta liste de courses.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const isChecked = checked.has(item.name);
            return (
              <li key={item.name}>
                <button
                  onClick={() => toggle(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all border",
                    isChecked
                      ? "bg-muted/40 border-transparent text-muted-foreground"
                      : "bg-card border-border hover:border-border-strong shadow-soft hover:shadow-lift"
                  )}
                >
                  <span
                    className={cn(
                      "size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                      isChecked
                        ? "bg-primary border-primary text-primary-foreground scale-100"
                        : "border-border-strong group-hover:border-primary"
                    )}
                  >
                    {isChecked && (
                      <Check className="size-3.5" strokeWidth={3} />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium capitalize transition-all",
                        isChecked && "line-through opacity-60"
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantities.join(" + ")}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
