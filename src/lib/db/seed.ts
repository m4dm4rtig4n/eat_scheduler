import { db, schema } from "./index";
import type { Diner, Preference } from "@/lib/diners";
import type { Season } from "@/lib/seasons";

type SeedRecipe = {
  name: string;
  weight: number;
  season: Season;
  ingredients: Array<{ name: string; quantity: string }>;
  preferences?: Partial<Record<Diner, Preference>>;
  servings?: number;
};

// Préférences par défaut, ajuste l'enfant pour les plats "complexes"
const childDislikes = (name: string): boolean => {
  const lower = name.toLowerCase();
  return [
    "moules",
    "tartare",
    "fruits de mer",
    "wok saumon",
    "ramen",
    "champignons farcis",
    "endives",
    "lapin",
    "mont d'or",
    "maroilles",
    "bleu",
    "chèvre chaud",
    "roquefort",
    "chili",
    "couscous",
    "tomates farcies",
    "lentilles",
    "gigot",
    "tagliatelles fruits de mer",
    "wraps saumon",
    "tarte saumon",
    "quinoa",
  ].some((kw) => lower.includes(kw));
};

const childLoves = (name: string): boolean => {
  const lower = name.toLowerCase();
  return [
    "burger",
    "frites",
    "lasagnes",
    "carbo",
    "hachis",
    "croque",
    "hot dog",
    "pizza",
    "fajitas",
    "saucisses",
    "steack",
    "gnocchi",
    "œuf",
    "oeuf",
    "galette",
    "raclette",
  ].some((kw) => lower.includes(kw));
};

function defaultPreferences(name: string): Array<{ diner: Diner; preference: Preference }> {
  const childPref: Preference = childDislikes(name)
    ? "dislike"
    : childLoves(name)
    ? "love"
    : "like";
  return [
    { diner: "clement", preference: "like" },
    { diner: "nath", preference: "like" },
    { diner: "chloe", preference: childPref },
    { diner: "simon", preference: childPref },
  ];
}

