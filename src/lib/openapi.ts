// IMPORTANT : zod-init doit être en tout premier pour patcher z.* avant que
// validators.ts ne construise ses schemas.
import "@/lib/zod-init";

import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

import {
  recipeInputSchema,
  plannedMealSchema,
  plannedMealUpdateSchema,
  generateMealsSchema,
  importUrlSchema,
  dinerCreateSchema,
  dinerUpdateSchema,
  dinerReorderSchema,
  slotFavoritesSchema,
  mealSlotOverridesSchema,
} from "@/lib/validators";

const registry = new OpenAPIRegistry();

const Recipe = registry.register("Recipe", recipeInputSchema.openapi({
  example: {
    name: "Pâtes carbonara",
    description: "Recette italienne classique sans crème.",
    servings: 4,
    prepTime: 10,
    cookTime: 15,
    instructions: "Faire revenir les lardons. Cuire les pâtes. Mélanger jaunes d'œufs, parmesan et poivre. Hors du feu, mélanger le tout.",
    sourceUrl: null,
    imageUrl: null,
    weight: 3,
    season: "all",
    ingredients: [
      { name: "spaghetti", quantity: "400g", position: 0 },
      { name: "lardons", quantity: "200g", position: 1 },
      { name: "jaunes d'œufs", quantity: "4", position: 2 },
      { name: "parmesan râpé", quantity: "80g", position: 3 },
      { name: "poivre noir", quantity: "au goût", position: 4 },
    ],
    preferences: [
      { diner: "clement", preference: "love" },
      { diner: "nath", preference: "like" },
    ],
    allowedSlots: [],
  },
}));

const PlannedMeal = registry.register("PlannedMeal", plannedMealSchema.openapi({
  example: {
    date: "2026-05-04",
    mealType: "dinner",
    recipeId: 14,
    servingsMultiplier: 1,
    diners: ["clement", "nath", "chloe", "simon"],
    notes: null,
  },
}));

const PlannedMealUpdate = registry.register("PlannedMealUpdate", plannedMealUpdateSchema.openapi({
  example: { servingsMultiplier: 1.5 },
}));

const GenerateMeals = registry.register("GenerateMeals", generateMealsSchema.openapi({
  example: {
    startDate: "2026-05-05",
    endDate: "2026-05-11",
    mode: "fill",
    mealTypes: ["lunch", "dinner"],
  },
}));

const ImportUrl = registry.register("ImportUrl", importUrlSchema.openapi({
  example: { url: "https://www.marmiton.org/recettes/recette_pates-carbonara_23223.aspx" },
}));

const DinerCreate = registry.register("DinerCreate", dinerCreateSchema.openapi({
  example: { key: "louis", label: "Louis", initials: "LV", colorKey: "blue", coefficient: 0.7 },
}));

const DinerUpdate = registry.register("DinerUpdate", dinerUpdateSchema);
const DinerReorder = registry.register("DinerReorder", dinerReorderSchema);
const SlotFavorites = registry.register("SlotFavorites", slotFavoritesSchema);
const MealSlotOverrides = registry.register("MealSlotOverrides", mealSlotOverridesSchema);

const ErrorResponse = registry.register(
  "Error",
  z.object({
    error: z.string(),
    details: z.unknown().optional(),
  })
);

// Header d'auth utilisé par les clients API (Claude, scripts, etc.). Le proxy
// reconnaît ce header en plus du cookie de session.
registry.registerComponent("securitySchemes", "ApiToken", {
  type: "apiKey",
  in: "header",
  name: "X-API-Token",
  description:
    "Token d'API : le mot de passe applicatif (APP_PASSWORD) est accepté ici. " +
    "Si APP_PASSWORD n'est pas défini côté serveur, l'API est ouverte.",
});

