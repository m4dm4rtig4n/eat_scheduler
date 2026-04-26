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
      <PageHeader title="Planning" />
      <WeekPlanner
        recipes={recipes}
        initialMeals={meals}
        initialWeekStart={start}
      />
    </>
  );
}
