-- Permet d'épingler un repas planifié pour le préserver de la régénération
ALTER TABLE `planned_meals` ADD `pinned` integer DEFAULT false NOT NULL;
