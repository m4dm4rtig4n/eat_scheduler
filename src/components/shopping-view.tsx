"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
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

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
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
          <p className="text-xs text-muted-foreground">
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

      {checkedCount > 0 && (
        <button
          onClick={clearChecked}
          className="w-full text-xs text-muted-foreground py-2 hover:text-foreground"
        >
          Décocher tout ({checkedCount})
        </button>
      )}

      {loading ? (
        <p className="text-center py-8 text-sm text-muted-foreground">
          Chargement…
        </p>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          Aucun repas planifié cette semaine
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const isChecked = checked.has(item.name);
            return (
              <li key={item.name}>
                <button
                  onClick={() => toggle(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                    isChecked
                      ? "bg-muted/50 text-muted-foreground"
                      : "bg-card hover:bg-muted/40 active:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "size-6 rounded-full border-2 flex items-center justify-center shrink-0",
                      isChecked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    {isChecked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium capitalize",
                        isChecked && "line-through"
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
