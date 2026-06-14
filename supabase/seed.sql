-- Natus POS — Seed utilisateurs
-- Mot de passe pour tous les comptes : Natus2026!
--
-- Local  : supabase db reset
-- Remote : npm run seed
--          ou exécuter ce fichier dans le SQL Editor Supabase

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_manager_id UUID := 'a1000000-0000-4000-8000-000000000001';
  v_cashier_id UUID := 'a1000000-0000-4000-8000-000000000002';
  v_cashier2_id UUID := 'a1000000-0000-4000-8000-000000000003';
  v_password TEXT := crypt('Natus2026!', gen_salt('bf'));
BEGIN
  -- Nettoyage (ré-exécution safe)
  DELETE FROM auth.users WHERE email IN (
    'manager@natus.ma',
    'cashier@natus.ma',
    'caissier2@natus.ma'
  );

  -- Gérant
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_manager_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'manager@natus.ma',
    v_password,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Gérant Natus","role":"manager"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_manager_id,
    v_manager_id,
    v_manager_id::text,
    jsonb_build_object(
      'sub', v_manager_id::text,
      'email', 'manager@natus.ma',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Caissier 1
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_cashier_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'cashier@natus.ma',
    v_password,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Caissier Natus","role":"cashier"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_cashier_id,
    v_cashier_id,
    v_cashier_id::text,
    jsonb_build_object(
      'sub', v_cashier_id::text,
      'email', 'cashier@natus.ma',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Caissier 2
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_cashier2_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'caissier2@natus.ma',
    v_password,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Caissier 2","role":"cashier"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_cashier2_id,
    v_cashier2_id,
    v_cashier2_id::text,
    jsonb_build_object(
      'sub', v_cashier2_id::text,
      'email', 'caissier2@natus.ma',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Synchroniser les profils (le trigger les crée, on force le rôle au cas où)
  UPDATE profiles SET role = 'manager', full_name = 'Gérant Natus'
  WHERE id = v_manager_id;

  UPDATE profiles SET role = 'cashier', full_name = 'Caissier Natus'
  WHERE id = v_cashier_id;

  UPDATE profiles SET role = 'cashier', full_name = 'Caissier 2'
  WHERE id = v_cashier2_id;

  RAISE NOTICE 'Seed OK — manager@natus.ma / cashier@natus.ma / caissier2@natus.ma — mot de passe : Natus2026!';
END $$;
