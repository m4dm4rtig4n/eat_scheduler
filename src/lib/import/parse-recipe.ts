import type { RecipeInput } from "@/lib/validators";

type JsonLdValue = unknown;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function extractJsonLdBlocks(html: string): JsonLdValue[] {
  const blocks: JsonLdValue[] = [];
  const regex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      const parsed = JSON.parse(raw);
      blocks.push(parsed);
    } catch {
      // Certains sites embarquent du JSON-LD invalide
    }
  }
  return blocks;
}

function flattenJsonLd(node: JsonLdValue): unknown[] {
  const out: unknown[] = [];
  const walk = (n: unknown) => {
    if (Array.isArray(n)) {
      for (const item of n) walk(item);
      return;
    }
    if (n && typeof n === "object") {
      out.push(n);
      const obj = n as Record<string, unknown>;
      if (Array.isArray(obj["@graph"])) {
        for (const item of obj["@graph"]) walk(item);
      }
    }
  };
  walk(node);
  return out;
}

function isRecipeNode(n: unknown): n is Record<string, unknown> {
  if (!n || typeof n !== "object") return false;
  const type = (n as Record<string, unknown>)["@type"];
  if (type === "Recipe") return true;
  if (Array.isArray(type) && type.includes("Recipe")) return true;
  return false;
}

function findRecipeNode(blocks: JsonLdValue[]): Record<string, unknown> | null {
  for (const block of blocks) {
    for (const node of flattenJsonLd(block)) {
      if (isRecipeNode(node)) return node as Record<string, unknown>;
    }
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v) && v.length > 0) return asString(v[0]);
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text.trim();
    if (typeof obj.name === "string") return obj.name.trim();
    if (typeof obj.url === "string") return obj.url.trim();
  }
  return null;
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map(asString).filter((x): x is string => !!x);
  }
  const single = asString(v);
  return single ? [single] : [];
}

function parseDurationISO(d: unknown): number | null {
  const s = asString(d);
  if (!s) return null;
  const m = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
  if (!m) return null;
  const hours = m[1] ? parseInt(m[1], 10) : 0;
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  return hours * 60 + minutes;
}

function parseServings(v: unknown): number {
  const s = asString(v);
  if (!s) return 2;
  const m = s.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 2;
}

const QUANTITY_REGEX =
  /^\s*((?:\d+[.,]?\d*|\d*\s?\d+\/\d+|½|¼|¾|⅓|⅔)\s*(?:[a-zA-Zàâäéèêëïîôöùûüç.]+)?)\s+(?:de\s+|d['']\s*)?(.+)$/i;

export function splitIngredientLine(line: string): {
  name: string;
  quantity: string;
} {
  const cleaned = line.replace(/\s+/g, " ").trim();
  const match = cleaned.match(QUANTITY_REGEX);
  if (match) {
    const quantity = match[1].trim();
    const name = match[2].trim();
    if (name.length > 0) {
      return { name, quantity };
    }
  }
  return { name: cleaned, quantity: "1" };
}

export async function parseRecipeFromUrl(url: string): Promise<RecipeInput> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; EatScheduler/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Echec recuperation URL: ${response.status}`);
  }
  const html = await response.text();
  const blocks = extractJsonLdBlocks(html);
  const recipe = findRecipeNode(blocks);
  if (!recipe) {
    throw new Error(
      "Aucune recette trouvee dans la page (pas de schema.org/Recipe)"
    );
  }

  const name = asString(recipe.name) ?? "Recette importee";
  const description = asString(recipe.description);
  const servings = parseServings(recipe.recipeYield ?? recipe.yield);
  const prepTime = parseDurationISO(recipe.prepTime);
  const cookTime = parseDurationISO(recipe.cookTime);
  const ingredientsLines = asStringArray(recipe.recipeIngredient);
  const instructions = asStringArray(recipe.recipeInstructions).join("\n");
  const image = asString(recipe.image);

  return {
    name: decodeHtmlEntities(name),
    description: description ? decodeHtmlEntities(description) : null,
    servings,
    prepTime,
    cookTime,
    instructions: instructions ? decodeHtmlEntities(instructions) : null,
    sourceUrl: url,
    imageUrl: image,
    weight: 3,
    season: "all",
    allowedSlots: [],
    ingredients: ingredientsLines.map((line, position) => {
      const { name: iName, quantity } = splitIngredientLine(
        decodeHtmlEntities(line)
      );
      return { name: iName, quantity, position };
    }),
    preferences: [],
  };
}
