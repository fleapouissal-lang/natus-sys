-- Étape 1/2 : ajouter la valeur enum hub (commit séparé requis par PostgreSQL)

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hub';

NOTIFY pgrst, 'reload schema';
