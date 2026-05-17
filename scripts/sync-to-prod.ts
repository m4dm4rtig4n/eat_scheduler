import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCAL = process.env.LOCAL_BASE ?? "http://localhost:3000";
const PROD = process.env.PROD_BASE ?? "http://localhost:3001";
const SLEEP_MS = 200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DRY_RUN = process.env.DRY_RUN === "1" || process.argv.includes("--dry");

// Parse un fichier .env (KEY=VALUE par ligne, # = commentaire). Retourne {} si absent.
function loadEnvFile(path: string): Record<string, string> {
  try {
    const content = readFileSync(resolve(path), "utf8");
    const out: Record<string, string> = {};
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

const LOCAL_ENV = loadEnvFile(".env.local");
const REMOTE_ENV = loadEnvFile(".env.remote");

// Récupère le cookie eat_session via POST /api/auth/login.
async function loginAndGetCookie(base: string, password: string): Promise<string> {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed on ${base}: ${res.status} ${await res.text()}`);
  }
  // En Node fetch, on récupère tous les Set-Cookie via getSetCookie().
  const setCookies = res.headers.getSetCookie();
  const session = setCookies
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("eat_session="));
  if (!session) throw new Error(`No eat_session cookie in login response from ${base}`);
  return session;
}

// L'app exige une session authentifiée sur /api/*. On supporte deux modes :
//   - LOCAL_COOKIE / PROD_COOKIE  : valeur brute du cookie "eat_session=..."
//   - LOCAL_PASSWORD / PROD_PASSWORD : on se logge via /api/auth/login
// APP_PASSWORD sert de fallback partagé (utile quand local et distant ont le même mdp).
//
// TODO(toi) : implémenter la logique de décision ci-dessous.
// Contrat attendu :
//   - return { Cookie: "eat_session=..." } si une auth est trouvée
//   - return {} si l'env l'autorise explicitement (auth désactivée côté serveur)
//   - throw avec un message clair sinon
async function buildHeaders(
  base: string,
  side: "local" | "prod"
): Promise<Record<string, string>> {
  const fileEnv = side === "local" ? LOCAL_ENV : REMOTE_ENV;
  const cookieEnv =
    (side === "local" ? process.env.LOCAL_COOKIE : process.env.PROD_COOKIE) ??
    fileEnv.SESSION_COOKIE;
  const passwordEnv =
    (side === "local" ? process.env.LOCAL_PASSWORD : process.env.PROD_PASSWORD) ??
    fileEnv.APP_PASSWORD ??
    process.env.APP_PASSWORD;

  if (cookieEnv) {
    const value = cookieEnv.startsWith("eat_session=") ? cookieEnv : `eat_session=${cookieEnv}`;
    return { Cookie: value };
  }
  if (passwordEnv) {
    const cookie = await loginAndGetCookie(base, passwordEnv);
    return { Cookie: cookie };
  }
  const file = side === "local" ? ".env.local" : ".env.remote";
  throw new Error(
    `Pas d'auth pour ${side} (${base}). Définis APP_PASSWORD dans ${file}, ou ${side === "local" ? "LOCAL_COOKIE/LOCAL_PASSWORD" : "PROD_COOKIE/PROD_PASSWORD"} dans l'environnement.`
  );
}

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
  const localHeaders = await buildHeaders(LOCAL, "local");
  const prodHeaders = await buildHeaders(PROD, "prod");

  const localRes = await fetch(`${LOCAL}/api/recipes`, { headers: localHeaders });
  if (!localRes.ok) throw new Error(`Local GET ${localRes.status}`);
  const local = (await localRes.json()) as Recipe[];

  const prodRes = await fetch(`${PROD}/api/recipes`, { headers: prodHeaders });
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

  if (DRY_RUN) {
    console.log("Mode dry-run, liste des recettes locales absentes du distant :");
    for (const r of toPush) console.log(`  - ${r.name}`);
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const recipe of toPush) {
    try {
      const res = await fetch(`${PROD}/api/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...prodHeaders },
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