const RECIPES: SeedRecipe[] = [
  {
    name: "Crevettes curry coco / riz à l'ail",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "crevettes", quantity: "400g" },
      { name: "lait de coco", quantity: "40cl" },
      { name: "pâte de curry", quantity: "2 c.à.s" },
      { name: "riz", quantity: "200g" },
      { name: "ail", quantity: "3 gousses" },
      { name: "oignon", quantity: "1" },
    ],
  },
  {
    name: "Cuisse de poulet sauce maroilles / frites",
    weight: 4,
    season: "winter",
    ingredients: [
      { name: "cuisses de poulet", quantity: "4" },
      { name: "maroilles", quantity: "150g" },
      { name: "crème fraîche", quantity: "20cl" },
      { name: "frites surgelées", quantity: "1kg" },
    ],
  },
  {
    name: "Poulet sauce ail et fines herbes / PDT vapeur",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "blancs de poulet", quantity: "4" },
      { name: "boursin ail et fines herbes", quantity: "1" },
      { name: "crème fraîche", quantity: "20cl" },
      { name: "pommes de terre", quantity: "800g" },
    ],
  },
  {
    name: "Pâtes carbonara",
    weight: 5,
    season: "all",
    ingredients: [
      { name: "pâtes", quantity: "400g" },
      { name: "lardons", quantity: "200g" },
      { name: "œufs", quantity: "4" },
      { name: "parmesan", quantity: "100g" },
      { name: "poivre", quantity: "1 pincée" },
    ],
  },
  {
    name: "Pâtes au saumon",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "pâtes", quantity: "400g" },
      { name: "saumon fumé", quantity: "200g" },
      { name: "crème fraîche", quantity: "20cl" },
      { name: "aneth", quantity: "1 bouquet" },
    ],
  },
  {
    name: "Coq à la bière",
    weight: 4,
    season: "winter",
    ingredients: [
      { name: "coq", quantity: "1.5kg" },
      { name: "bière brune", quantity: "75cl" },
      { name: "lardons", quantity: "150g" },
      { name: "champignons", quantity: "300g" },
      { name: "oignons", quantity: "2" },
    ],
  },
  {
    name: "Carbonnade flamande",
    weight: 4,
    season: "winter",
    ingredients: [
      { name: "bœuf à mijoter", quantity: "1kg" },
      { name: "bière brune", quantity: "75cl" },
      { name: "oignons", quantity: "3" },
      { name: "pain d'épices", quantity: "3 tranches" },
      { name: "moutarde", quantity: "2 c.à.s" },
    ],
  },
  {
    name: "Moules / frites",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "moules", quantity: "2kg" },
      { name: "vin blanc", quantity: "20cl" },
      { name: "échalotes", quantity: "3" },
      { name: "persil", quantity: "1 bouquet" },
      { name: "frites surgelées", quantity: "1kg" },
    ],
  },
  {
    name: "Rôti de porc Orloff / pommes noisettes",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "rôti de porc Orloff", quantity: "1kg" },
      { name: "pommes noisettes", quantity: "500g" },
    ],
  },
  {
    name: "Saucisses de Toulouse / compote",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "saucisses de Toulouse", quantity: "4" },
      { name: "compote de pommes", quantity: "400g" },
    ],
  },
  {
    name: "Penne au lard et au bleu",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "penne", quantity: "400g" },
      { name: "lardons", quantity: "200g" },
      { name: "fromage bleu", quantity: "100g" },
      { name: "crème fraîche", quantity: "20cl" },
    ],
  },
  {
    name: "Burger maison",
    weight: 5,
    season: "all",
    ingredients: [
      { name: "steaks hachés", quantity: "4" },
      { name: "pains à burger", quantity: "4" },
      { name: "cheddar", quantity: "8 tranches" },
      { name: "salade", quantity: "1" },
      { name: "tomates", quantity: "2" },
      { name: "oignon rouge", quantity: "1" },
    ],
  },
  {
    name: "Tartare de saumon",
    weight: 4,
    season: "summer",
    ingredients: [
      { name: "saumon frais", quantity: "400g" },
      { name: "citron vert", quantity: "1" },
      { name: "aneth", quantity: "1 bouquet" },
      { name: "huile d'olive", quantity: "2 c.à.s" },
      { name: "échalote", quantity: "1" },
    ],
  },
  {
    name: "Endives au jambon gratinées",
    weight: 3,
    season: "winter",
    ingredients: [
      { name: "endives", quantity: "8" },
      { name: "jambon", quantity: "8 tranches" },
      { name: "béchamel", quantity: "50cl" },
      { name: "gruyère râpé", quantity: "100g" },
    ],
  },
  {
    name: "Pâtes à l'arrabiata",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "pâtes", quantity: "400g" },
      { name: "tomates concassées", quantity: "400g" },
      { name: "ail", quantity: "3 gousses" },
      { name: "piment", quantity: "1" },
      { name: "basilic", quantity: "1 bouquet" },
    ],
  },
  {
    name: "Champignons farcis au chèvre frais et aux lardons",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "gros champignons de Paris", quantity: "12" },
      { name: "chèvre frais", quantity: "200g" },
      { name: "lardons", quantity: "150g" },
      { name: "persil", quantity: "1 bouquet" },
    ],
  },
  {
    name: "Gratin de fruits de mer",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "fruits de mer mélangés", quantity: "600g" },
      { name: "béchamel", quantity: "50cl" },
      { name: "vin blanc", quantity: "10cl" },
      { name: "gruyère râpé", quantity: "100g" },
    ],
  },
  {
    name: "Ramen de bœuf",
    weight: 3,
    season: "winter",
    ingredients: [
      { name: "nouilles ramen", quantity: "300g" },
      { name: "bœuf émincé", quantity: "300g" },
      { name: "bouillon", quantity: "1.5L" },
      { name: "œufs", quantity: "2" },
      { name: "ciboule", quantity: "1 bouquet" },
    ],
  },
  {
    name: "Tarte saumon / poireaux",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "pâte brisée", quantity: "1" },
      { name: "saumon fumé", quantity: "200g" },
      { name: "poireaux", quantity: "3" },
      { name: "œufs", quantity: "3" },
      { name: "crème fraîche", quantity: "20cl" },
    ],
  },
  {
    name: "Salade chèvre chaud",
    weight: 4,
    season: "summer",
    ingredients: [
      { name: "salade", quantity: "1" },
      { name: "fromage de chèvre", quantity: "1 bûche" },
      { name: "pain de campagne", quantity: "4 tranches" },
      { name: "miel", quantity: "2 c.à.s" },
      { name: "noix", quantity: "50g" },
    ],
  },
  {
    name: "Pizza maison",
    weight: 5,
    season: "all",
    ingredients: [
      { name: "pâte à pizza", quantity: "2" },
      { name: "sauce tomate", quantity: "200g" },
      { name: "mozzarella", quantity: "250g" },
      { name: "jambon", quantity: "150g" },
      { name: "champignons", quantity: "200g" },
    ],
  },
  {
    name: "Mont d'or / charcuterie",
    weight: 4,
    season: "winter",
    ingredients: [
      { name: "mont d'or", quantity: "1" },
      { name: "charcuterie", quantity: "300g" },
      { name: "pommes de terre", quantity: "800g" },
      { name: "vin blanc", quantity: "10cl" },
    ],
  },
  {
    name: "Cervelas au fromage / purée",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "cervelas au fromage", quantity: "4" },
      { name: "pommes de terre", quantity: "800g" },
      { name: "lait", quantity: "20cl" },
      { name: "beurre", quantity: "50g" },
    ],
  },
  {
    name: "Pâtes bolognaise",
    weight: 5,
    season: "all",
    ingredients: [
      { name: "pâtes", quantity: "400g" },
      { name: "viande hachée", quantity: "500g" },
      { name: "tomates concassées", quantity: "400g" },
      { name: "oignon", quantity: "1" },
      { name: "carotte", quantity: "1" },
    ],
  },
  {
    name: "Lasagnes",
    weight: 5,
    season: "all",
    ingredients: [
      { name: "plaques de lasagnes", quantity: "1 paquet" },
      { name: "viande hachée", quantity: "500g" },
      { name: "tomates concassées", quantity: "400g" },
      { name: "béchamel", quantity: "50cl" },
      { name: "gruyère râpé", quantity: "150g" },
    ],
  },
  {
    name: "Filet mignon au maroilles",
    weight: 4,
    season: "winter",
    ingredients: [
      { name: "filet mignon de porc", quantity: "800g" },
      { name: "maroilles", quantity: "150g" },
      { name: "crème fraîche", quantity: "20cl" },
      { name: "pommes de terre", quantity: "800g" },
    ],
  },
  {
    name: "Pâtes poulet / chorizo",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "pâtes", quantity: "400g" },
      { name: "blancs de poulet", quantity: "2" },
      { name: "chorizo", quantity: "150g" },
      { name: "crème fraîche", quantity: "20cl" },
      { name: "tomates", quantity: "2" },
    ],
  },
  {
    name: "Lasagne courgettes / chèvre",
    weight: 3,
    season: "summer",
    ingredients: [
      { name: "plaques de lasagnes", quantity: "1 paquet" },
      { name: "courgettes", quantity: "3" },
      { name: "fromage de chèvre", quantity: "200g" },
      { name: "béchamel", quantity: "50cl" },
    ],
  },
  {
    name: "Tagliatelles fruits de mer",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "tagliatelles", quantity: "400g" },
      { name: "fruits de mer mélangés", quantity: "500g" },
      { name: "crème fraîche", quantity: "20cl" },
      { name: "vin blanc", quantity: "10cl" },
      { name: "ail", quantity: "2 gousses" },
    ],
  },
  {
    name: "Wok de saumon",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "saumon", quantity: "400g" },
      { name: "légumes wok surgelés", quantity: "600g" },
      { name: "sauce soja", quantity: "4 c.à.s" },
      { name: "gingembre", quantity: "1 morceau" },
    ],
  },
  {
    name: "Steaks / frites",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "steaks", quantity: "4" },
      { name: "frites surgelées", quantity: "1kg" },
    ],
  },
  {
    name: "Burger",
    weight: 5,
    season: "all",
    ingredients: [
      { name: "burgers surgelés", quantity: "4" },
      { name: "pains à burger", quantity: "4" },
      { name: "cheddar", quantity: "8 tranches" },
    ],
  },
  {
    name: "Paella au Cookeo",
    weight: 4,
    season: "summer",
    ingredients: [
      { name: "riz à paella", quantity: "300g" },
      { name: "poulet", quantity: "400g" },
      { name: "chorizo", quantity: "150g" },
      { name: "fruits de mer", quantity: "300g" },
      { name: "poivrons", quantity: "2" },
      { name: "safran", quantity: "1 dose" },
    ],
  },
  {
    name: "Poulet / semoule / ratatouille",
    weight: 3,
    season: "summer",
    ingredients: [
      { name: "blancs de poulet", quantity: "4" },
      { name: "semoule", quantity: "300g" },
      { name: "ratatouille", quantity: "500g" },
    ],
  },
  {
    name: "Gigot / flageolets",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "gigot d'agneau", quantity: "1.5kg" },
      { name: "flageolets", quantity: "1 boîte" },
      { name: "ail", quantity: "4 gousses" },
      { name: "thym", quantity: "1 branche" },
    ],
  },
  {
    name: "Escalopes de veau / purée / petits pois",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "escalopes de veau", quantity: "4" },
      { name: "pommes de terre", quantity: "800g" },
      { name: "petits pois", quantity: "400g" },
      { name: "lait", quantity: "20cl" },
    ],
  },
  {
    name: "Quiche lorraine / salade",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "pâte brisée", quantity: "1" },
      { name: "lardons", quantity: "200g" },
      { name: "œufs", quantity: "3" },
      { name: "crème fraîche", quantity: "20cl" },
      { name: "salade", quantity: "1" },
    ],
  },
  {
    name: "Lentilles / saucisses",
    weight: 3,
    season: "winter",
    ingredients: [
      { name: "lentilles vertes", quantity: "300g" },
      { name: "saucisses de Morteau", quantity: "2" },
      { name: "carottes", quantity: "2" },
      { name: "oignon", quantity: "1" },
    ],
  },
  {
    name: "Hot dog",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "saucisses de Strasbourg", quantity: "4" },
      { name: "pains hot-dog", quantity: "4" },
      { name: "moutarde", quantity: "à volonté" },
      { name: "ketchup", quantity: "à volonté" },
    ],
  },
  {
    name: "Couscous",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "merguez", quantity: "4" },
      { name: "poulet", quantity: "4 cuisses" },
      { name: "semoule", quantity: "400g" },
      { name: "légumes couscous", quantity: "1kg" },
      { name: "pois chiches", quantity: "1 boîte" },
    ],
  },
  {
    name: "Œuf à la coque",
    weight: 2,
    season: "all",
    ingredients: [
      { name: "œufs", quantity: "6" },
      { name: "pain", quantity: "4 tranches" },
      { name: "beurre", quantity: "50g" },
    ],
  },
  {
    name: "Œuf au plat / pâtes",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "œufs", quantity: "6" },
      { name: "pâtes", quantity: "400g" },
      { name: "beurre", quantity: "50g" },
    ],
  },
  {
    name: "Galette complète au sarrasin",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "galettes de sarrasin", quantity: "4" },
      { name: "œufs", quantity: "4" },
      { name: "jambon", quantity: "4 tranches" },
      { name: "gruyère râpé", quantity: "100g" },
    ],
  },
  {
    name: "Hachis parmentier",
    weight: 5,
    season: "all",
    ingredients: [
      { name: "viande hachée", quantity: "500g" },
      { name: "pommes de terre", quantity: "1kg" },
      { name: "oignon", quantity: "1" },
      { name: "lait", quantity: "20cl" },
      { name: "gruyère râpé", quantity: "80g" },
    ],
  },
  {
    name: "Croque-monsieur",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "pain de mie", quantity: "8 tranches" },
      { name: "jambon", quantity: "4 tranches" },
      { name: "gruyère râpé", quantity: "150g" },
      { name: "béchamel", quantity: "20cl" },
    ],
  },
  {
    name: "Pierrade",
    weight: 4,
    season: "winter",
    ingredients: [
      { name: "viandes assorties", quantity: "800g" },
      { name: "pommes de terre", quantity: "800g" },
      { name: "salade", quantity: "1" },
      { name: "sauces", quantity: "3" },
    ],
  },
  {
    name: "Cuisse de lapin aux pruneaux",
    weight: 3,
    season: "winter",
    ingredients: [
      { name: "cuisses de lapin", quantity: "4" },
      { name: "pruneaux", quantity: "200g" },
      { name: "vin blanc", quantity: "20cl" },
      { name: "lardons", quantity: "100g" },
    ],
  },
  {
    name: "Chili con carne",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "viande hachée", quantity: "500g" },
      { name: "haricots rouges", quantity: "1 boîte" },
      { name: "tomates concassées", quantity: "400g" },
      { name: "épices chili", quantity: "2 c.à.s" },
      { name: "riz", quantity: "200g" },
    ],
  },
  {
    name: "Enchiladas",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "tortillas", quantity: "8" },
      { name: "poulet", quantity: "400g" },
      { name: "haricots rouges", quantity: "1 boîte" },
      { name: "sauce tomate", quantity: "300g" },
      { name: "fromage râpé", quantity: "150g" },
    ],
  },
  {
    name: "Fajitas",
    weight: 5,
    season: "all",
    ingredients: [
      { name: "tortillas", quantity: "8" },
      { name: "poulet", quantity: "500g" },
      { name: "poivrons", quantity: "2" },
      { name: "oignon", quantity: "1" },
      { name: "épices fajitas", quantity: "1 sachet" },
    ],
  },
  {
    name: "Tomates farcies",
    weight: 3,
    season: "summer",
    ingredients: [
      { name: "grosses tomates", quantity: "8" },
      { name: "chair à saucisse", quantity: "500g" },
      { name: "riz", quantity: "150g" },
      { name: "oignon", quantity: "1" },
    ],
  },
  {
    name: "Risotto au saumon",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "riz arborio", quantity: "300g" },
      { name: "saumon", quantity: "300g" },
      { name: "bouillon", quantity: "1L" },
      { name: "vin blanc", quantity: "10cl" },
      { name: "parmesan", quantity: "80g" },
    ],
  },
  {
    name: "Risotto champignons / escalope de poulet",
    weight: 3,
    season: "all",
    ingredients: [
      { name: "riz arborio", quantity: "300g" },
      { name: "champignons", quantity: "400g" },
      { name: "escalopes de poulet", quantity: "4" },
      { name: "bouillon", quantity: "1L" },
      { name: "parmesan", quantity: "80g" },
    ],
  },
  {
    name: "Quiche roquefort / tomates",
    weight: 3,
    season: "summer",
    ingredients: [
      { name: "pâte brisée", quantity: "1" },
      { name: "roquefort", quantity: "150g" },
      { name: "tomates", quantity: "3" },
      { name: "œufs", quantity: "3" },
      { name: "crème fraîche", quantity: "20cl" },
    ],
  },
  {
    name: "Wraps saumon fumé",
    weight: 3,
    season: "summer",
    ingredients: [
      { name: "tortillas", quantity: "4" },
      { name: "saumon fumé", quantity: "200g" },
      { name: "fromage frais", quantity: "150g" },
      { name: "salade", quantity: "1" },
      { name: "concombre", quantity: "1" },
    ],
  },
  {
    name: "Quinoa / saumon",
    weight: 3,
    season: "summer",
    ingredients: [
      { name: "quinoa", quantity: "300g" },
      { name: "saumon", quantity: "400g" },
      { name: "courgettes", quantity: "2" },
      { name: "citron", quantity: "1" },
    ],
  },
  {
    name: "Gnocchi / jambon",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "gnocchi", quantity: "500g" },
      { name: "jambon", quantity: "200g" },
      { name: "crème fraîche", quantity: "20cl" },
      { name: "gruyère râpé", quantity: "80g" },
    ],
  },
  {
    name: "Steaks hachés / pâtes",
    weight: 4,
    season: "all",
    ingredients: [
      { name: "steaks hachés", quantity: "4" },
      { name: "pâtes", quantity: "400g" },
      { name: "beurre", quantity: "30g" },
    ],
  },
];

