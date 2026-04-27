import Link from "next/link";
import { Settings } from "lucide-react";
import { listRecipes } from "@/lib/db/recipes";
import { listMealsBetween } from "@/lib/db/meals";
import { addDays, formatDateISO, startOfWeek } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { WeekPlanner } from "@/components/week-planner";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const weekStart = startOfWeek(new Date());
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
