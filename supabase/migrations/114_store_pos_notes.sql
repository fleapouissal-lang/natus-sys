-- Notes internes magasin — visibles uniquement par le compte caisse magasin (is_store_pos)

CREATE TABLE store_pos_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_pos_notes_store_updated
  ON store_pos_notes(store_id, updated_at DESC);

ALTER TABLE store_pos_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY store_pos_notes_store_terminal ON store_pos_notes
  FOR ALL TO authenticated
  USING (
    is_store_pos_terminal()
    AND store_id = (
      SELECT p.store_id
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.is_store_pos = true
    )
  )
  WITH CHECK (
    is_store_pos_terminal()
    AND store_id = (
      SELECT p.store_id
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.is_active = true
        AND p.is_store_pos = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON store_pos_notes TO authenticated;

NOTIFY pgrst, 'reload schema';
