-- Liens courts pour WhatsApp (suivi commande, confirmation, carte fidélité)

CREATE TABLE IF NOT EXISTS short_links (
  code TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('order', 'loyalty_card')),
  token UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, token)
);

CREATE INDEX IF NOT EXISTS idx_short_links_token ON short_links (kind, token);

CREATE OR REPLACE FUNCTION get_or_create_short_link(p_kind TEXT, p_token UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_chars TEXT := 'abcdefghijkmnpqrstuvwxyz23456789';
  i INT;
BEGIN
  IF p_kind NOT IN ('order', 'loyalty_card') THEN
    RAISE EXCEPTION 'invalid short link kind: %', p_kind;
  END IF;

  SELECT code INTO v_code
  FROM short_links
  WHERE kind = p_kind AND token = p_token;

  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;

    BEGIN
      INSERT INTO short_links (code, kind, token)
      VALUES (v_code, p_kind, p_token);
      RETURN v_code;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT sl.code INTO v_code
        FROM short_links sl
        WHERE sl.kind = p_kind AND sl.token = p_token;
        IF v_code IS NOT NULL THEN
          RETURN v_code;
        END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION resolve_short_link(p_code TEXT)
RETURNS TABLE(kind TEXT, token UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT sl.kind, sl.token
  FROM short_links sl
  WHERE sl.code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_or_create_short_link(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION resolve_short_link(TEXT) TO anon, authenticated, service_role;
