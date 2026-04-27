"use client";

import { Clock, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  activeDinerKeys,
  dinerInitials,
  dinerLabel,
  dinerColorBg,
  type Diner,
} from "@/lib/diners";
import { useDiners } from "@/components/diners-provider";
import {
  SEASONS,
  SEASON_EMOJI,
  SEASON_LABELS,
  type Season,
} from "@/lib/seasons";
import type { RecipeFilters } from "@/lib/recipe-filters";
import { activeFilterCount } from "@/lib/recipe-filters";

export function RecipeFilterChips({
  filters,
  onChange,
}: {
  filters: RecipeFilters;
  onChange: (next: RecipeFilters) => void;
}) {
  const dinersConfig = useDiners();
  const dinerKeys = activeDinerKeys(dinersConfig);
  const toggleSeason = (s: Season) =>
    onChange({ ...filters, season: filters.season === s ? null : s });
  const toggleDiner = (d: Diner) =>
    onChange({
      ...filters,
      diners: filters.diners.includes(d)
        ? filters.diners.filter((x) => x !== d)
        : [...filters.diners, d],
    });
  const toggleFlag = (key: "loved" | "quick") =>
    onChange({ ...filters, [key]: !filters[key] });
  const cycleStars = () =>
    onChange({ ...filters, minStars: (filters.minStars + 1) % 6 });
  const reset = () =>
    onChange({
      search: filters.search,
      season: null,
      diners: [],
      loved: false,
      quick: false,
      minStars: 0,
    });

  const active = activeFilterCount(filters);

  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto overflow-y-hidden -mx-4 px-4 py-1 scroll-px-4 snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 32px), transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 32px), transparent 100%)",
      }}
    >
      <Chip active={filters.quick} onClick={() => toggleFlag("quick")}>
        <Clock className="size-3" />
        <span>≤ 30 min</span>
      </Chip>
      <span className="h-5 w-px bg-border shrink-0" />
      <Chip active={filters.loved} onClick={() => toggleFlag("loved")}>
        <span>❤️</span>
        <span>Adoré</span>
      </Chip>
      {dinerKeys.map((d) => (
        <Chip
          key={d}
          active={filters.diners.includes(d)}
          onClick={() => toggleDiner(d)}
        >
          <span
            className={cn(
              "inline-flex items-center justify-center size-4 rounded-full text-[9px] font-bold text-white",
              dinerColorBg(dinersConfig, d)
            )}
          >
            {dinerInitials(dinersConfig, d)}
          </span>
          <span>{dinerLabel(dinersConfig, d)}</span>
        </Chip>
      ))}
      <span className="h-5 w-px bg-border shrink-0" />
      {SEASONS.filter((s) => s !== "all").map((s) => (
        <Chip
          key={s}
          active={filters.season === s}
          onClick={() => toggleSeason(s)}
        >
          <span>{SEASON_EMOJI[s]}</span>
          <span>{SEASON_LABELS[s]}</span>
        </Chip>
      ))}
      <Chip active={filters.minStars > 0} onClick={cycleStars}>
        <Star
          className={cn(
            "size-3",
            filters.minStars > 0 && "fill-gold text-gold"
          )}
        />
        <span>{filters.minStars > 0 ? `${filters.minStars}+` : "Notes"}</span>
      </Chip>
      {active > 0 && (
        <button
          onClick={reset}
          className="ml-1 text-xs text-muted-foreground hover:text-danger inline-flex items-center gap-1 px-2 py-1 shrink-0"
          aria-label="Réinitialiser les filtres"
        >
          <X className="size-3" />
          Reset
        </button>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full text-xs font-medium border transition-colors shrink-0 whitespace-nowrap snap-start",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-soft"
          : "bg-card border-border hover:border-border-strong text-foreground-soft hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
