-- Join Team lead-card circular photo framing (focus/zoom/rotation).
-- Member cards keep presentation metadata on join_team_members.image_class_name
-- as an ss-frame token. Lead photos live on reps.profile_photo_url, so framing
-- is stored next to that URL.

ALTER TABLE public.reps
  ADD COLUMN IF NOT EXISTS profile_photo_framing JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.reps.profile_photo_framing IS
  'Join Team lead-card circular photo framing: {focusX, focusY, zoom, rotation}.';
