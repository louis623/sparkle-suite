-- Smoke only. Apply this on the Smoke database. Do not apply it to Live.
-- One row per Bomb Party order for a rep, written when a lineup customer is matched
-- or created, and again when a show is archived. Repeating a write does not duplicate the row.
-- Revealed orders whose names are no longer in the archived state cannot be reconstructed.

ALTER TABLE public.customer_audience
  ADD COLUMN IF NOT EXISTS last_seen_in_lineup_at timestamptz;

COMMENT ON COLUMN public.customer_audience.last_seen_in_lineup_at IS
  'Latest lineup order time for this customer. Maintained from live_lineup_customer_orders. A last-seen-only update does not bump profile_version.';

-- Last-seen maintenance must not take the card-creation lock or advance profile_version.
-- Archive commits already hold the lineup state row; taking this lock from that path can deadlock.
CREATE OR REPLACE FUNCTION public.customer_card_write_lock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  seen_only boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    seen_only := (to_jsonb(NEW) - 'last_seen_in_lineup_at' - 'profile_version')
      IS NOT DISTINCT FROM (to_jsonb(OLD) - 'last_seen_in_lineup_at' - 'profile_version');
  END IF;
  IF NOT seen_only THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.rep_id::text, 290926));
  END IF;
  IF TG_OP = 'UPDATE' AND NOT seen_only THEN
    NEW.profile_version := OLD.profile_version + 1;
  END IF;
  RETURN NEW;
END $$;

-- A last-seen touch is not a customer-card edit, so lineup chips do not refresh for it.
CREATE OR REPLACE FUNCTION public.live_lineup_audience_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND (to_jsonb(NEW) - 'last_seen_in_lineup_at') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'last_seen_in_lineup_at') THEN
    RETURN NULL;
  END IF;
  IF TG_OP <> 'INSERT' AND EXISTS (SELECT 1 FROM public.reps WHERE id=OLD.rep_id) THEN
    INSERT INTO public.live_lineup_audience_versions(rep_id,version) VALUES(OLD.rep_id,1)
      ON CONFLICT(rep_id) DO UPDATE SET version=live_lineup_audience_versions.version+1;
  END IF;
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.rep_id <> OLD.rep_id) THEN
    INSERT INTO public.live_lineup_audience_versions(rep_id,version) VALUES(NEW.rep_id,1)
      ON CONFLICT(rep_id) DO UPDATE SET version=live_lineup_audience_versions.version+1;
  END IF;
  RETURN NULL;
END $$;

