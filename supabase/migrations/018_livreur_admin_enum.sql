-- Étape 1/2 : nouvelles valeurs enum (transaction séparée — requis par PostgreSQL)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'livreur';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
