-- Additive customer identity foundation. No Finder bridge or messaging side effects.
ALTER TABLE public.customer_audience
 ADD COLUMN IF NOT EXISTS identity_label text,
 ADD COLUMN IF NOT EXISTS profile_version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.customer_audience ADD CONSTRAINT customer_identity_label_length CHECK (length(identity_label)<=80);
ALTER TABLE public.customer_audience DROP CONSTRAINT IF EXISTS customer_audience_record_source_check;
ALTER TABLE public.customer_audience ADD CONSTRAINT customer_audience_record_source_check
 CHECK(record_source IN ('manual','manual_import','nic_nac','customer_site_signup','live_lineup'));

-- Serialize creation across browser tabs and other card writers; never impose unique names.
CREATE OR REPLACE FUNCTION public.customer_card_write_lock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.rep_id::text,290926));
 IF TG_OP='UPDATE' THEN NEW.profile_version:=OLD.profile_version+1; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER customer_card_write_lock BEFORE INSERT OR UPDATE ON public.customer_audience
 FOR EACH ROW EXECUTE FUNCTION public.customer_card_write_lock();

CREATE TABLE public.live_lineup_customer_links(
 rep_id uuid NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
 entry_id text NOT NULL CHECK(length(entry_id)<=160),
 identity_key text NOT NULL,
 audience_id uuid NOT NULL,
 confirmed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(rep_id,entry_id),
 FOREIGN KEY(audience_id,rep_id) REFERENCES public.customer_audience(id,rep_id) ON DELETE CASCADE
);
ALTER TABLE public.live_lineup_customer_links ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.live_lineup_customer_links TO service_role;

CREATE OR REPLACE FUNCTION public.live_lineup_customer_cards(
 p_rep_id uuid,p_generation bigint,p_identities jsonb,p_action text DEFAULT 'read',
 p_entry_id text DEFAULT NULL,p_customer_id uuid DEFAULT NULL,p_new_customer_id uuid DEFAULT NULL,p_label text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET statement_timeout='2500ms' AS $$
DECLARE
 s jsonb; e jsonb; req jsonb; k text; full_name text; n integer; selected uuid;
 c public.customer_audience%ROWTYPE; candidates jsonb; cards jsonb:='[]'; fresh boolean;
BEGIN
 IF p_action NOT IN ('read','inspect','resolve','create') OR jsonb_typeof(p_identities)<>'array'
 OR jsonb_array_length(p_identities)>2000 THEN RAISE EXCEPTION 'invalid_payload'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_rep_id::text,290926));
 SELECT state INTO s FROM public.live_lineup_states WHERE rep_id=p_rep_id FOR SHARE;
 IF s IS NULL OR coalesce((s#>>'{show,generation}')::bigint,0)<>p_generation THEN RAISE EXCEPTION 'show_changed'; END IF;
 fresh:=coalesce(s->>'parserState'='ready' AND (s->>'lastReadyAt')::timestamptz<=clock_timestamp()
 AND (s->>'lastReceivedAt')::timestamptz<=clock_timestamp()
 AND coalesce(s->>'lastReadySourceAt',s->>'lastReadyAt')::timestamptz>clock_timestamp()-interval '45 seconds'
 AND (s#>>'{publisher,leaseExpiresAt}')::timestamptz>clock_timestamp()
 AND (s#>>'{sourceObservation,settled}')::boolean AND NOT coalesce((s->>'bootstrapPending')::boolean,false),false);
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
   IF NOT EXISTS(SELECT 1 FROM public.customer_audience WHERE id=p_new_customer_id AND rep_id=p_rep_id AND public.live_lineup_audience_name_key(name)=k)
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
  candidates:='[]';
  IF p_action<>'read' THEN
   SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'label',identity_label,'createdAt',created_at) ORDER BY created_at,id),'[]') INTO candidates
    FROM public.customer_audience WHERE rep_id=p_rep_id AND public.live_lineup_audience_name_key(name)=k;
  END IF;
  cards:=cards||jsonb_build_array(jsonb_build_object('id',e->>'id','sourceIdentityVersion',e->>'sourceIdentityVersion',
   'status',CASE WHEN selected IS NOT NULL THEN 'matched' WHEN n>1 THEN 'needs_clarification' ELSE 'unavailable' END,
   'audienceId',selected,'label',c.identity_label,'birthday',CASE WHEN c.birthday_month IS NOT NULL THEN c.birthday_month::text||'/'||c.birthday_day::text ELSE NULL END,
   'preferences',to_jsonb(array_remove(ARRAY[c.favorite_gem_or_stone,c.favorite_material,c.favorite_cut,c.favorite_collection],NULL)),
   'candidates',candidates));
 END LOOP;
 RETURN jsonb_build_object('audienceVersion',coalesce((SELECT version::text FROM public.live_lineup_audience_versions WHERE rep_id=p_rep_id),'0'),'matches',cards);
END $$;
REVOKE ALL ON FUNCTION public.live_lineup_customer_cards(uuid,bigint,jsonb,text,text,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.live_lineup_customer_cards(uuid,bigint,jsonb,text,text,uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.customer_card_write_lock() FROM PUBLIC,anon,authenticated;
