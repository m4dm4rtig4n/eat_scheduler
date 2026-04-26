# Eat Scheduler

Planificateur de repas hebdomadaires (PWA mobile-first) avec liste de courses générée et import de recettes depuis URL.

## Stack

- **Next.js 16** (App Router) + React 19
- **Drizzle ORM** avec switch SQLite/Postgres via `DATABASE_URL`
- **Tailwind CSS v4**
- **Zod** pour la validation
- **mise** pour la gestion des outils

## Démarrage

```bash
mise install            # installe Node 24 + pnpm 10
pnpm install
pnpm db:generate        # génère les migrations Drizzle
pnpm db:migrate         # applique les migrations
pnpm dev                # serveur dev sur http://localhost:3000
```

## Configuration DB

`.env.local` :

```bash
# SQLite (par défaut, dev)
DATABASE_URL="file:./data/eat.db"

# PostgreSQL (prod)
DATABASE_URL="postgresql://user:password@host:5432/eat_scheduler"
```

Le dialecte est détecté automatiquement depuis l'URI. Les migrations sont stockées dans `drizzle/sqlite/` et `drizzle/postgres/`.

## Scripts

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production |
| `pnpm start` | Démarre le build de production |
| `pnpm db:generate` | Génère les migrations depuis le schema |
| `pnpm db:migrate` | Applique les migrations |
| `pnpm db:studio` | Ouvre Drizzle Studio (UI de la DB) |

## Fonctionnalités

- **Planning hebdomadaire** : grille 7 jours × midi/soir, ajustement des portions (+/-)
- **Recettes** : CRUD avec ingrédients dynamiques
- **Import URL** : extraction automatique depuis schema.org/Recipe (Marmiton, 750g, etc.)
- **Liste de courses** : agrégation par ingrédient, cases à cocher persistantes
- **PWA** : installable sur mobile, cache offline pour les pages

## Déploiement

### Docker

```bash
docker compose up -d
```

### Kubernetes (Helm)

Le chart `helm/eat-scheduler` supporte SQLite (avec PVC) ou Postgres (via secret).

```bash
helm template helm/eat-scheduler -f helm/eat-scheduler/example/values.yaml
helm install eat helm/eat-scheduler -f helm/eat-scheduler/example/values.yaml
```

## Structure

```
src/
├── app/
│   ├── page.tsx                 # Planning de la semaine
│   ├── recipes/                 # Liste, création, édition
│   ├── shopping/page.tsx        # Liste de courses
│   └── api/                     # Route handlers
├── components/
│   ├── ui/                      # Boutons, inputs
│   ├── week-planner.tsx
│   ├── recipe-form.tsx
│   ├── shopping-view.tsx
│   └── bottom-nav.tsx
└── lib/
    ├── db/
    │   ├── index.ts             # Connexion (URI-based)
    │   ├── schema-sqlite.ts
    │   ├── schema-postgres.ts
    │   ├── recipes.ts
    │   └── meals.ts
    ├── import/parse-recipe.ts   # Parser JSON-LD
    ├── shopping-list.ts         # Agrégation
    └── validators.ts            # Zod schemas
```