CREATE TABLE public.live_lineup_customer_orders (
  rep_id uuid NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  audience_id uuid NOT NULL,
  order_id text NOT NULL CHECK (order_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$'),
  party_id text NOT NULL CHECK (party_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$'),
  ordered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (rep_id, order_id),
  FOREIGN KEY (audience_id, rep_id) REFERENCES public.customer_audience(id, rep_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.live_lineup_customer_orders IS
  'Private lineup purchase rows. order_id is the Bomb Party order id and is unique per rep. party_id is stored beside it. Smoke apply only.';

CREATE INDEX live_lineup_customer_orders_rep_ordered
  ON public.live_lineup_customer_orders (rep_id, ordered_at);
CREATE INDEX live_lineup_customer_orders_audience_ordered
  ON public.live_lineup_customer_orders (audience_id, ordered_at);

ALTER TABLE public.live_lineup_customer_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.live_lineup_customer_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.live_lineup_customer_orders TO authenticated;
GRANT ALL ON TABLE public.live_lineup_customer_orders TO service_role;
CREATE POLICY live_lineup_customer_orders_owner_select ON public.live_lineup_customer_orders
  FOR SELECT TO authenticated
  USING (rep_id IN (SELECT id FROM public.reps WHERE auth_user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.live_lineup_order_timestamp(value jsonb) RETURNS timestamptz
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=public AS $$
  SELECT CASE
    WHEN jsonb_typeof(value) = 'number'
      AND (value #>> '{}') ~ '^[0-9]+$'
      AND (value #>> '{}')::numeric BETWEEN 0 AND 8640000000000000
    THEN timestamp with time zone 'epoch' + ((value #>> '{}')::numeric / 1000) * interval '1 second'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.live_lineup_touch_customer_last_seen() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.audience_id IS NOT NULL THEN
    ids := array_append(ids, OLD.audience_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.audience_id IS NOT NULL THEN
    ids := array_append(ids, NEW.audience_id);
  END IF;
  UPDATE public.customer_audience c
  SET last_seen_in_lineup_at = src.last_seen
  FROM (
    SELECT a.id,
      (SELECT max(o.ordered_at) FROM public.live_lineup_customer_orders o
        WHERE o.audience_id = a.id AND o.rep_id = a.rep_id) AS last_seen
    FROM public.customer_audience a
    WHERE a.id = ANY(ids)
  ) src
  WHERE c.id = src.id
    AND c.last_seen_in_lineup_at IS DISTINCT FROM src.last_seen;
  RETURN NULL;
END $$;

CREATE TRIGGER live_lineup_customer_orders_last_seen
  AFTER INSERT OR UPDATE OR DELETE ON public.live_lineup_customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.live_lineup_touch_customer_last_seen();

-- Idempotent insert. An unchanged replay does not update the row, so last_seen stays still.
CREATE OR REPLACE FUNCTION public.live_lineup_upsert_customer_orders(p_rep_id uuid, p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  touched integer := 0;
BEGIN
  IF p_rep_id IS NULL OR jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN
    RETURN 0;
  END IF;
  INSERT INTO public.live_lineup_customer_orders (rep_id, audience_id, order_id, party_id, ordered_at)
  SELECT p_rep_id,
    (item->>'audienceId')::uuid,
    split_part(item->>'entryId', ':', 2),
    split_part(item->>'entryId', ':', 1),
    public.live_lineup_order_timestamp(item->'orderedAt')
  FROM jsonb_array_elements(p_rows) item
  WHERE item->>'entryId' ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,60}:[A-Za-z0-9][A-Za-z0-9_-]{0,60}$'
    AND item->>'audienceId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ON CONFLICT (rep_id, order_id) DO UPDATE
    SET audience_id = EXCLUDED.audience_id,
        party_id = EXCLUDED.party_id,
        ordered_at = EXCLUDED.ordered_at,
        updated_at = clock_timestamp()
    WHERE live_lineup_customer_orders.audience_id IS DISTINCT FROM EXCLUDED.audience_id
       OR live_lineup_customer_orders.party_id IS DISTINCT FROM EXCLUDED.party_id
       OR live_lineup_customer_orders.ordered_at IS DISTINCT FROM EXCLUDED.ordered_at;
  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN touched;
END $$;

-- Full-name entries in a lineup snapshot. A confirmed link wins. Otherwise only a unique name matches.
-- Ambiguous names and entries without a surname are skipped. This does not create customers.
CREATE OR REPLACE FUNCTION public.live_lineup_record_orders_from_state(p_rep_id uuid, p_state jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  rows jsonb;
BEGIN
  IF p_rep_id IS NULL OR jsonb_typeof(p_state) IS DISTINCT FROM 'object' THEN
    RETURN 0;
  END IF;
  WITH raw AS (
    SELECT value AS entry, 0 AS priority
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_state->'entries') = 'array' THEN p_state->'entries' ELSE '[]'::jsonb END)
    UNION ALL
    SELECT value->'entry', 1
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_state->'restorations') = 'array' THEN p_state->'restorations' ELSE '[]'::jsonb END)
    WHERE jsonb_typeof(value->'entry') = 'object'
  ), candidates AS (
    SELECT DISTINCT ON (split_part(entry->>'id', ':', 2))
      entry, priority
    FROM raw
    WHERE coalesce(entry->>'name', '') <> ''
      AND coalesce(entry->>'lastName', '') <> ''
      AND entry->>'id' ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,60}:[A-Za-z0-9][A-Za-z0-9_-]{0,60}$'
      AND NOT coalesce(
        jsonb_typeof(p_state#>'{show,excludedPartyIds}') = 'array'
        AND (p_state#>'{show,excludedPartyIds}') ? split_part(entry->>'id', ':', 1),
        false)
    ORDER BY split_part(entry->>'id', ':', 2), priority
  ), resolved AS (
    SELECT c.entry,
      coalesce(link.audience_id, unique_match.audience_id) AS audience_id
    FROM candidates c
    LEFT JOIN LATERAL (
      SELECT l.audience_id
      FROM public.live_lineup_customer_links l
      JOIN public.customer_audience a ON a.id = l.audience_id AND a.rep_id = l.rep_id
      WHERE l.rep_id = p_rep_id
        AND l.entry_id = c.entry->>'id'
        AND l.identity_key = public.live_lineup_audience_name_key((c.entry->>'name') || ' ' || (c.entry->>'lastName'))
        AND public.live_lineup_audience_name_key(a.name) = l.identity_key
      LIMIT 1
    ) link ON true
    LEFT JOIN LATERAL (
      SELECT CASE WHEN count(*) = 1 THEN (min(a.id::text))::uuid ELSE NULL END AS audience_id
      FROM public.customer_audience a
      WHERE link.audience_id IS NULL
        AND a.rep_id = p_rep_id
        AND public.live_lineup_audience_name_key(a.name) = public.live_lineup_audience_name_key((c.entry->>'name') || ' ' || (c.entry->>'lastName'))
    ) unique_match ON true
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'entryId', entry->>'id',
    'audienceId', audience_id,
    'orderedAt', entry->'orderedAt'
  )), '[]'::jsonb) INTO rows
  FROM resolved
  WHERE audience_id IS NOT NULL;
  RETURN public.live_lineup_upsert_customer_orders(p_rep_id, rows);
END $$;

CREATE OR REPLACE FUNCTION public.live_lineup_record_archived_customer_orders() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.live_lineup_record_orders_from_state(NEW.rep_id, NEW.state);
  RETURN NEW;
END $$;

CREATE TRIGGER live_lineup_show_archives_record_orders
  AFTER INSERT ON public.live_lineup_show_archives
  FOR EACH ROW EXECUTE FUNCTION public.live_lineup_record_archived_customer_orders();

-- Operator backfill for archives that already existed before this migration.
-- Pass a rep id to limit the scan. Null walks every rep. Safe to run again.
CREATE OR REPLACE FUNCTION public.live_lineup_backfill_customer_orders(p_rep_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='60s' AS $$
DECLARE
  archive record;
  shows integer := 0;
  touched integer := 0;
  before_count bigint;
  after_count bigint;
BEGIN
  SELECT count(*) INTO before_count FROM public.live_lineup_customer_orders
    WHERE p_rep_id IS NULL OR rep_id = p_rep_id;
  FOR archive IN
    SELECT a.rep_id, a.state
    FROM public.live_lineup_show_archives a
    WHERE p_rep_id IS NULL OR a.rep_id = p_rep_id
    ORDER BY a.rep_id, a.generation
  LOOP
    shows := shows + 1;
    touched := touched + public.live_lineup_record_orders_from_state(archive.rep_id, archive.state);
  END LOOP;
  SELECT count(*) INTO after_count FROM public.live_lineup_customer_orders
    WHERE p_rep_id IS NULL OR rep_id = p_rep_id;
  RETURN jsonb_build_object(
    'shows', shows,
    'ordersTouched', touched,
    'orders', after_count,
    'ordersAdded', after_count - before_count
  );
END $$;

CREATE OR REPLACE FUNCTION public.live_lineup_customer_activity(
  p_rep_id uuid,
  p_as_of timestamptz DEFAULT clock_timestamp()
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
  WITH bounds AS (
    SELECT coalesce(p_as_of, clock_timestamp()) AS as_of,
      coalesce(p_as_of, clock_timestamp()) - interval '90 days' AS cutoff
  ), per_customer AS (
    SELECT o.audience_id,
      bool_or(o.ordered_at >= b.cutoff AND o.ordered_at <= b.as_of) AS recent,
      bool_or(o.ordered_at < b.cutoff) AS older
    FROM public.live_lineup_customer_orders o
    CROSS JOIN bounds b
    WHERE o.rep_id = p_rep_id AND o.ordered_at IS NOT NULL
    GROUP BY o.audience_id
  )
  SELECT jsonb_build_object(
    'orderedDuringLiveLast90Days', count(*) FILTER (WHERE recent),
    'goneQuiet', count(*) FILTER (WHERE older AND NOT recent),
    'asOf', (SELECT as_of FROM bounds),
    'windowDays', 90
  )
  FROM per_customer
$$;

-- State lock first, then the card lock, so an archive commit can finish its order write
-- without deadlocking a Workspace card read that already holds the card lock.
CREATE OR REPLACE FUNCTION public.live_lineup_customer_cards(
 p_rep_id uuid,p_generation bigint,p_identities jsonb,p_action text DEFAULT 'read',
 p_entry_id text DEFAULT NULL,p_customer_id uuid DEFAULT NULL,p_new_customer_id uuid DEFAULT NULL,p_label text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='2500ms' AS $$
DECLARE
 s jsonb; e jsonb; req jsonb; k text; full_name text; n integer; selected uuid;
 c public.customer_audience%ROWTYPE; candidates jsonb; cards jsonb:='[]'; orders jsonb:='[]'; fresh boolean;
BEGIN
 IF p_action NOT IN ('read','inspect','resolve','create') OR jsonb_typeof(p_identities)<>'array'
 OR jsonb_array_length(p_identities)>2000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
 SELECT state INTO s FROM public.live_lineup_states WHERE rep_id=p_rep_id FOR SHARE;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_rep_id::text,290926));
 IF s IS NULL OR coalesce((s#>>'{show,generation}')::bigint,0)<>p_generation THEN RAISE EXCEPTION 'show_changed'; END IF;
 fresh:=coalesce(s->>'parserState'='ready' AND s ? 'publisher'
 AND (s->>'lastReceivedAt') IS NOT NULL AND (s->>'lastReadyAt') IS NOT NULL
 AND (s->>'lastReadyAt')::timestamptz<=clock_timestamp()
 AND coalesce(s->>'lastReadySourceAt',s->>'lastReadyAt')::timestamptz>clock_timestamp()-interval '45 seconds'
 AND (s#>>'{publisher,leaseExpiresAt}')::timestamptz>clock_timestamp()
 AND (NOT (s->'publisher' ? 'capabilities') OR coalesce(s#>>'{publisher,capabilities}','')=''
  OR (((s->'show') IS NOT NULL AND jsonb_typeof(s->'show')='object') OR jsonb_array_length(coalesce(s->'entries','[]'::jsonb))=0)
   AND NOT coalesce((s->>'bootstrapPending')::boolean,false)
   AND coalesce((s#>>'{sourceObservation,settled}')::boolean,false)),false);
 IF p_action IN ('resolve','create') AND NOT fresh THEN RAISE EXCEPTION 'source_not_ready'; END IF;
 IF p_action<>'read' AND (jsonb_array_length(p_identities)<>1 OR p_entry_id IS DISTINCT FROM p_identities->0->>'id') THEN RAISE EXCEPTION 'invalid_payload'; END IF;
 FOR req IN SELECT value FROM jsonb_array_elements(p_identities) LOOP
  SELECT value INTO e FROM jsonb_array_elements(s->'entries') WHERE value->>'id'=req->>'id';
  IF e IS NULL OR e->>'identityEligible' IS DISTINCT FROM 'true' OR coalesce(e->>'lastName','')=''
   OR e->>'sourceIdentityVersion' IS DISTINCT FROM req->>'sourceIdentityVersion'
   OR NOT ((s->'order') ? (e->>'id') OR (s->'held') ? (e->>'id'))
   OR coalesce((s#>'{show,excludedPartyIds}') ? split_part(e->>'id',':',1),false)
  THEN RAISE EXCEPTION 'identity_changed'; END IF;
  full_name:=(e->>'name')||' '||(e->>'lastName'); k:=public.live_lineup_audience_name_key(full_name);
  SELECT count(*) INTO n FROM public.customer_audience WHERE rep_id=p_rep_id AND public.live_lineup_audience_name_key(name)=k;
  IF p_action='create' THEN
   IF p_new_customer_id IS NULL OR length(btrim(coalesce(p_label,''))) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'label_required'; END IF;
   INSERT INTO public.customer_audience(id,rep_id,name,identity_label,record_source,sms_consent,email_consent,marketing_consent,consent_date)
    VALUES(p_new_customer_id,p_rep_id,full_name,btrim(p_label),'live_lineup',false,false,false,NULL)
    ON CONFLICT(id) DO NOTHING;
   IF FOUND THEN INSERT INTO public.customer_audience_change_log(audience_id,rep_id,actor_kind,action,changes)
    VALUES(p_new_customer_id,p_rep_id,'rep','created',jsonb_build_object('name',full_name,'identity_label',btrim(p_label),'source','live_lineup')); END IF;
   IF NOT EXISTS(SELECT 1 FROM public.customer_audience WHERE id=p_new_customer_id AND rep_id=p_rep_id
    AND public.live_lineup_audience_name_key(name)=k AND identity_label IS NOT DISTINCT FROM btrim(p_label))
    THEN RAISE EXCEPTION 'invalid_customer'; END IF;
   p_customer_id:=p_new_customer_id;
  ELSIF n=0 AND fresh THEN
   INSERT INTO public.customer_audience(rep_id,name,record_source,sms_consent,email_consent,marketing_consent,consent_date)
    VALUES(p_rep_id,full_name,'live_lineup',false,false,false,NULL) RETURNING * INTO c;
   INSERT INTO public.customer_audience_change_log(audience_id,rep_id,actor_kind,action,changes)
    VALUES(c.id,p_rep_id,'system','created',jsonb_build_object('name',full_name,'source','live_lineup'));
  END IF;
  IF p_action IN ('resolve','create') THEN
   IF NOT EXISTS(SELECT 1 FROM public.customer_audience WHERE id=p_customer_id AND rep_id=p_rep_id AND public.live_lineup_audience_name_key(name)=k)
    THEN RAISE EXCEPTION 'invalid_customer'; END IF;
   INSERT INTO public.live_lineup_customer_links(rep_id,entry_id,identity_key,audience_id)
    VALUES(p_rep_id,e->>'id',k,p_customer_id)
    ON CONFLICT(rep_id,entry_id) DO UPDATE SET identity_key=excluded.identity_key,audience_id=excluded.audience_id,confirmed_at=now();
   INSERT INTO public.live_lineup_audience_versions(rep_id,version) VALUES(p_rep_id,1)
    ON CONFLICT(rep_id) DO UPDATE SET version=live_lineup_audience_versions.version+1;
  END IF;
  SELECT count(*) INTO n FROM public.customer_audience WHERE rep_id=p_rep_id AND public.live_lineup_audience_name_key(name)=k;
  selected:=NULL;
  SELECT l.audience_id INTO selected FROM public.live_lineup_customer_links l JOIN public.customer_audience a ON a.id=l.audience_id AND a.rep_id=l.rep_id
   WHERE l.rep_id=p_rep_id AND l.entry_id=e->>'id' AND l.identity_key=k AND public.live_lineup_audience_name_key(a.name)=k;
  IF selected IS NULL AND n=1 THEN SELECT id INTO selected FROM public.customer_audience WHERE rep_id=p_rep_id AND public.live_lineup_audience_name_key(name)=k; END IF;
  c:=NULL;
  IF selected IS NOT NULL THEN SELECT * INTO c FROM public.customer_audience WHERE id=selected AND rep_id=p_rep_id; END IF;
  IF selected IS NOT NULL THEN
   orders := orders || jsonb_build_array(jsonb_build_object('entryId', e->>'id', 'audienceId', selected, 'orderedAt', e->'orderedAt'));
  END IF;
  candidates:='[]';
  IF p_action<>'read' THEN
   SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'label',identity_label,'createdAt',created_at) ORDER BY created_at,id),'[]') INTO candidates
    FROM public.customer_audience WHERE rep_id=p_rep_id AND public.live_lineup_audience_name_key(name)=k;
  END IF;
  cards:=cards||jsonb_build_array(jsonb_build_object('id',e->>'id','sourceIdentityVersion',e->>'sourceIdentityVersion',
   'status',CASE WHEN selected IS NOT NULL THEN 'matched' WHEN n>1 THEN 'needs_clarification' ELSE 'unavailable' END,
   'audienceId',selected,'label',CASE WHEN selected IS NOT NULL THEN NULLIF(left(btrim(regexp_replace(coalesce(c.identity_label,''), '[[:cntrl:]]', ' ', 'g')),80),'') ELSE NULL END,
   'birthday',CASE WHEN selected IS NOT NULL AND c.birthday_month BETWEEN 1 AND 12 AND c.birthday_day BETWEEN 1 AND 31
    AND c.birthday_day<=(ARRAY[31,29,31,30,31,30,31,31,30,31,30,31])[c.birthday_month]
    THEN c.birthday_month::text||'/'||c.birthday_day::text ELSE NULL END,
   'preferences',CASE WHEN selected IS NOT NULL THEN to_jsonb(array_remove(ARRAY[
     public.live_lineup_preference_chip(c.favorite_gem_or_stone),public.live_lineup_preference_chip(c.favorite_material),
     public.live_lineup_preference_chip(c.favorite_cut),public.live_lineup_preference_chip(c.favorite_collection)],NULL)) ELSE '[]'::jsonb END,
   'candidates',candidates));
 END LOOP;
 PERFORM public.live_lineup_upsert_customer_orders(p_rep_id, orders);
 RETURN jsonb_build_object('audienceVersion',coalesce((SELECT version::text FROM public.live_lineup_audience_versions WHERE rep_id=p_rep_id),'0'),'matches',cards);
END $$;

REVOKE ALL ON FUNCTION public.live_lineup_customer_cards(uuid,bigint,jsonb,text,text,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_lineup_customer_cards(uuid,bigint,jsonb,text,text,uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.live_lineup_order_timestamp(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_lineup_touch_customer_last_seen() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_lineup_upsert_customer_orders(uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_lineup_record_orders_from_state(uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_lineup_record_archived_customer_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_lineup_backfill_customer_orders(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_lineup_backfill_customer_orders(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.live_lineup_customer_activity(uuid,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_lineup_customer_activity(uuid,timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.customer_card_write_lock() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.live_lineup_audience_changed() FROM PUBLIC, anon, authenticated;
