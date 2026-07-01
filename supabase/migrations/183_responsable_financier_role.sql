-- Étape 1/2 : ajouter la valeur enum (commit requis avant usage dans les fonctions).

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'responsable_financier';
