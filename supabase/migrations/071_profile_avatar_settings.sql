-- Photo de profil + paramètres utilisateur

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read profile avatars" ON storage.objects;
CREATE POLICY "Public read profile avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "Users upload own profile avatar" ON storage.objects;
CREATE POLICY "Users upload own profile avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own profile avatar" ON storage.objects;
CREATE POLICY "Users update own profile avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own profile avatar" ON storage.objects;
CREATE POLICY "Users delete own profile avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE OR REPLACE FUNCTION update_own_avatar_url(p_avatar_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  UPDATE profiles
  SET avatar_url = NULLIF(TRIM(p_avatar_url), ''), updated_at = NOW()
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION update_own_avatar_url(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_own_avatar_url(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
