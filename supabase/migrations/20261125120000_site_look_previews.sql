-- Approved by name: 20261125120000_site_look_previews
-- One row per rep for the cached Look-tile screenshot. No new storage bucket.

CREATE TABLE IF NOT EXISTS public.site_look_previews (
  rep_id UUID PRIMARY KEY REFERENCES public.reps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'missing',
  version INTEGER NOT NULL DEFAULT 0,
  desktop_path TEXT,
  desktop_url TEXT,
  phone_path TEXT,
  phone_url TEXT,
  captured_url TEXT,
  content_fingerprint TEXT,
  queued_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_look_previews_status_known
    CHECK (status IN ('missing', 'updating', 'ready', 'failed')),
  CONSTRAINT site_look_previews_attempt_count_nonnegative
    CHECK (attempt_count >= 0),
  CONSTRAINT site_look_previews_version_nonnegative
    CHECK (version >= 0)
);

GRANT SELECT ON TABLE public.site_look_previews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_look_previews TO service_role;

ALTER TABLE public.site_look_previews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_look_previews_select_own" ON public.site_look_previews;
CREATE POLICY "site_look_previews_select_own"
  ON public.site_look_previews
  FOR SELECT
  TO authenticated
  USING (rep_id = (SELECT id FROM public.reps WHERE auth_user_id = auth.uid()));
