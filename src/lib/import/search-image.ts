const PEXELS_URL = "https://api.pexels.com/v1/search";

type PexelsPhoto = {
  src: { large: string; medium: string; small: string; original: string };
  alt: string;
};

type PexelsResponse = {
  photos: PexelsPhoto[];
  total_results: number;
};

const STOP_WORDS = new Set([
  "à",
  "a",
  "au",
  "aux",
  "de",
  "du",
  "des",
  "le",
  "la",
  "les",
  "et",
  "en",
  "ou",
  "un",
  "une",
  "sur",
  "pour",
  "par",
  "sous",
  "dans",
  "avec",
  "sans",
]);

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function buildSearchQueries(recipeName: string): string[] {
  const cleaned = recipeName
    .replace(/\//g, " ")
    .replace(/[&,;.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned
    .toLowerCase()
    .split(" ")
    .map((t) => t.replace(/[()'"]/g, ""))
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  const queries: string[] = [];
  if (cleaned) queries.push(cleaned);
  if (tokens.length >= 1) queries.push(tokens.slice(0, 3).join(" "));
  if (tokens.length >= 1) queries.push(stripDiacritics(tokens.slice(0, 2).join(" ")));
  queries.push("food dish");
  return [...new Set(queries)];
}

async function searchPexelsOnce(
  query: string,
  apiKey: string,
  perPage = 1
): Promise<string[]> {
  const url = `${PEXELS_URL}?query=${encodeURIComponent(query)}&per_page=${perPage}&locale=fr-FR`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Pexels: clé API invalide");
    }
    if (res.status === 429) {
      throw new Error("Pexels: rate limit dépassé");
    }
    return [];
  }
  const data = (await res.json()) as PexelsResponse;
  if (!data.photos || data.photos.length === 0) return [];
  return data.photos.map((p) => p.src.large);
}

export async function searchRecipeImage(
  recipeName: string,
  apiKey?: string
): Promise<string | null> {
  const key = apiKey ?? process.env.PEXELS_API_KEY;
  if (!key) {
    throw new Error("PEXELS_API_KEY manquante (variable d'environnement)");
  }
  const queries = buildSearchQueries(recipeName);
  for (const q of queries) {
    const urls = await searchPexelsOnce(q, key, 1);
    if (urls.length > 0) return urls[0];
  }
  return null;
}

export async function searchRecipeImages(
  recipeName: string,
  count = 6,
  apiKey?: string
): Promise<string[]> {
  const key = apiKey ?? process.env.PEXELS_API_KEY;
  if (!key) {
    throw new Error("PEXELS_API_KEY manquante (variable d'environnement)");
  }
  const queries = buildSearchQueries(recipeName);
  for (const q of queries) {
    const urls = await searchPexelsOnce(q, key, count);
    if (urls.length > 0) return urls;
  }
  return [];
}

export const __testing = { buildSearchQueries, stripDiacritics };
