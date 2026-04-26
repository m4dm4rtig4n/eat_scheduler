.DEFAULT_GOAL := help
.PHONY: help install dev build start lint clean \
        db-generate db-migrate db-studio db-push db-reset \
        docker-build docker-up docker-down docker-logs \
        helm-template helm-lint helm-install helm-upgrade helm-uninstall

# Variables
APP_NAME       := eat-scheduler
IMAGE          := $(APP_NAME):latest
HELM_CHART     := helm/eat-scheduler
HELM_VALUES    := $(HELM_CHART)/example/values.yaml
HELM_RELEASE   := eat
HELM_NAMESPACE := eat-scheduler

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
