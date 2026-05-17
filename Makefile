.DEFAULT_GOAL := help
.PHONY: help install dev build start lint clean \
        db-generate db-migrate db-studio db-push db-reset \
        docker-build docker-up docker-down docker-logs \
        helm-template helm-lint helm-install helm-upgrade helm-uninstall \
        sync-dry sync

# Variables
APP_NAME       := eat-scheduler
IMAGE          := $(APP_NAME):latest
HELM_CHART     := helm/eat-scheduler
HELM_VALUES    := $(HELM_CHART)/example/values.yaml
HELM_RELEASE   := eat
HELM_NAMESPACE := eat-scheduler

# Sync (cf. scripts/sync-to-prod.ts).
# Charge .env si présent, précédence : env shell > .env > défaut Makefile.
# Pour que l'env shell gagne sur les variables inclues, on cible PROD_BASE
# spécifiquement : si le shell le définit déjà, on garde sa valeur ; sinon on
# lit le .env ; sinon on tombe sur le défaut.
ENV_FILE       ?= .env
ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
endif
PROD_BASE      := $(if $(shell printenv PROD_BASE),$(shell printenv PROD_BASE),$(or $(PROD_BASE),https://eat.valent1.fr))
export PROD_BASE

# Outils via mise (assure les bonnes versions)
PNPM := mise exec -- pnpm
HELM := mise exec -- helm

##@ Aide

help: ## Affiche cette aide
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<cible>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ Développement

install: ## Installe les dépendances (mise + pnpm)
	mise install
	$(PNPM) install

dev: ## Lance le serveur de dev (http://localhost:3000)
	$(PNPM) dev

build: ## Build de production
	$(PNPM) build

start: ## Démarre le serveur de production (après build)
	$(PNPM) start

clean: ## Nettoie les artefacts de build
	rm -rf .next node_modules/.cache

##@ Base de données

db-generate: ## Génère les migrations depuis le schema
	$(PNPM) db:generate

db-migrate: ## Applique les migrations
	$(PNPM) db:migrate

db-studio: ## Ouvre Drizzle Studio (UI de la DB)
	$(PNPM) db:studio

db-push: ## Push direct du schema vers la DB (dev only)
	$(PNPM) db:push

db-reset: ## Supprime la DB SQLite locale et réapplique les migrations
	rm -f data/eat.db data/eat.db-shm data/eat.db-wal
	$(MAKE) db-migrate

db-seed: ## Insère le corpus de recettes (écrase les données existantes)
	$(PNPM) db:seed

##@ Docker

docker-build: ## Build l'image Docker
	docker build -t $(IMAGE) .

docker-up: ## Démarre la stack docker-compose
	docker compose up -d

docker-down: ## Arrête la stack docker-compose
	docker compose down

docker-logs: ## Affiche les logs docker-compose
	docker compose logs -f app

##@ Helm

helm-template: ## Affiche le rendu du chart avec les values d'exemple
	$(HELM) template $(HELM_RELEASE) $(HELM_CHART) -f $(HELM_VALUES) --debug

helm-lint: ## Lint le chart Helm
	$(HELM) lint $(HELM_CHART) -f $(HELM_VALUES)

helm-install: ## Installe le release Helm
	$(HELM) install $(HELM_RELEASE) $(HELM_CHART) -f $(HELM_VALUES) --namespace $(HELM_NAMESPACE) --create-namespace

helm-upgrade: ## Met à jour le release Helm
	$(HELM) upgrade $(HELM_RELEASE) $(HELM_CHART) -f $(HELM_VALUES) --namespace $(HELM_NAMESPACE)

helm-uninstall: ## Supprime le release Helm
	$(HELM) uninstall $(HELM_RELEASE) --namespace $(HELM_NAMESPACE)

##@ Sync (local -> distant)

sync-dry: ## Liste les recettes locales absentes du distant (PROD_BASE=$(PROD_BASE))
	PROD_BASE="$(PROD_BASE)" $(PNPM) tsx scripts/sync-to-prod.ts --dry

sync: ## Affiche un dry-run, demande confirmation, puis pousse vers le distant (PROD_BASE=$(PROD_BASE))
	@PROD_BASE="$(PROD_BASE)" $(PNPM) tsx scripts/sync-to-prod.ts --dry | tee /tmp/eat-sync-dry.out; \
	if grep -q "Rien à faire" /tmp/eat-sync-dry.out; then \
		rm -f /tmp/eat-sync-dry.out; \
		exit 0; \
	fi; \
	rm -f /tmp/eat-sync-dry.out; \
	printf "\nConfirmer le push vers $(PROD_BASE) ? [y/N] "; \
	read ans < /dev/tty; \
	case "$$ans" in \
		[yY]|[yY][eE][sS]|[oO]|[oO][uU][iI]) \
			PROD_BASE="$(PROD_BASE)" $(PNPM) tsx scripts/sync-to-prod.ts ;; \
		*) \
			echo "Annulé." ;; \
	esac