async function main() {
  const { recipes, recipeIngredients, recipePreferences, plannedMeals } = schema;

  // Reset complet
  console.log("→ Suppression des données existantes…");
  await (db as any).delete(plannedMeals);
  await (db as any).delete(recipePreferences);
  await (db as any).delete(recipeIngredients);
  await (db as any).delete(recipes);

  console.log(`→ Insertion de ${RECIPES.length} recettes…`);
  for (const r of RECIPES) {
    const [created] = await (db as any)
      .insert(recipes)
      .values({
        name: r.name,
        servings: r.servings ?? 4,
        weight: r.weight,
        season: r.season,
      })
      .returning();

    if (r.ingredients.length > 0) {
      await (db as any).insert(recipeIngredients).values(
        r.ingredients.map((ing, idx) => ({
          recipeId: created.id,
          name: ing.name,
          quantity: ing.quantity,
          position: idx,
        }))
      );
    }

    const prefs = defaultPreferences(r.name).map((p) =>
      r.preferences && r.preferences[p.diner]
        ? { diner: p.diner, preference: r.preferences[p.diner]! }
        : p
    );
    await (db as any).insert(recipePreferences).values(
      prefs.map((p) => ({
        recipeId: created.id,
        diner: p.diner,
        preference: p.preference,
      }))
    );
  }

  console.log(`✓ Seed terminé : ${RECIPES.length} recettes`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur seed:", err);
  process.exit(1);
});
