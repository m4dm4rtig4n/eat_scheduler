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

## CI/CD

Deux workflows GitHub Actions:

- **`.github/workflows/ci.yml`** (sur PR + branches non-`main`) : type check, build Next.js, validation Helm, build Docker (sans push), validation des messages de commit via commitlint.
- **`.github/workflows/release.yml`** (sur push `main`) : exécute [semantic-release](https://semantic-release.gitbook.io/), bump `package.json` et `helm/eat-scheduler/Chart.yaml`, génère le `CHANGELOG.md`, crée le tag Git et la GitHub Release, puis publie l'image Docker multi-arch (`linux/amd64,linux/arm64`) sur **GHCR**.

### Convention de commit (Conventional Commits)

Le type du commit détermine la version produite :

| Type | Exemple | Bump |
|---|---|---|
| `feat:` | `feat: add weekly export` | minor (`1.2.0` → `1.3.0`) |
| `fix:` | `fix: correct slot ordering` | patch (`1.2.3` → `1.2.4`) |
| `perf:` / `refactor:` / `build:` | | patch |
| `docs:` / `ci:` / `chore:` / `test:` / `style:` | | aucune release |
| Footer `BREAKING CHANGE:` | | major (`1.2.3` → `2.0.0`) |

```bash
# Exemples
git commit -m "feat(recipes): add bulk import from CSV"
git commit -m "fix(shopping): handle empty list edge case"
git commit -m "feat!: rewrite meal generator API

BREAKING CHANGE: meal-generator now returns Promise<MealPlan[]> instead of sync"
```

### Image Docker

Publiée sur GitHub Container Registry après chaque release :

```bash
docker pull ghcr.io/m4dm4rtig4n/eat_scheduler:latest
docker pull ghcr.io/m4dm4rtig4n/eat_scheduler:v1.0.0
```

Tags poussés à chaque release : `latest`, `vX.Y.Z`, `X.Y`, `X`, `sha-<short>`.

### Chart Helm

Le chart est packagé et publié sur GHCR (registre OCI) après chaque release, avec la même version que l'app (`version` + `appVersion` synchronisés).

```bash
# Inspecter le chart sans l'installer
helm show chart oci://ghcr.io/m4dm4rtig4n/charts/eat-scheduler --version 1.0.0

# Installer directement depuis le registre OCI
helm install eat oci://ghcr.io/m4dm4rtig4n/charts/eat-scheduler \
  --version 1.0.0 \
  --namespace eat-scheduler \
  --create-namespace \
  -f my-values.yaml

# Mettre à jour
helm upgrade eat oci://ghcr.io/m4dm4rtig4n/charts/eat-scheduler \
  --version 1.1.0 \
  --namespace eat-scheduler
```

L'image Docker correspondant à la version est résolue automatiquement via `Chart.AppVersion` (pas besoin de surcharger `image.tag` dans les values).

