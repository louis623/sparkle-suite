-- Record a LIVE buyer when the show is archived.
-- A checked order is no longer sitting in the waiting list, and the Workspace
-- screen is often closed, so this path creates the customer card when the full
-- name is new, writes the link, and writes the order. Two cards with the same
-- name are left for the rep to choose. Buyers without a surname are skipped.

CREATE OR REPLACE FUNCTION public.live_lineup_record_orders_from_state(p_rep_id uuid, p_state jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  buyer record;
  rows jsonb := '[]'::jsonb;
  selected uuid;
  full_name text;
  buyer_key text;
  name_count integer;
BEGIN
  IF p_rep_id IS NULL OR jsonb_typeof(p_state) IS DISTINCT FROM 'object' THEN
    RETURN 0;
  END IF;
  FOR buyer IN
    WITH raw AS (
      SELECT value AS entry, 0 AS priority
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_state->'entries') = 'array' THEN p_state->'entries' ELSE '[]'::jsonb END)
      UNION ALL
      SELECT value->'entry', 1
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_state->'restorations') = 'array' THEN p_state->'restorations' ELSE '[]'::jsonb END)
      WHERE jsonb_typeof(value->'entry') = 'object'
    ), candidates AS (
      SELECT DISTINCT ON (split_part(entry->>'id', ':', 2))
        entry
      FROM raw
      WHERE coalesce(entry->>'name', '') <> ''
        AND coalesce(entry->>'lastName', '') <> ''
        AND entry->>'id' ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,60}:[A-Za-z0-9][A-Za-z0-9_-]{0,60}$'
        AND NOT coalesce(
          jsonb_typeof(p_state#>'{show,excludedPartyIds}') = 'array'
          AND (p_state#>'{show,excludedPartyIds}') ? split_part(entry->>'id', ':', 1),
          false)
      ORDER BY split_part(entry->>'id', ':', 2), priority
    )
    SELECT entry FROM candidates
  LOOP
    full_name := (buyer.entry->>'name') || ' ' || (buyer.entry->>'lastName');
    buyer_key := public.live_lineup_audience_name_key(full_name);
    selected := NULL;
    SELECT l.audience_id INTO selected
    FROM public.live_lineup_customer_links l
    JOIN public.customer_audience a ON a.id = l.audience_id AND a.rep_id = l.rep_id
    WHERE l.rep_id = p_rep_id
      AND l.entry_id = buyer.entry->>'id'
      AND l.identity_key = buyer_key
      AND public.live_lineup_audience_name_key(a.name) = buyer_key
    LIMIT 1;
    IF selected IS NULL THEN
      SELECT count(*) INTO name_count
      FROM public.customer_audience a
      WHERE a.rep_id = p_rep_id
        AND public.live_lineup_audience_name_key(a.name) = buyer_key;
      IF name_count = 1 THEN
        SELECT a.id INTO selected
        FROM public.customer_audience a
        WHERE a.rep_id = p_rep_id
          AND public.live_lineup_audience_name_key(a.name) = buyer_key;
      ELSIF name_count = 0 THEN
        INSERT INTO public.customer_audience(rep_id, name, record_source, sms_consent, email_consent, marketing_consent, consent_date)
        VALUES (p_rep_id, full_name, 'live_lineup', false, false, false, NULL)
        RETURNING id INTO selected;
        INSERT INTO public.customer_audience_change_log(audience_id, rep_id, actor_kind, action, changes)
        VALUES (selected, p_rep_id, 'system', 'created', jsonb_build_object('name', full_name, 'source', 'live_lineup'));
      END IF;
    END IF;
    IF selected IS NULL THEN
      CONTINUE;
    END IF;
    INSERT INTO public.live_lineup_customer_links(rep_id, entry_id, identity_key, audience_id)
    VALUES (p_rep_id, buyer.entry->>'id', buyer_key, selected)
    ON CONFLICT (rep_id, entry_id) DO NOTHING;
    rows := rows || jsonb_build_array(jsonb_build_object(
      'entryId', buyer.entry->>'id',
      'audienceId', selected,
      'orderedAt', buyer.entry->'orderedAt'
    ));
  END LOOP;
  RETURN public.live_lineup_upsert_customer_orders(p_rep_id, rows);
END $$;

REVOKE ALL ON FUNCTION public.live_lineup_record_orders_from_state(uuid, jsonb) FROM PUBLIC, anon, authenticated;
