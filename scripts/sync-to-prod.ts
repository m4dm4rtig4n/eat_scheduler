const LOCAL = process.env.LOCAL_BASE ?? "http://localhost:3000";
const PROD = process.env.PROD_BASE ?? "http://localhost:3001";
const SLEEP_MS = 200;
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

function toPayload(r: Recipe) {
  return {
    name: r.name,
    description: r.description,
    servings: r.servings,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    instructions: r.instructions,
    sourceUrl: r.sourceUrl,
    imageUrl: r.imageUrl,
    weight: r.weight,
    season: r.season,
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      position: i.position,
    })),
    preferences: r.preferences,
    allowedSlots: r.allowedSlots ?? [],
  };
}

async function main() {
  const localRes = await fetch(`${LOCAL}/api/recipes`);
  if (!localRes.ok) throw new Error(`Local GET ${localRes.status}`);
  const local = (await localRes.json()) as Recipe[];

  const prodRes = await fetch(`${PROD}/api/recipes`);
  if (!prodRes.ok) throw new Error(`Prod GET ${prodRes.status}`);
  const prod = (await prodRes.json()) as Recipe[];

  const prodNames = new Set(prod.map((r) => r.name.toLowerCase().trim()));
  const toPush = local.filter(
    (r) => !prodNames.has(r.name.toLowerCase().trim())
  );

  console.log(`Local: ${local.length} recettes`);
  console.log(`Prod : ${prod.length} recettes`);
  console.log(`À pousser: ${toPush.length}`);
  console.log("");

  if (toPush.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const recipe of toPush) {
    try {
      const res = await fetch(`${PROD}/api/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(recipe)),
      });
      if (!res.ok) {
        const body = await res.text();
        console.log(`  ERR ${recipe.name}: ${res.status} ${body.slice(0, 200)}`);
        fail++;
      } else {
        const created = await res.json();
        console.log(`  OK  ${recipe.name} -> id=${created.id}`);
        ok++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ERR ${recipe.name}: ${msg}`);
      fail++;
    }
    await sleep(SLEEP_MS);
  }

  console.log("");
  console.log(`Terminé: ${ok} succès, ${fail} échecs`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
