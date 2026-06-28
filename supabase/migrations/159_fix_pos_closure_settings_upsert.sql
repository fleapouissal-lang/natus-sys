-- Fix : le réglage directeur « Validation de la clôture de caisse » n'était
-- jamais enregistré.
--
-- Cause : la purge des données opérationnelles (migration 150) supprime la
-- ligne unique (id = 1) de pos_closure_settings sans la recréer.
-- update_pos_closure_settings ne faisait qu'un « UPDATE ... WHERE id = 1 »,
-- qui n'affecte alors aucune ligne → la modification (avec / sans code) était
-- perdue, et la lecture renvoyait toujours la valeur par défaut (avec code).

-- 1) Réinsère la ligne de configuration si elle a disparu.
INSERT INTO pos_closure_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 2) update_pos_closure_settings devient un UPSERT : robuste même si la ligne
--    a été purgée entre-temps.
CREATE OR REPLACE FUNCTION update_pos_closure_settings(p_require_manager_code BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row pos_closure_settings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT is_director() THEN
    RAISE EXCEPTION 'Seul le directeur peut modifier ce paramètre';
  END IF;

  INSERT INTO pos_closure_settings (id, require_manager_code, updated_at, updated_by)
  VALUES (1, COALESCE(p_require_manager_code, true), NOW(), auth.uid())
  ON CONFLICT (id) DO UPDATE
    SET require_manager_code = COALESCE(p_require_manager_code, true),
        updated_at = NOW(),
        updated_by = auth.uid()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'require_manager_code', v_row.require_manager_code,
    'updated_at', v_row.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_pos_closure_settings(BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
