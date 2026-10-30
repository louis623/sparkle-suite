-- Public Sparkle Finder directory read only.
-- list_sparkle_finder_public_reps is granted to service_role and called by
-- the Finder public reps API. This replacement keeps the same arguments and
-- return columns. Scheduled, non-cancelled shows stay selectable until
-- start time plus duration has passed. Missing or non-positive duration
-- uses 60 minutes. Live-status filtering is unchanged. No tables, grants
-- to anon/authenticated, or other product functions are changed.

CREATE OR REPLACE FUNCTION public.list_sparkle_finder_public_reps(
  p_limit INTEGER DEFAULT 50,
  p_query TEXT DEFAULT NULL,
  p_as_of TIMESTAMPTZ DEFAULT statement_timestamp()
)
RETURNS TABLE (
  rep_id UUID,
  display_name TEXT,
  business_name TEXT,
  avatar_url TEXT,
  public_site_slug TEXT,
  next_show_id UUID,
  next_show_name TEXT,
  next_show_starts_at TIMESTAMPTZ,
  next_show_status TEXT,
  next_show_duration_minutes INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    rep.id AS rep_id,
    rep.display_name,
    NULLIF(BTRIM(rep.business_name), '') AS business_name,
    NULLIF(BTRIM(rep.profile_photo_url), '') AS avatar_url,
    NULLIF(LOWER(BTRIM(rep.public_site_slug)), '') AS public_site_slug,
    next_show.id AS next_show_id,
    COALESCE(
      NULLIF(BTRIM(next_show.title), ''),
      NULLIF(BTRIM(rep.business_name), ''),
      NULLIF(BTRIM(rep.display_name), ''),
      'Sparkle show'
    ) AS next_show_name,
    next_show.event_time AS next_show_starts_at,
    next_show.status::TEXT AS next_show_status,
    CASE
      WHEN next_show.duration_minutes IS NOT NULL
        AND next_show.duration_minutes > 0
      THEN next_show.duration_minutes
      ELSE NULL
    END AS next_show_duration_minutes
  FROM public.reps AS rep
  LEFT JOIN LATERAL (
    SELECT
      event.id,
      event.title,
      event.event_time,
      event.status,
      event.duration_minutes
    FROM public.calendar_events AS event
    WHERE event.rep_id = rep.id
      AND (
        (
          event.status = 'scheduled'
          AND event.event_time
            + MAKE_INTERVAL(
                mins => CASE
                  WHEN event.duration_minutes IS NOT NULL
                    AND event.duration_minutes > 0
                  THEN event.duration_minutes
                  ELSE 60
                END
              ) > p_as_of
        )
        OR
        (
          event.status = 'live'
          AND event.event_time <= p_as_of
          AND event.event_time
            + MAKE_INTERVAL(
                mins => GREATEST(COALESCE(event.duration_minutes, 60), 1)
              ) > p_as_of
        )
      )
    ORDER BY
      CASE WHEN event.status = 'live' THEN 0 ELSE 1 END,
      event.event_time,
      event.id
    LIMIT 1
  ) AS next_show ON true
  WHERE rep.status = 'active'
    AND rep.finder_directory_visible = true
    AND (
      NULLIF(BTRIM(p_query), '') IS NULL
      OR STRPOS(LOWER(rep.display_name), LOWER(BTRIM(p_query))) > 0
      OR STRPOS(LOWER(COALESCE(rep.business_name, '')), LOWER(BTRIM(p_query))) > 0
    )
  ORDER BY
    CASE
      WHEN next_show.status = 'live' THEN 0
      WHEN next_show.id IS NOT NULL THEN 1
      ELSE 2
    END,
    next_show.event_time NULLS LAST,
    LOWER(rep.display_name),
    rep.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200)
$$;

REVOKE ALL ON FUNCTION public.list_sparkle_finder_public_reps(
  INTEGER,
  TEXT,
  TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_sparkle_finder_public_reps(
  INTEGER,
  TEXT,
  TIMESTAMPTZ
) TO service_role;

COMMENT ON FUNCTION public.list_sparkle_finder_public_reps(
  INTEGER,
  TEXT,
  TIMESTAMPTZ
) IS
  'Public Sparkle Finder directory read. Scheduled shows remain until start plus duration, defaulting to 60 minutes.';
