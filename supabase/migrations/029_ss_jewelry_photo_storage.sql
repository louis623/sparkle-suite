-- ─── 029: Jewelry photo storage (Task 1.5B follow-on) ───
-- Adds a public bucket so Thumper can persist rep-uploaded photos of NEW
-- jewelry pieces and surface them on public trade boards. The add_listing
-- handler extracts the most recent user-uploaded image from
-- thumper_conversations.parts, uploads through the service client, and
-- passes the resulting public URL into createDesign().
--
-- Path layout inside bucket: {rep_id}/{uuid}.{ext}
-- The first path segment is reps.id (UUID, resolved through auth_user_id —
-- NOT auth.uid() directly). RLS enforces this on direct authenticated
-- uploads. Server-side uploads via the service client bypass RLS but
-- follow the same path convention as defense-in-depth.

INSERT INTO storage.buckets (id, name, public)
VALUES ('jewelry-photos', 'jewelry-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read.
DROP POLICY IF EXISTS "jewelry_photos_public_read" ON storage.objects;
CREATE POLICY "jewelry_photos_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'jewelry-photos');

-- Authenticated rep upload, scoped to their own folder. The first path
-- segment must equal reps.id resolved through reps.auth_user_id — never
-- compare against auth.uid() directly. Mirrors the trade_listings RLS
-- pattern in 006_sparkle_suite_schema.sql.
DROP POLICY IF EXISTS "jewelry_photos_rep_insert" ON storage.objects;
CREATE POLICY "jewelry_photos_rep_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'jewelry-photos'
    AND split_part(name, '/', 1) =
        (SELECT id::text FROM reps WHERE auth_user_id = auth.uid())
  );

-- No UPDATE / DELETE policies. Service client (admin) handles those out-of-band
-- if ever needed; reps cannot mutate their own uploads from the client.