const okJson = (schema: z.ZodTypeAny) => ({
  description: "OK",
  content: { "application/json": { schema } },
});
const createdJson = (schema: z.ZodTypeAny) => ({
  description: "Created",
  content: { "application/json": { schema } },
});
const errorJson = (description: string) => ({
  description,
  content: { "application/json": { schema: ErrorResponse } },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes",
  tags: ["Recipes"],
  summary: "Liste toutes les recettes",
  responses: {
    200: okJson(z.array(Recipe)),
    401: errorJson("Non authentifié"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/recipes",
  tags: ["Recipes"],
  summary: "Crée une recette",
  request: { body: { content: { "application/json": { schema: Recipe } }, required: true } },
  responses: {
    201: createdJson(Recipe),
    400: errorJson("Validation"),
    401: errorJson("Non authentifié"),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/recipes/{id}",
  tags: ["Recipes"],
  summary: "Détail d'une recette",
  request: { params: z.object({ id: z.coerce.number().int().positive() }) },
  responses: {
    200: okJson(Recipe),
    404: errorJson("Inconnu"),
  },
});

registry.registerPath({
  method: "put",
  path: "/api/recipes/{id}",
  tags: ["Recipes"],
  summary: "Met à jour une recette",
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: { content: { "application/json": { schema: Recipe } }, required: true },
  },
  responses: {
    200: okJson(Recipe),
    400: errorJson("Validation"),
    404: errorJson("Inconnu"),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/meals",
  tags: ["Meals"],
  summary: "Repas planifiés entre deux dates (inclusives)",
  request: {
    query: z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: "2026-05-04" }),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).openapi({ example: "2026-05-10" }),
    }),
  },
  responses: { 200: okJson(z.array(PlannedMeal)) },
});

registry.registerPath({
  method: "post",
  path: "/api/meals",
  tags: ["Meals"],
  summary: "Crée un repas planifié",
  request: { body: { content: { "application/json": { schema: PlannedMeal } }, required: true } },
  responses: { 201: createdJson(PlannedMeal), 400: errorJson("Validation") },
});

registry.registerPath({
  method: "put",
  path: "/api/meals/{id}",
  tags: ["Meals"],
  summary: "Met à jour un repas",
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: { content: { "application/json": { schema: PlannedMealUpdate } }, required: true },
  },
  responses: { 200: okJson(PlannedMeal), 404: errorJson("Inconnu") },
});

registry.registerPath({
  method: "post",
  path: "/api/meals/generate",
  tags: ["Meals"],
  summary: "Génère un planning automatique sur la période",
  request: { body: { content: { "application/json": { schema: GenerateMeals } }, required: true } },
  responses: { 200: okJson(z.array(PlannedMeal)) },
});

registry.registerPath({
  method: "post",
  path: "/api/import",
  tags: ["Recipes"],
  summary: "Importe une recette depuis une URL (schema.org/Recipe)",
  request: { body: { content: { "application/json": { schema: ImportUrl } }, required: true } },
  responses: { 200: okJson(Recipe), 400: errorJson("URL invalide ou impossible à parser") },
});

registry.registerPath({
  method: "get",
  path: "/api/shopping-list",
  tags: ["Shopping"],
  summary: "Liste de courses agrégée pour une période",
  request: {
    query: z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  },
  responses: {
    200: okJson(
      z.array(z.object({
        name: z.string(),
        quantities: z.array(z.string()),
        checked: z.boolean(),
      }))
    ),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/diners",
  tags: ["Diners"],
  summary: "Liste des convives",
  responses: { 200: okJson(z.array(z.unknown())) },
});

registry.registerPath({
  method: "post",
  path: "/api/diners",
  tags: ["Diners"],
  summary: "Crée un convive",
  request: { body: { content: { "application/json": { schema: DinerCreate } }, required: true } },
  responses: { 201: createdJson(z.unknown()), 400: errorJson("Validation") },
});

registry.registerPath({
  method: "put",
  path: "/api/diners/{id}",
  tags: ["Diners"],
  summary: "Met à jour un convive",
  request: {
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: { content: { "application/json": { schema: DinerUpdate } }, required: true },
  },
  responses: { 200: okJson(z.unknown()) },
});

registry.registerPath({
  method: "post",
  path: "/api/diners/reorder",
  tags: ["Diners"],
  summary: "Réordonne les convives",
  request: { body: { content: { "application/json": { schema: DinerReorder } }, required: true } },
  responses: { 200: okJson(z.unknown()) },
});

registry.registerPath({
  method: "post",
  path: "/api/slot-favorites",
  tags: ["Meals"],
  summary: "Définit les recettes favorites/épinglées d'un slot (jour x lunch/dinner)",
  request: { body: { content: { "application/json": { schema: SlotFavorites } }, required: true } },
  responses: { 200: okJson(z.unknown()) },
});

registry.registerPath({
  method: "post",
  path: "/api/meal-slot-overrides",
  tags: ["Meals"],
  summary: "Override la présence des convives sur un slot précis",
  request: { body: { content: { "application/json": { schema: MealSlotOverrides } }, required: true } },
  responses: { 200: okJson(z.unknown()) },
});

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Eat Scheduler API",
      version: "1.0.0",
      description:
        "API REST du planificateur de repas. Sert à créer/lister/modifier des recettes et planifier des repas depuis un agent (Claude) ou un script.",
    },
    servers: [{ url: "/", description: "Instance courante" }],
    security: [{ ApiToken: [] }],
  });
}
