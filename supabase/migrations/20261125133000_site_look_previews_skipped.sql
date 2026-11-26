-- Let a missing public page be recorded as skipped so the sweeper does not retry it.
ALTER TABLE public.site_look_previews
  DROP CONSTRAINT IF EXISTS site_look_previews_status_known;

ALTER TABLE public.site_look_previews
  ADD CONSTRAINT site_look_previews_status_known
  CHECK (status IN ('missing', 'updating', 'ready', 'failed', 'skipped'));
