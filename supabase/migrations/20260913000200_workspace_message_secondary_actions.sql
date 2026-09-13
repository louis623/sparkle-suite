-- Resource announcements need a dependable in-workspace destination and an
-- optional, separately-rendered YouTube action. Existing publications retain
-- their single action unchanged.
ALTER TABLE public.workspace_message_publications
  ADD COLUMN IF NOT EXISTS secondary_action_label TEXT,
  ADD COLUMN IF NOT EXISTS secondary_action_url TEXT;

ALTER TABLE public.workspace_message_publications
  DROP CONSTRAINT IF EXISTS workspace_message_publications_secondary_action_pair;

ALTER TABLE public.workspace_message_publications
  ADD CONSTRAINT workspace_message_publications_secondary_action_pair CHECK (
    (secondary_action_label IS NULL AND secondary_action_url IS NULL)
    OR (
      btrim(secondary_action_label) <> ''
      AND btrim(secondary_action_url) <> ''
    )
  );

-- The original publication grant is column-scoped. Grant the two new safe
-- presentation fields explicitly; row access remains protected by the
-- existing delivery assignment policy.
GRANT SELECT (secondary_action_label, secondary_action_url)
  ON public.workspace_message_publications TO authenticated;

NOTIFY pgrst, 'reload schema';
