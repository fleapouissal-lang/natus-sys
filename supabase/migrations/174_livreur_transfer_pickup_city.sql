-- Assignation livreur : ville de prise en charge = ville du site source (from_store).
-- Permet les livraisons inter-villes (ex. Marrakech → Casablanca) avec un livreur
-- basé à la ville de départ.

CREATE OR REPLACE FUNCTION assign_hub_transfer_livreur(
  p_transfer_id UUID,
  p_livreur_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_city TEXT;
  v_pickup_city TEXT;
  v_transfer hub_stock_transfers%ROWTYPE;
BEGIN
  IF NOT is_hub_operator() AND NOT is_director_or_admin() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF p_livreur_id IS NULL THEN
    RAISE EXCEPTION 'Livreur requis';
  END IF;

  SELECT * INTO v_transfer
  FROM hub_stock_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable';
  END IF;

  IF v_transfer.status <> 'pret' THEN
    RAISE EXCEPTION 'Seule une commande prête peut être assignée à un livreur';
  END IF;

  IF is_hub_operator() AND NOT is_director_or_admin() THEN
    SELECT city INTO v_city FROM profiles WHERE id = v_user_id;

    IF NOT EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = v_transfer.from_store_id
        AND s.is_hub = true
        AND s.city = v_city
    ) THEN
      RAISE EXCEPTION 'Transfert hors périmètre dépôt';
    END IF;
  END IF;

  SELECT s.city INTO v_pickup_city
  FROM stores s
  WHERE s.id = v_transfer.from_store_id;

  IF v_pickup_city IS NULL THEN
    RAISE EXCEPTION 'Ville source introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = p_livreur_id
      AND p.role = 'livreur'
      AND p.is_active = true
      AND p.city = v_pickup_city
  ) THEN
    RAISE EXCEPTION 'Livreur invalide pour la ville de prise en charge';
  END IF;

  UPDATE hub_stock_transfers
  SET assigned_livreur_id = p_livreur_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'assigned_livreur_id', p_livreur_id);
END;
$$;

CREATE OR REPLACE FUNCTION assign_store_to_hub_transfer_livreur(
  p_transfer_id UUID,
  p_livreur_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer hub_stock_transfers%ROWTYPE;
  v_to_is_hub BOOLEAN;
  v_pickup_city TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF p_livreur_id IS NULL THEN
    RAISE EXCEPTION 'Livreur requis';
  END IF;

  SELECT * INTO v_transfer FROM hub_stock_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfert introuvable'; END IF;

  SELECT COALESCE(s.is_hub, false) INTO v_to_is_hub
  FROM stores s
  WHERE s.id = v_transfer.to_store_id;

  IF NOT v_to_is_hub THEN
    RAISE EXCEPTION 'Ce transfert n''est pas un retour dépôt';
  END IF;

  IF v_transfer.status <> 'pret' THEN
    RAISE EXCEPTION 'Seule une commande prête peut être assignée à un livreur';
  END IF;

  IF NOT can_manage_store_to_hub_transfer(v_transfer.from_store_id) THEN
    RAISE EXCEPTION 'Magasin source hors périmètre';
  END IF;

  SELECT s.city INTO v_pickup_city
  FROM stores s
  WHERE s.id = v_transfer.from_store_id;

  IF v_pickup_city IS NULL THEN
    RAISE EXCEPTION 'Ville du magasin source introuvable';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = p_livreur_id
      AND p.role = 'livreur'
      AND p.is_active = true
      AND p.city = v_pickup_city
  ) THEN
    RAISE EXCEPTION 'Livreur invalide pour la ville de prise en charge';
  END IF;

  UPDATE hub_stock_transfers
  SET assigned_livreur_id = p_livreur_id
  WHERE id = p_transfer_id;

  RETURN jsonb_build_object('success', true, 'assigned_livreur_id', p_livreur_id);
END;
$$;

NOTIFY pgrst, 'reload schema';
