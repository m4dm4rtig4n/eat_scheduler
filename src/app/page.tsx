import Link from "next/link";
import { Settings } from "lucide-react";
import { listRecipes } from "@/lib/db/recipes";
import { listMealsBetween } from "@/lib/db/meals";
import { addDays, formatDateISO, startOfWeek } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { WeekPlanner } from "@/components/week-planner";

export const dynamic = "force-dynamic";

// Parse un paramètre ?week=YYYY-MM-DD. Retourne le lundi de la semaine
// correspondante si valide, sinon la semaine en cours (fallback silencieux).
function resolveWeekStart(raw: string | string[] | undefined): Date {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const candidate = new Date(y, m - 1, d);
    const valid =
      candidate.getFullYear() === y &&
      candidate.getMonth() === m - 1 &&
      candidate.getDate() === d;
    if (valid) return startOfWeek(candidate);
  }
  return startOfWeek(new Date());
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const weekStart = resolveWeekStart(params.week);
  const start = formatDateISO(weekStart);
  const end = formatDateISO(addDays(weekStart, 6));

  const [recipes, meals] = await Promise.all([
    listRecipes(),
    listMealsBetween(start, end),
  ]);

  return (
    <>
      <PageHeader
        title="Planning"
        action={
          <Link
            href="/settings"
            className="size-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary-soft/40 transition-colors"
            aria-label="Réglages"
            title="Réglages"
          >
            <Settings className="size-5" />
          </Link>
        }
      />
      <WeekPlanner
        recipes={recipes}
        initialMeals={meals}
        initialWeekStart={start}
      />
    </>
  );
}
