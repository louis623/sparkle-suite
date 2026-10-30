-- A 5–6 hour show can archive thousands of buyers in one call. Walking them one
-- row at a time, and refreshing last-seen once per order, used about 7.3s for
-- 2,000 buyers against the 8s statement timeout. Cards, links, and orders are
-- each one set-based write, split into batches of 250 so no single write grows
-- with the length of the show. Repeating the call does not add a second card,
-- link, or order.

CREATE OR REPLACE FUNCTION public.live_lineup_touch_customer_last_seen() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  ids uuid[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT coalesce(array_agg(DISTINCT audience_id), '{}') INTO ids FROM new_rows WHERE audience_id IS NOT NULL;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT coalesce(array_agg(DISTINCT audience_id), '{}') INTO ids FROM old_rows WHERE audience_id IS NOT NULL;
  ELSE
    SELECT coalesce(array_agg(DISTINCT audience_id), '{}') INTO ids
    FROM (
      SELECT audience_id FROM new_rows
      UNION
      SELECT audience_id FROM old_rows
    ) touched
    WHERE audience_id IS NOT NULL;
  END IF;
  IF coalesce(cardinality(ids), 0) = 0 THEN
    RETURN NULL;
  END IF;
  UPDATE public.customer_audience c
  SET last_seen_in_lineup_at = src.last_seen
  FROM (
    SELECT a.id, seen.last_seen
    FROM public.customer_audience a
    LEFT JOIN (
      SELECT o.audience_id, max(o.ordered_at) AS last_seen
      FROM public.live_lineup_customer_orders o
      WHERE o.audience_id = ANY(ids)
      GROUP BY o.audience_id
    ) seen ON seen.audience_id = a.id
    WHERE a.id = ANY(ids)
  ) src
  WHERE c.id = src.id
    AND c.last_seen_in_lineup_at IS DISTINCT FROM src.last_seen;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS live_lineup_customer_orders_last_seen ON public.live_lineup_customer_orders;
CREATE TRIGGER live_lineup_customer_orders_last_seen_insert
  AFTER INSERT ON public.live_lineup_customer_orders
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.live_lineup_touch_customer_last_seen();
CREATE TRIGGER live_lineup_customer_orders_last_seen_update
  AFTER UPDATE ON public.live_lineup_customer_orders
  REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.live_lineup_touch_customer_last_seen();
CREATE TRIGGER live_lineup_customer_orders_last_seen_delete
  AFTER DELETE ON public.live_lineup_customer_orders
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.live_lineup_touch_customer_last_seen();

-- One version step per changed card, added up for the whole statement.
-- A last-seen refresh is not a card edit, same as the row trigger it replaces.
CREATE OR REPLACE FUNCTION public.live_lineup_audience_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.live_lineup_audience_versions(rep_id, version)
    SELECT n.rep_id, count(*)::bigint FROM new_rows n GROUP BY n.rep_id
    ON CONFLICT (rep_id) DO UPDATE
      SET version = live_lineup_audience_versions.version + EXCLUDED.version;
    RETURN NULL;
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.live_lineup_audience_versions(rep_id, version)
    SELECT o.rep_id, count(*)::bigint
    FROM old_rows o
    WHERE EXISTS (SELECT 1 FROM public.reps r WHERE r.id = o.rep_id)
    GROUP BY o.rep_id
    ON CONFLICT (rep_id) DO UPDATE
      SET version = live_lineup_audience_versions.version + EXCLUDED.version;
    RETURN NULL;
  END IF;
  INSERT INTO public.live_lineup_audience_versions(rep_id, version)
  SELECT o.rep_id, count(*)::bigint
  FROM old_rows o
  JOIN new_rows n ON n.id = o.id
  WHERE (to_jsonb(n) - 'last_seen_in_lineup_at') IS DISTINCT FROM (to_jsonb(o) - 'last_seen_in_lineup_at')
    AND EXISTS (SELECT 1 FROM public.reps r WHERE r.id = o.rep_id)
  GROUP BY o.rep_id
  ON CONFLICT (rep_id) DO UPDATE
    SET version = live_lineup_audience_versions.version + EXCLUDED.version;
  INSERT INTO public.live_lineup_audience_versions(rep_id, version)
  SELECT n.rep_id, count(*)::bigint
  FROM old_rows o
  JOIN new_rows n ON n.id = o.id
  WHERE n.rep_id IS DISTINCT FROM o.rep_id
    AND (to_jsonb(n) - 'last_seen_in_lineup_at') IS DISTINCT FROM (to_jsonb(o) - 'last_seen_in_lineup_at')
  GROUP BY n.rep_id
  ON CONFLICT (rep_id) DO UPDATE
    SET version = live_lineup_audience_versions.version + EXCLUDED.version;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS live_lineup_audience_version_changed ON public.customer_audience;
CREATE TRIGGER live_lineup_audience_version_changed_insert
  AFTER INSERT ON public.customer_audience
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.live_lineup_audience_changed();
CREATE TRIGGER live_lineup_audience_version_changed_update
  AFTER UPDATE ON public.customer_audience
  REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.live_lineup_audience_changed();
CREATE TRIGGER live_lineup_audience_version_changed_delete
  AFTER DELETE ON public.customer_audience
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.live_lineup_audience_changed();

CREATE OR REPLACE FUNCTION public.live_lineup_record_orders_from_state(p_rep_id uuid, p_state jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  touched integer := 0;
  batch_touched integer := 0;
  total integer := 0;
  offset_ord integer := 0;
  chunk_size constant integer := 250;
BEGIN
  IF p_rep_id IS NULL OR jsonb_typeof(p_state) IS DISTINCT FROM 'object' THEN
    RETURN 0;
  END IF;

  DROP TABLE IF EXISTS pg_temp.live_lineup_record_buyer_chunk;
  DROP TABLE IF EXISTS pg_temp.live_lineup_record_buyer_names;
  CREATE TEMP TABLE pg_temp.live_lineup_record_buyer_chunk (
    ord integer PRIMARY KEY,
    entry_id text NOT NULL,
    order_id text NOT NULL,
    party_id text NOT NULL,
    full_name text NOT NULL,
    buyer_key text NOT NULL,
    ordered_at jsonb,
    link_id uuid,
    name_count integer,
    existing_id uuid,
    audience_id uuid
  ) ON COMMIT DROP;
  CREATE TEMP TABLE pg_temp.live_lineup_record_buyer_names (
    ord integer PRIMARY KEY,
    buyer_key text NOT NULL,
    full_name text NOT NULL,
    audience_id uuid
  ) ON COMMIT DROP;

  INSERT INTO pg_temp.live_lineup_record_buyer_chunk (
    ord, entry_id, order_id, party_id, full_name, buyer_key, ordered_at
  )
  SELECT row_number() OVER (ORDER BY order_id) - 1,
    entry_id, order_id, party_id, full_name, buyer_key, ordered_at
  FROM (
    SELECT DISTINCT ON (split_part(entry->>'id', ':', 2))
      entry->>'id' AS entry_id,
      split_part(entry->>'id', ':', 2) AS order_id,
      split_part(entry->>'id', ':', 1) AS party_id,
      (entry->>'name') || ' ' || (entry->>'lastName') AS full_name,
      public.live_lineup_audience_name_key((entry->>'name') || ' ' || (entry->>'lastName')) AS buyer_key,
      entry->'orderedAt' AS ordered_at
    FROM (
      SELECT value AS entry, 0 AS priority
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_state->'entries') = 'array' THEN p_state->'entries' ELSE '[]'::jsonb END)
      UNION ALL
      SELECT value->'entry', 1
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_state->'restorations') = 'array' THEN p_state->'restorations' ELSE '[]'::jsonb END)
      WHERE jsonb_typeof(value->'entry') = 'object'
    ) raw
    WHERE coalesce(entry->>'name', '') <> ''
      AND coalesce(entry->>'lastName', '') <> ''
      AND entry->>'id' ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,60}:[A-Za-z0-9][A-Za-z0-9_-]{0,60}$'
      AND NOT coalesce(
        jsonb_typeof(p_state#>'{show,excludedPartyIds}') = 'array'
        AND (p_state#>'{show,excludedPartyIds}') ? split_part(entry->>'id', ':', 1),
        false)
    ORDER BY split_part(entry->>'id', ':', 2), priority
  ) picked;

  UPDATE pg_temp.live_lineup_record_buyer_chunk b
  SET link_id = l.audience_id
  FROM public.live_lineup_customer_links l
  JOIN public.customer_audience a ON a.id = l.audience_id AND a.rep_id = l.rep_id
  WHERE l.rep_id = p_rep_id
    AND l.entry_id = b.entry_id
    AND l.identity_key = b.buyer_key
    AND public.live_lineup_audience_name_key(a.name) = b.buyer_key;

  UPDATE pg_temp.live_lineup_record_buyer_chunk b
  SET name_count = matched.name_count,
      existing_id = matched.unique_id
  FROM (
    SELECT keys.buyer_key,
      count(a.id)::integer AS name_count,
      CASE WHEN count(a.id) = 1 THEN min(a.id::text)::uuid END AS unique_id
    FROM (SELECT DISTINCT buyer_key FROM pg_temp.live_lineup_record_buyer_chunk) keys
    LEFT JOIN public.customer_audience a
      ON a.rep_id = p_rep_id
     AND public.live_lineup_audience_name_key(a.name) = keys.buyer_key
    GROUP BY keys.buyer_key
  ) matched
  WHERE b.buyer_key = matched.buyer_key;

  INSERT INTO pg_temp.live_lineup_record_buyer_names (ord, buyer_key, full_name, audience_id)
  SELECT row_number() OVER (ORDER BY first_ord) - 1, buyer_key, full_name, gen_random_uuid()
  FROM (
    SELECT DISTINCT ON (buyer_key) buyer_key, full_name, ord AS first_ord
    FROM pg_temp.live_lineup_record_buyer_chunk
    WHERE link_id IS NULL
      AND coalesce(name_count, 0) = 0
    ORDER BY buyer_key, ord
  ) fresh;

  SELECT count(*) INTO total FROM pg_temp.live_lineup_record_buyer_names;
  WHILE offset_ord < total LOOP
    INSERT INTO public.customer_audience(
      id, rep_id, name, record_source, sms_consent, email_consent, marketing_consent, consent_date
    )
    SELECT n.audience_id, p_rep_id, n.full_name, 'live_lineup', false, false, false, NULL
    FROM pg_temp.live_lineup_record_buyer_names n
    WHERE n.ord >= offset_ord AND n.ord < offset_ord + chunk_size;

    INSERT INTO public.customer_audience_change_log(audience_id, rep_id, actor_kind, action, changes)
    SELECT n.audience_id, p_rep_id, 'system', 'created', jsonb_build_object('name', n.full_name, 'source', 'live_lineup')
    FROM pg_temp.live_lineup_record_buyer_names n
    WHERE n.ord >= offset_ord AND n.ord < offset_ord + chunk_size;

    offset_ord := offset_ord + chunk_size;
  END LOOP;

  UPDATE pg_temp.live_lineup_record_buyer_chunk b
  SET audience_id = n.audience_id
  FROM pg_temp.live_lineup_record_buyer_names n
  WHERE n.buyer_key = b.buyer_key
    AND b.link_id IS NULL
    AND coalesce(b.name_count, 0) = 0;
  UPDATE pg_temp.live_lineup_record_buyer_chunk
  SET audience_id = COALESCE(link_id, existing_id)
  WHERE audience_id IS NULL
    AND (link_id IS NOT NULL OR name_count = 1);

  SELECT count(*) INTO total FROM pg_temp.live_lineup_record_buyer_chunk;
  offset_ord := 0;
  WHILE offset_ord < total LOOP
    INSERT INTO public.live_lineup_customer_links(rep_id, entry_id, identity_key, audience_id)
    SELECT p_rep_id, b.entry_id, b.buyer_key, b.audience_id
    FROM pg_temp.live_lineup_record_buyer_chunk b
    WHERE b.audience_id IS NOT NULL
      AND b.ord >= offset_ord AND b.ord < offset_ord + chunk_size
    ON CONFLICT (rep_id, entry_id) DO NOTHING;

    -- Same conflict rule as live_lineup_upsert_customer_orders: an unchanged replay does not touch the row.
    INSERT INTO public.live_lineup_customer_orders (rep_id, audience_id, order_id, party_id, ordered_at)
    SELECT p_rep_id, b.audience_id, b.order_id, b.party_id, public.live_lineup_order_timestamp(b.ordered_at)
    FROM pg_temp.live_lineup_record_buyer_chunk b
    WHERE b.audience_id IS NOT NULL
      AND b.ord >= offset_ord AND b.ord < offset_ord + chunk_size
    ON CONFLICT (rep_id, order_id) DO UPDATE
      SET audience_id = EXCLUDED.audience_id,
          party_id = EXCLUDED.party_id,
          ordered_at = EXCLUDED.ordered_at,
          updated_at = clock_timestamp()
      WHERE live_lineup_customer_orders.audience_id IS DISTINCT FROM EXCLUDED.audience_id
         OR live_lineup_customer_orders.party_id IS DISTINCT FROM EXCLUDED.party_id
         OR live_lineup_customer_orders.ordered_at IS DISTINCT FROM EXCLUDED.ordered_at;
    GET DIAGNOSTICS batch_touched = ROW_COUNT;
    touched := touched + batch_touched;
    offset_ord := offset_ord + chunk_size;
  END LOOP;

  DROP TABLE IF EXISTS pg_temp.live_lineup_record_buyer_chunk;
  DROP TABLE IF EXISTS pg_temp.live_lineup_record_buyer_names;
  RETURN touched;
END $$;

REVOKE ALL ON FUNCTION public.live_lineup_touch_customer_last_seen() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_lineup_audience_changed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_lineup_record_orders_from_state(uuid, jsonb) FROM PUBLIC, anon, authenticated;
