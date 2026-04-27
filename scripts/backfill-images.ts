import { searchRecipeImage } from "@/lib/import/search-image";

const API_BASE = process.env.API_BASE ?? "http://localhost:3000";
const SLEEP_MS = 800;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Recipe = {
  id: number;
  name: string;
  description: string | null;
  servings: number;
  prepTime: number | null;
  cookTime: number | null;
  instructions: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  weight: number;
  season: string;
  ingredients: Array<{ name: string; quantity: string; position: number }>;
  preferences: Array<{ diner: string; preference: string }>;
  allowedSlots?: Array<{ dayOfWeek: number; mealType: string }>;
};

async function main() {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error("Erreur: PEXELS_API_KEY manquante. Ajoute-la dans .env.local");
    process.exit(1);
  }

  const listRes = await fetch(`${API_BASE}/api/recipes`);
  if (!listRes.ok) {
    console.error(`Erreur GET /api/recipes: ${listRes.status}`);
    process.exit(1);
  }
  const all = (await listRes.json()) as Recipe[];
  const targets = all.filter((r) => !r.imageUrl);

  console.log(`Recettes sans image: ${targets.length} / ${all.length}`);

  let ok = 0;
  let fail = 0;
  for (const recipe of targets) {
    try {
      const url = await searchRecipeImage(recipe.name, apiKey);
      if (!url) {
        console.log(`  --  ${recipe.id} - ${recipe.name} (aucun résultat)`);
        fail++;
        await sleep(SLEEP_MS);
        continue;
      }

      const payload = {
        name: recipe.name,
        description: recipe.description,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        instructions: recipe.instructions,
        sourceUrl: recipe.sourceUrl,
        imageUrl: url,
        weight: recipe.weight,
        season: recipe.season,
        ingredients: recipe.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          position: i.position,
        })),
        preferences: recipe.preferences,
        allowedSlots: recipe.allowedSlots ?? [],
      };

      const putRes = await fetch(`${API_BASE}/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!putRes.ok) {
        const body = await putRes.text();
        console.log(`  ERR ${recipe.id} - ${recipe.name}: PUT ${putRes.status} ${body.slice(0, 200)}`);
        fail++;
      } else {
        console.log(`  OK  ${recipe.id} - ${recipe.name}`);
        ok++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ERR ${recipe.id} - ${recipe.name}: ${msg}`);
      fail++;
      if (msg.includes("invalide") || msg.includes("rate limit")) break;
    }
    await sleep(SLEEP_MS);
  }

  console.log(`\nTerminé: ${ok} succès, ${fail} échecs`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
