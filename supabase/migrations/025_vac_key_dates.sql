-- ─── 025: VAC key dates ────────────────────────────────────────────────
-- Adds vac_key_dates: upcoming deadlines, appointments, follow-ups,
-- filings, and records requests tied optionally to a vac_conditions row.
-- Mirrors the migration 021 pattern: authenticated SELECT via RLS,
-- mutations through fn_* functions (SECURITY INVOKER, service_role only).
--
-- Note: migration number is 025 (024 is 024_nr_memory_index_compiler.sql);
-- the brief said 024 but that number was taken.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_key_dates
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_key_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date_value DATE NOT NULL,
  date_type TEXT NOT NULL CHECK (date_type IN (
    'appointment','deadline','follow_up','filing','records_request')),
  provider TEXT,
  condition_id UUID REFERENCES public.vac_conditions(id) ON DELETE SET NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
    'upcoming','completed','cancelled','missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vac_key_dates_date_value_idx
  ON public.vac_key_dates (date_value);
CREATE INDEX IF NOT EXISTS vac_key_dates_status_idx
  ON public.vac_key_dates (status);
CREATE INDEX IF NOT EXISTS vac_key_dates_condition_id_idx
  ON public.vac_key_dates (condition_id) WHERE condition_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_vac_key_dates_updated_at ON public.vac_key_dates;
CREATE TRIGGER trg_vac_key_dates_updated_at
  BEFORE UPDATE ON public.vac_key_dates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.vac_key_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vac_key_dates_auth_read ON public.vac_key_dates;
CREATE POLICY vac_key_dates_auth_read ON public.vac_key_dates
  FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- fn_create_vac_key_date
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_create_vac_key_date(
  p_title TEXT,
  p_date_value DATE,
  p_date_type TEXT,
  p_provider TEXT DEFAULT NULL,
  p_condition_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_key_dates;
BEGIN
  INSERT INTO public.vac_key_dates
    (title, date_value, date_type, provider, condition_id, description)
  VALUES
    (p_title, p_date_value, p_date_type, p_provider, p_condition_id, p_description)
  RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('note', NULL, NULL,
          format('Key date created: %s on %s (%s)', v_row.title, v_row.date_value, v_row.date_type),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_create_vac_key_date(TEXT,DATE,TEXT,TEXT,UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_vac_key_date(TEXT,DATE,TEXT,TEXT,UUID,TEXT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_update_vac_key_date
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_update_vac_key_date(
  p_id UUID,
  p_title TEXT DEFAULT NULL,
  p_date_value DATE DEFAULT NULL,
  p_date_type TEXT DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_condition_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_key_dates;
BEGIN
  UPDATE public.vac_key_dates SET
    title        = COALESCE(p_title, title),
    date_value   = COALESCE(p_date_value, date_value),
    date_type    = COALESCE(p_date_type, date_type),
    provider     = COALESCE(p_provider, provider),
    condition_id = COALESCE(p_condition_id, condition_id),
    description  = COALESCE(p_description, description),
    status       = COALESCE(p_status, status)
  WHERE id = p_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'vac_key_dates row not found: %', p_id;
  END IF;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('note', NULL, NULL,
          format('Key date updated: %s on %s (%s, status %s)',
                 v_row.title, v_row.date_value, v_row.date_type, v_row.status),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_update_vac_key_date(UUID,TEXT,DATE,TEXT,TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_vac_key_date(UUID,TEXT,DATE,TEXT,TEXT,UUID,TEXT,TEXT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_delete_vac_key_date — hard delete (not medical records; scheduling only)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_delete_vac_key_date(
  p_id UUID,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_key_dates;
BEGIN
  SELECT * INTO v_row FROM public.vac_key_dates WHERE id = p_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'vac_key_dates row not found: %', p_id;
  END IF;

  DELETE FROM public.vac_key_dates WHERE id = p_id;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('note', NULL, NULL,
          format('Key date deleted: %s on %s (%s)', v_row.title, v_row.date_value, v_row.date_type),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_delete_vac_key_date(UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_vac_key_date(UUID,TEXT) TO service_role;

COMMIT;
