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

-- Commandes Shopify de démo (payée en ligne + COD)
-- SKU = barcode produit pour le mapping caisse POS

DELETE FROM shopify_orders WHERE shopify_order_id IN (9000000001, 9000000002, 9000000003);

INSERT INTO shopify_orders (
  shopify_order_id,
  order_number,
  store_id,
  city,
  customer_name,
  customer_email,
  customer_phone,
  shipping_address,
  shipping_lat,
  shipping_lng,
  financial_status,
  fulfillment_status,
  order_status,
  payment_type,
  workflow_status,
  payment_gateway,
  total,
  currency,
  line_items,
  shopify_created_at
) VALUES
(
  9000000001,
  '#WEB1001',
  (SELECT id FROM stores WHERE name = 'Natus Guéliz' LIMIT 1),
  'Marrakech',
  'Fatima El Amrani',
  'fatima.elamrani@example.com',
  '+212612345678',
  '12 Rue de la Liberté, Guéliz, Marrakech',
  31.6345,
  -8.0089,
  'paid',
  NULL,
  'open',
  'online',
  'paid',
  'shopify_payments',
  104.80,
  'MAD',
  '[
    {"id":10001,"title":"Crème hydratante visage","sku":"340001000001","quantity":2,"price":"29.90","variant_id":100010},
    {"id":10002,"title":"Sérum vitamine C","sku":"340001000002","quantity":1,"price":"45.00","variant_id":100020}
  ]'::jsonb,
  NOW() - INTERVAL '5 hours'
),
(
  9000000002,
  '#WEB1002',
  (SELECT id FROM stores WHERE name = 'Natus Guéliz' LIMIT 1),
  'Marrakech',
  'Youssef Benali',
  'youssef.benali@example.com',
  '+212698765432',
  '45 Avenue Hassan II, Guéliz, Marrakech',
  31.6298,
  -7.9991,
  'pending',
  NULL,
  'open',
  'cod',
  'pending',
  'Cash on Delivery (COD)',
  60.30,
  'MAD',
  '[
    {"id":10003,"title":"Rouge à lèvres mat","sku":"340001000003","quantity":1,"price":"22.50","variant_id":100030},
    {"id":10004,"title":"Mascara volume","sku":"340001000004","quantity":2,"price":"18.90","variant_id":100040}
  ]'::jsonb,
  NOW() - INTERVAL '2 hours'
),
(
  9000000003,
  '#WEB1003',
  (SELECT id FROM stores WHERE name = 'Natus Médina' LIMIT 1),
  'Marrakech',
  'Amina Tazi',
  'amina.tazi@example.com',
  '+212611223344',
  '8 Derb Dabachi, Médina, Marrakech',
  31.6257,
  -7.9891,
  'pending',
  NULL,
  'open',
  'cod',
  'preparing',
  'manual',
  77.60,
  'MAD',
  '[
    {"id":10005,"title":"Eau micellaire","sku":"340001000005","quantity":3,"price":"15.90","variant_id":100050},
    {"id":10006,"title":"Crème hydratante visage","sku":"340001000001","quantity":1,"price":"29.90","variant_id":100060}
  ]'::jsonb,
  NOW() - INTERVAL '1 hour'
);
