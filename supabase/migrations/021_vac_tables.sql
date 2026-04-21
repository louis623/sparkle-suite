-- ─── 021: VAC tables + write functions + Build Tracker create functions ─────
-- Adds the VA Compensation (VAC) schema: 7 tables, 3 views, 19 write
-- functions (SECURITY INVOKER, service_role-only). Dashboard reads via
-- PostgREST with authenticated SELECT; all mutations go through the
-- fn_* functions called from the nr-hq-mcp Edge Function (service_role).
--
-- Existing tables (open_items, construction_phases/tasks/gates,
-- build_action_log) already grant authenticated SELECT (migration 018 +
-- pre-existing `public` policies on construction_*) — no RLS changes
-- for them here. Verified via Management API before writing this file.
--
-- update_updated_at_column() was created in migration 011 — reused here.
--
-- Seed: vac_phase_state singleton + vac_rating_compensation_rates
-- (2025 + 2026 veteran_with_spouse). Rate provenance note logged to
-- vac_activity_log at seed time — Louis verifies independently against
-- va.gov before relying on monthly_compensation for filings.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_conditions
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  icd_code TEXT,
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  pipeline_stage TEXT NOT NULL DEFAULT 'discovery' CHECK (pipeline_stage IN (
    'discovery','intake','extraction','analysis','strategy',
    'filed','decision_pending','granted','denied','appeal','deferred')),
  claim_type TEXT CHECK (claim_type IS NULL OR claim_type IN (
    'original','supplemental','hlr','bva','secondary','presumptive')),
  evidence_score INT CHECK (evidence_score IS NULL OR evidence_score BETWEEN 0 AND 100),
  current_rating_pct INT CHECK (current_rating_pct IS NULL OR
    (current_rating_pct BETWEEN 0 AND 100 AND current_rating_pct % 10 = 0)),
  deadline DATE,
  causation_root TEXT,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slug is globally unique (including soft-deleted rows) so restore works.
CREATE UNIQUE INDEX IF NOT EXISTS vac_conditions_slug_unique_idx
  ON public.vac_conditions (LOWER(TRIM(slug)));
CREATE INDEX IF NOT EXISTS vac_conditions_pipeline_stage_active_idx
  ON public.vac_conditions (pipeline_stage) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS vac_conditions_tier_active_idx
  ON public.vac_conditions (tier) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS vac_conditions_deadline_active_idx
  ON public.vac_conditions (deadline)
  WHERE deadline IS NOT NULL AND archived_at IS NULL;

DROP TRIGGER IF EXISTS trg_vac_conditions_updated_at ON public.vac_conditions;
CREATE TRIGGER trg_vac_conditions_updated_at
  BEFORE UPDATE ON public.vac_conditions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_sources
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN (
    'va_clinical','decision_letters','nexus','mayo',
    'lay_statements','va_correspondence','service_records')),
  physical_location TEXT,
  external_ref TEXT,
  checksum TEXT,
  date_of_record DATE,
  processing_stage TEXT NOT NULL DEFAULT 'intake' CHECK (processing_stage IN (
    'intake','extraction','analysis','complete','skipped')),
  sub_chat_output_ref TEXT,
  summary TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vac_sources_bucket_active_idx
  ON public.vac_sources (bucket) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS vac_sources_processing_stage_active_idx
  ON public.vac_sources (processing_stage) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS vac_sources_checksum_idx
  ON public.vac_sources (checksum) WHERE checksum IS NOT NULL;

DROP TRIGGER IF EXISTS trg_vac_sources_updated_at ON public.vac_sources;
CREATE TRIGGER trg_vac_sources_updated_at
  BEFORE UPDATE ON public.vac_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_interlinks
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_interlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_a_id UUID NOT NULL REFERENCES public.vac_conditions(id) ON DELETE CASCADE,
  condition_b_id UUID NOT NULL REFERENCES public.vac_conditions(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('causation','evidence','dependency','presumptive')),
  reason TEXT,
  source_id UUID REFERENCES public.vac_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (condition_a_id <> condition_b_id)
);

-- Directional types: A→B and B→A are distinct links
CREATE UNIQUE INDEX IF NOT EXISTS vac_interlinks_directional_unique_idx
  ON public.vac_interlinks (condition_a_id, condition_b_id, link_type)
  WHERE link_type IN ('causation','dependency');

-- Undirected types: A↔B and B↔A are the same link
CREATE UNIQUE INDEX IF NOT EXISTS vac_interlinks_undirected_unique_idx
  ON public.vac_interlinks (
    LEAST(condition_a_id, condition_b_id),
    GREATEST(condition_a_id, condition_b_id),
    link_type
  ) WHERE link_type IN ('evidence','presumptive');

CREATE INDEX IF NOT EXISTS vac_interlinks_a_idx ON public.vac_interlinks (condition_a_id);
CREATE INDEX IF NOT EXISTS vac_interlinks_b_idx ON public.vac_interlinks (condition_b_id);

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_source_condition_links
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_source_condition_links (
  source_id UUID NOT NULL REFERENCES public.vac_sources(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES public.vac_conditions(id) ON DELETE CASCADE,
  relevance TEXT CHECK (relevance IS NULL OR relevance IN ('primary','supporting','contextual')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_id, condition_id)
);

CREATE INDEX IF NOT EXISTS vac_source_condition_links_condition_idx
  ON public.vac_source_condition_links (condition_id);

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_activity_log
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'condition_created','condition_updated','condition_stage_changed',
    'condition_rating_changed','condition_deadline_changed',
    'condition_archived','condition_restored',
    'source_added','source_updated','source_processed',
    'source_linked_to_condition','source_unlinked',
    'interlink_added','interlink_removed',
    'phase_changed','phase_progress_updated',
    'filing_made','decision_received','note')),
  subject_type TEXT CHECK (subject_type IS NULL OR subject_type IN ('condition','source','interlink','phase')),
  subject_id UUID,
  description TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vac_activity_log_created_at_idx
  ON public.vac_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS vac_activity_log_subject_idx
  ON public.vac_activity_log (subject_type, subject_id);

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_phase_state (singleton)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_phase_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_phase TEXT NOT NULL DEFAULT 'records_scrub' CHECK (current_phase IN (
    'records_scrub','records_expansion','deep_research')),
  progress_count INT NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
  progress_total INT NOT NULL DEFAULT 0 CHECK (progress_total >= 0),
  last_transition_date DATE,
  notes TEXT,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.vac_phase_state (id, current_phase, progress_count, progress_total)
VALUES (1, 'records_scrub', 0, 0)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_vac_phase_state_updated_at ON public.vac_phase_state;
CREATE TRIGGER trg_vac_phase_state_updated_at
  BEFORE UPDATE ON public.vac_phase_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_rating_compensation_rates
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_rating_compensation_rates (
  rating_pct INT NOT NULL CHECK (rating_pct BETWEEN 0 AND 100 AND rating_pct % 10 = 0),
  dependent_profile TEXT NOT NULL,
  monthly_amount NUMERIC(10,2) NOT NULL,
  effective_year INT NOT NULL,
  PRIMARY KEY (rating_pct, dependent_profile, effective_year)
);

-- 2026 rates (effective December 1, 2025) — veteran_with_spouse
-- Source: va.gov/disability/compensation-rates/veteran-rates/ (fetched 2026-04-21)
-- 10%/20% have no spouse uplift; same as veteran-alone rates.
INSERT INTO public.vac_rating_compensation_rates (rating_pct, dependent_profile, monthly_amount, effective_year)
VALUES
  (0,   'veteran_with_spouse', 0.00,    2026),
  (10,  'veteran_with_spouse', 180.42,  2026),
  (20,  'veteran_with_spouse', 356.66,  2026),
  (30,  'veteran_with_spouse', 617.47,  2026),
  (40,  'veteran_with_spouse', 882.84,  2026),
  (50,  'veteran_with_spouse', 1241.90, 2026),
  (60,  'veteran_with_spouse', 1566.02, 2026),
  (70,  'veteran_with_spouse', 1961.45, 2026),
  (80,  'veteran_with_spouse', 2277.15, 2026),
  (90,  'veteran_with_spouse', 2559.30, 2026),
  (100, 'veteran_with_spouse', 4158.17, 2026)
ON CONFLICT (rating_pct, dependent_profile, effective_year) DO NOTHING;

-- 2025 rates (effective December 1, 2024) — veteran_with_spouse
-- Source: publicly published 2025 VA rates (2.5% COLA over 2024).
-- These MUST be verified against va.gov before relying on historical lookups
-- in filings. See vac_activity_log seed entry below.
INSERT INTO public.vac_rating_compensation_rates (rating_pct, dependent_profile, monthly_amount, effective_year)
VALUES
  (0,   'veteran_with_spouse', 0.00,    2025),
  (10,  'veteran_with_spouse', 175.51,  2025),
  (20,  'veteran_with_spouse', 347.01,  2025),
  (30,  'veteran_with_spouse', 601.86,  2025),
  (40,  'veteran_with_spouse', 860.53,  2025),
  (50,  'veteran_with_spouse', 1210.65, 2025),
  (60,  'veteran_with_spouse', 1526.36, 2025),
  (70,  'veteran_with_spouse', 1912.63, 2025),
  (80,  'veteran_with_spouse', 2220.37, 2025),
  (90,  'veteran_with_spouse', 2495.42, 2025),
  (100, 'veteran_with_spouse', 4054.80, 2025)
ON CONFLICT (rating_pct, dependent_profile, effective_year) DO NOTHING;

-- Provenance note for Louis.
INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
VALUES (
  'note', NULL, NULL,
  'VAC rate table seeded: 2026 rates from va.gov/disability/compensation-rates/veteran-rates/ (fetched 2026-04-21); 2025 rates from publicly published 2.5% COLA figures. Verify against va.gov before relying on monthly_compensation for filings.',
  'migration'
);

-- ═══════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════

-- vac_last_activity_v — always 1 row
CREATE OR REPLACE VIEW public.vac_last_activity_v
  WITH (security_invoker = true) AS
SELECT
  anchor.one,
  (SELECT MAX(created_at) FROM public.vac_activity_log) AS last_activity_at
FROM (SELECT 1 AS one) anchor;

-- vac_rating_summary_v — always 1 row
CREATE OR REPLACE VIEW public.vac_rating_summary_v
  WITH (security_invoker = true) AS
WITH
  granted AS (
    SELECT current_rating_pct
    FROM public.vac_conditions
    WHERE archived_at IS NULL
      AND pipeline_stage = 'granted'
      AND current_rating_pct IS NOT NULL
      AND current_rating_pct > 0
  ),
  combined AS (
    SELECT
      CASE
        WHEN EXISTS (SELECT 1 FROM granted WHERE current_rating_pct = 100) THEN 100
        WHEN NOT EXISTS (SELECT 1 FROM granted) THEN 0
        ELSE (
          LEAST(100,
            ROUND((1 - EXP(SUM(LN(1 - current_rating_pct::numeric / 100.0)))) * 10.0) * 10
          )::int
        )
      END AS combined_rating_pct
    FROM granted
  ),
  rate_year AS (
    SELECT COALESCE(
      (SELECT effective_year
         FROM public.vac_rating_compensation_rates
         WHERE effective_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
           AND dependent_profile = 'veteran_with_spouse'
         LIMIT 1),
      (SELECT MAX(effective_year)
         FROM public.vac_rating_compensation_rates
         WHERE effective_year <= EXTRACT(YEAR FROM CURRENT_DATE)::int
           AND dependent_profile = 'veteran_with_spouse')
    ) AS rate_year_used
  ),
  filed_pending AS (
    SELECT COUNT(*)::int AS filed_and_pending_count
    FROM public.vac_conditions
    WHERE archived_at IS NULL
      AND pipeline_stage IN ('filed','decision_pending')
  )
SELECT
  COALESCE(c.combined_rating_pct, 0) AS combined_rating_pct,
  (SELECT monthly_amount
     FROM public.vac_rating_compensation_rates r
     WHERE r.rating_pct = COALESCE(c.combined_rating_pct, 0)
       AND r.dependent_profile = 'veteran_with_spouse'
       AND r.effective_year = ry.rate_year_used
     LIMIT 1) AS monthly_compensation,
  ry.rate_year_used,
  fp.filed_and_pending_count
FROM (SELECT 1 AS one) anchor
LEFT JOIN combined c ON TRUE
LEFT JOIN rate_year ry ON TRUE
LEFT JOIN filed_pending fp ON TRUE;

-- vac_action_items_v — union of deadline-bearing conditions + high-priority open_items
CREATE OR REPLACE VIEW public.vac_action_items_v
  WITH (security_invoker = true) AS
WITH
  deadline_items AS (
    SELECT
      'deadline'::text AS source_type,
      c.id AS source_id,
      c.name AS title,
      ('Deadline: ' || c.deadline::text || ' (' || c.pipeline_stage || ')') AS description,
      c.deadline AS priority_date,
      CASE
        WHEN c.deadline <= CURRENT_DATE + INTERVAL '14 days' THEN 'red'
        WHEN c.deadline <= CURRENT_DATE + INTERVAL '30 days' THEN 'amber'
        ELSE 'cyan'
      END AS urgency
    FROM public.vac_conditions c
    WHERE c.archived_at IS NULL
      AND c.deadline IS NOT NULL
      AND c.pipeline_stage NOT IN ('granted','denied','deferred')
  ),
  open_item_rows AS (
    SELECT
      'open_item'::text AS source_type,
      oi.id AS source_id,
      oi.title AS title,
      oi.description AS description,
      NULL::date AS priority_date,
      oi.priority::text AS urgency
    FROM public.open_items oi
    WHERE oi.project = 'va_compensation'
      AND oi.status IN ('open','in_progress')
      AND oi.priority = 'high'
  ),
  combined AS (
    SELECT * FROM deadline_items
    UNION ALL
    SELECT * FROM open_item_rows
  )
SELECT
  c.source_type, c.source_id, c.title, c.description, c.priority_date, c.urgency
FROM (SELECT 1 AS one) anchor
LEFT JOIN LATERAL (
  SELECT * FROM combined
  ORDER BY
    CASE urgency
      WHEN 'red'    THEN 0
      WHEN 'high'   THEN 1
      WHEN 'amber'  THEN 2
      WHEN 'medium' THEN 3
      WHEN 'cyan'  THEN 4
      WHEN 'low'    THEN 5
      ELSE 6
    END ASC,
    priority_date ASC NULLS LAST
  LIMIT 10
) c ON TRUE;

-- ═══════════════════════════════════════════════════════════════════════
-- RLS ON NEW TABLES
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.vac_conditions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vac_sources                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vac_interlinks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vac_source_condition_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vac_activity_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vac_phase_state             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vac_rating_compensation_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vac_conditions_auth_read ON public.vac_conditions;
CREATE POLICY vac_conditions_auth_read ON public.vac_conditions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vac_sources_auth_read ON public.vac_sources;
CREATE POLICY vac_sources_auth_read ON public.vac_sources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vac_interlinks_auth_read ON public.vac_interlinks;
CREATE POLICY vac_interlinks_auth_read ON public.vac_interlinks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vac_source_condition_links_auth_read ON public.vac_source_condition_links;
CREATE POLICY vac_source_condition_links_auth_read ON public.vac_source_condition_links
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vac_activity_log_auth_read ON public.vac_activity_log;
CREATE POLICY vac_activity_log_auth_read ON public.vac_activity_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vac_phase_state_auth_read ON public.vac_phase_state;
CREATE POLICY vac_phase_state_auth_read ON public.vac_phase_state
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vac_rating_compensation_rates_auth_read ON public.vac_rating_compensation_rates;
CREATE POLICY vac_rating_compensation_rates_auth_read ON public.vac_rating_compensation_rates
  FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- HELPER: resolve VAC condition by id-or-slug
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_resolve_vac_condition(p_id_or_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_id_or_slug IS NULL OR length(trim(p_id_or_slug)) = 0 THEN
    RAISE EXCEPTION 'condition id_or_slug is required';
  END IF;

  -- Try UUID first
  BEGIN
    v_id := p_id_or_slug::uuid;
    IF EXISTS (SELECT 1 FROM public.vac_conditions WHERE id = v_id) THEN
      RETURN v_id;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    -- fall through to slug lookup
    NULL;
  END;

  -- Slug lookup
  SELECT id INTO v_id
    FROM public.vac_conditions
    WHERE LOWER(TRIM(slug)) = LOWER(TRIM(p_id_or_slug))
    LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'vac_conditions row not found for id_or_slug: %', p_id_or_slug;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_resolve_vac_condition(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_vac_condition(TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_create_vac_condition
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_create_vac_condition(
  p_slug TEXT,
  p_name TEXT,
  p_tier INT,
  p_icd_code TEXT DEFAULT NULL,
  p_claim_type TEXT DEFAULT NULL,
  p_evidence_score INT DEFAULT NULL,
  p_current_rating_pct INT DEFAULT NULL,
  p_deadline DATE DEFAULT NULL,
  p_causation_root TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_conditions;
  v_slug TEXT := LOWER(TRIM(p_slug));
BEGIN
  INSERT INTO public.vac_conditions
    (slug, name, tier, icd_code, claim_type, evidence_score,
     current_rating_pct, deadline, causation_root, notes)
  VALUES
    (v_slug, p_name, p_tier, p_icd_code, p_claim_type, p_evidence_score,
     p_current_rating_pct, p_deadline, p_causation_root, p_notes)
  RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('condition_created', 'condition', v_row.id,
          format('Condition created: %s (tier %s, stage %s)', v_row.name, v_row.tier, v_row.pipeline_stage),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_create_vac_condition(TEXT,TEXT,INT,TEXT,TEXT,INT,INT,DATE,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_vac_condition(TEXT,TEXT,INT,TEXT,TEXT,INT,INT,DATE,TEXT,TEXT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_update_vac_condition
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_update_vac_condition(
  p_id_or_slug TEXT,
  p_name TEXT DEFAULT NULL,
  p_icd_code TEXT DEFAULT NULL,
  p_claim_type TEXT DEFAULT NULL,
  p_evidence_score INT DEFAULT NULL,
  p_causation_root TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id UUID := public.fn_resolve_vac_condition(p_id_or_slug);
  v_row public.vac_conditions;
BEGIN
  IF (SELECT archived_at FROM public.vac_conditions WHERE id = v_id) IS NOT NULL THEN
    RAISE EXCEPTION 'cannot update archived condition: %', p_id_or_slug;
  END IF;

  UPDATE public.vac_conditions SET
    name           = COALESCE(p_name, name),
    icd_code       = COALESCE(p_icd_code, icd_code),
    claim_type     = COALESCE(p_claim_type, claim_type),
    evidence_score = COALESCE(p_evidence_score, evidence_score),
    causation_root = COALESCE(p_causation_root, causation_root),
    notes          = COALESCE(p_notes, notes)
  WHERE id = v_id
  RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('condition_updated', 'condition', v_id,
          format('Condition updated: %s', v_row.name),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_update_vac_condition(TEXT,TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_vac_condition(TEXT,TEXT,TEXT,TEXT,INT,TEXT,TEXT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_set_vac_condition_stage
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_set_vac_condition_stage(
  p_id_or_slug TEXT,
  p_new_stage TEXT,
  p_reason TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id UUID := public.fn_resolve_vac_condition(p_id_or_slug);
  v_old TEXT;
  v_row public.vac_conditions;
BEGIN
  SELECT pipeline_stage INTO v_old FROM public.vac_conditions WHERE id = v_id;

  IF (SELECT archived_at FROM public.vac_conditions WHERE id = v_id) IS NOT NULL THEN
    RAISE EXCEPTION 'cannot change stage on archived condition: %', p_id_or_slug;
  END IF;

  UPDATE public.vac_conditions SET pipeline_stage = p_new_stage
  WHERE id = v_id RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('condition_stage_changed', 'condition', v_id,
          format('Stage: %s → %s%s', v_old, p_new_stage,
                 CASE WHEN p_reason IS NULL THEN '' ELSE ' (' || p_reason || ')' END),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_set_vac_condition_stage(TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_vac_condition_stage(TEXT,TEXT,TEXT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_set_vac_condition_rating
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_set_vac_condition_rating(
  p_id_or_slug TEXT,
  p_new_rating_pct INT,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id UUID := public.fn_resolve_vac_condition(p_id_or_slug);
  v_old INT;
  v_row public.vac_conditions;
BEGIN
  SELECT current_rating_pct INTO v_old FROM public.vac_conditions WHERE id = v_id;

  IF (SELECT archived_at FROM public.vac_conditions WHERE id = v_id) IS NOT NULL THEN
    RAISE EXCEPTION 'cannot change rating on archived condition: %', p_id_or_slug;
  END IF;

  UPDATE public.vac_conditions SET current_rating_pct = p_new_rating_pct
  WHERE id = v_id RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('condition_rating_changed', 'condition', v_id,
          format('Rating: %s%% → %s%%', COALESCE(v_old::text,'(none)'), p_new_rating_pct),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_set_vac_condition_rating(TEXT,INT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_vac_condition_rating(TEXT,INT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_set_vac_condition_deadline
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_set_vac_condition_deadline(
  p_id_or_slug TEXT,
  p_new_deadline DATE,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id UUID := public.fn_resolve_vac_condition(p_id_or_slug);
  v_old DATE;
  v_row public.vac_conditions;
BEGIN
  SELECT deadline INTO v_old FROM public.vac_conditions WHERE id = v_id;

  IF (SELECT archived_at FROM public.vac_conditions WHERE id = v_id) IS NOT NULL THEN
    RAISE EXCEPTION 'cannot change deadline on archived condition: %', p_id_or_slug;
  END IF;

  UPDATE public.vac_conditions SET deadline = p_new_deadline
  WHERE id = v_id RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('condition_deadline_changed', 'condition', v_id,
          format('Deadline: %s → %s', COALESCE(v_old::text,'(none)'), COALESCE(p_new_deadline::text,'(cleared)')),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_set_vac_condition_deadline(TEXT,DATE,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_vac_condition_deadline(TEXT,DATE,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_archive_vac_condition / fn_restore_vac_condition
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_archive_vac_condition(
  p_id_or_slug TEXT,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id UUID := public.fn_resolve_vac_condition(p_id_or_slug);
  v_row public.vac_conditions;
BEGIN
  IF (SELECT archived_at FROM public.vac_conditions WHERE id = v_id) IS NOT NULL THEN
    RAISE EXCEPTION 'condition already archived: %', p_id_or_slug;
  END IF;

  UPDATE public.vac_conditions SET archived_at = NOW()
  WHERE id = v_id RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('condition_archived', 'condition', v_id,
          format('Archived: %s', v_row.name), p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_archive_vac_condition(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_archive_vac_condition(TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_restore_vac_condition(
  p_id_or_slug TEXT,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id UUID := public.fn_resolve_vac_condition(p_id_or_slug);
  v_row public.vac_conditions;
BEGIN
  IF (SELECT archived_at FROM public.vac_conditions WHERE id = v_id) IS NULL THEN
    RAISE EXCEPTION 'condition is not archived: %', p_id_or_slug;
  END IF;

  UPDATE public.vac_conditions SET archived_at = NULL
  WHERE id = v_id RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('condition_restored', 'condition', v_id,
          format('Restored: %s', v_row.name), p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_restore_vac_condition(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_restore_vac_condition(TEXT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_create_vac_source / fn_update_vac_source / fn_set_source_processing_stage
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_create_vac_source(
  p_title TEXT,
  p_bucket TEXT,
  p_physical_location TEXT DEFAULT NULL,
  p_external_ref TEXT DEFAULT NULL,
  p_checksum TEXT DEFAULT NULL,
  p_date_of_record DATE DEFAULT NULL,
  p_processing_stage TEXT DEFAULT 'intake',
  p_summary TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_sources;
BEGIN
  INSERT INTO public.vac_sources
    (title, bucket, physical_location, external_ref, checksum, date_of_record, processing_stage, summary)
  VALUES
    (p_title, p_bucket, p_physical_location, p_external_ref, p_checksum, p_date_of_record, p_processing_stage, p_summary)
  RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('source_added', 'source', v_row.id,
          format('Source added: %s (bucket %s)', v_row.title, v_row.bucket), p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_create_vac_source(TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_vac_source(TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_update_vac_source(
  p_id UUID,
  p_title TEXT DEFAULT NULL,
  p_bucket TEXT DEFAULT NULL,
  p_physical_location TEXT DEFAULT NULL,
  p_external_ref TEXT DEFAULT NULL,
  p_checksum TEXT DEFAULT NULL,
  p_date_of_record DATE DEFAULT NULL,
  p_summary TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_sources;
BEGIN
  IF (SELECT archived_at FROM public.vac_sources WHERE id = p_id) IS NOT NULL THEN
    RAISE EXCEPTION 'cannot update archived source: %', p_id;
  END IF;

  UPDATE public.vac_sources SET
    title             = COALESCE(p_title, title),
    bucket            = COALESCE(p_bucket, bucket),
    physical_location = COALESCE(p_physical_location, physical_location),
    external_ref      = COALESCE(p_external_ref, external_ref),
    checksum          = COALESCE(p_checksum, checksum),
    date_of_record    = COALESCE(p_date_of_record, date_of_record),
    summary           = COALESCE(p_summary, summary)
  WHERE id = p_id RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'vac_sources row not found: %', p_id;
  END IF;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('source_updated', 'source', p_id,
          format('Source updated: %s', v_row.title), p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_update_vac_source(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_vac_source(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_set_source_processing_stage(
  p_id UUID,
  p_new_stage TEXT,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_sources;
  v_old TEXT;
BEGIN
  SELECT processing_stage INTO v_old FROM public.vac_sources WHERE id = p_id;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'vac_sources row not found: %', p_id;
  END IF;

  IF (SELECT archived_at FROM public.vac_sources WHERE id = p_id) IS NOT NULL THEN
    RAISE EXCEPTION 'cannot change stage on archived source: %', p_id;
  END IF;

  UPDATE public.vac_sources SET processing_stage = p_new_stage
  WHERE id = p_id RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES (
    CASE WHEN p_new_stage = 'complete' THEN 'source_processed' ELSE 'source_updated' END,
    'source', p_id,
    format('Source stage: %s → %s (%s)', v_old, p_new_stage, v_row.title),
    p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_set_source_processing_stage(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_set_source_processing_stage(UUID,TEXT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_link_source_to_condition / fn_unlink_source_from_condition
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_link_source_to_condition(
  p_source_id UUID,
  p_condition_id_or_slug TEXT,
  p_relevance TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_cond_id UUID := public.fn_resolve_vac_condition(p_condition_id_or_slug);
  v_row public.vac_source_condition_links;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.vac_sources WHERE id = p_source_id) THEN
    RAISE EXCEPTION 'vac_sources row not found: %', p_source_id;
  END IF;

  INSERT INTO public.vac_source_condition_links (source_id, condition_id, relevance, notes)
  VALUES (p_source_id, v_cond_id, p_relevance, p_notes)
  ON CONFLICT (source_id, condition_id)
  DO UPDATE SET
    relevance = COALESCE(EXCLUDED.relevance, vac_source_condition_links.relevance),
    notes     = COALESCE(EXCLUDED.notes, vac_source_condition_links.notes)
  RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('source_linked_to_condition', 'source', p_source_id,
          format('Linked source %s to condition %s (relevance %s)',
                 p_source_id, v_cond_id, COALESCE(p_relevance,'—')),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_link_source_to_condition(UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_link_source_to_condition(UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_unlink_source_from_condition(
  p_source_id UUID,
  p_condition_id_or_slug TEXT,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_cond_id UUID := public.fn_resolve_vac_condition(p_condition_id_or_slug);
  v_deleted INT;
BEGIN
  DELETE FROM public.vac_source_condition_links
    WHERE source_id = p_source_id AND condition_id = v_cond_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'link not found: source=% condition=%', p_source_id, v_cond_id;
  END IF;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('source_unlinked', 'source', p_source_id,
          format('Unlinked source %s from condition %s', p_source_id, v_cond_id),
          p_actor);

  RETURN jsonb_build_object('source_id', p_source_id, 'condition_id', v_cond_id, 'unlinked', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_unlink_source_from_condition(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_unlink_source_from_condition(UUID,TEXT,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_create_vac_interlink / fn_remove_vac_interlink
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_create_vac_interlink(
  p_condition_a_id_or_slug TEXT,
  p_condition_b_id_or_slug TEXT,
  p_link_type TEXT,
  p_reason TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_a UUID := public.fn_resolve_vac_condition(p_condition_a_id_or_slug);
  v_b UUID := public.fn_resolve_vac_condition(p_condition_b_id_or_slug);
  v_row public.vac_interlinks;
BEGIN
  IF v_a = v_b THEN
    RAISE EXCEPTION 'interlink requires two distinct conditions';
  END IF;

  INSERT INTO public.vac_interlinks (condition_a_id, condition_b_id, link_type, reason, source_id)
  VALUES (v_a, v_b, p_link_type, p_reason, p_source_id)
  RETURNING * INTO v_row;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('interlink_added', 'interlink', v_row.id,
          format('Interlink %s → %s (%s)%s',
                 v_a, v_b, p_link_type,
                 CASE WHEN p_reason IS NULL THEN '' ELSE ': ' || p_reason END),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_create_vac_interlink(TEXT,TEXT,TEXT,TEXT,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_vac_interlink(TEXT,TEXT,TEXT,TEXT,UUID,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_remove_vac_interlink(
  p_interlink_id UUID,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_interlinks;
BEGIN
  DELETE FROM public.vac_interlinks WHERE id = p_interlink_id RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'vac_interlinks row not found: %', p_interlink_id;
  END IF;

  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES ('interlink_removed', 'interlink', p_interlink_id,
          format('Interlink removed: %s → %s (%s)', v_row.condition_a_id, v_row.condition_b_id, v_row.link_type),
          p_actor);

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_remove_vac_interlink(UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_remove_vac_interlink(UUID,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_log_vac_activity — free-form logger for the log_vac_activity MCP tool
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_log_vac_activity(
  p_entry_type TEXT,
  p_description TEXT,
  p_subject_type TEXT DEFAULT NULL,
  p_subject_id UUID DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row public.vac_activity_log;
BEGIN
  INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
  VALUES (p_entry_type, p_subject_type, p_subject_id, p_description, p_actor)
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_log_vac_activity(TEXT,TEXT,TEXT,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_log_vac_activity(TEXT,TEXT,TEXT,UUID,TEXT) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- fn_update_vac_phase_state — optimistic concurrency by version
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_update_vac_phase_state(
  p_expected_version INT,
  p_current_phase TEXT DEFAULT NULL,
  p_progress_count INT DEFAULT NULL,
  p_progress_total INT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor TEXT DEFAULT 'chat'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_old public.vac_phase_state;
  v_new public.vac_phase_state;
  v_current_version INT;
  v_phase_changed BOOLEAN;
  v_progress_changed BOOLEAN;
BEGIN
  SELECT * INTO v_old FROM public.vac_phase_state WHERE id = 1;

  IF v_old.version <> p_expected_version THEN
    SELECT version INTO v_current_version FROM public.vac_phase_state WHERE id = 1;
    RAISE EXCEPTION 'version conflict: expected %, current is %, retry with fresh state',
      p_expected_version, v_current_version;
  END IF;

  UPDATE public.vac_phase_state SET
    current_phase        = COALESCE(p_current_phase, current_phase),
    progress_count       = COALESCE(p_progress_count, progress_count),
    progress_total       = COALESCE(p_progress_total, progress_total),
    notes                = COALESCE(p_notes, notes),
    last_transition_date = CASE
      WHEN p_current_phase IS NOT NULL AND p_current_phase <> current_phase
        THEN CURRENT_DATE
      ELSE last_transition_date
    END,
    version              = version + 1
  WHERE id = 1 AND version = p_expected_version
  RETURNING * INTO v_new;

  v_phase_changed := (p_current_phase IS NOT NULL AND p_current_phase <> v_old.current_phase);
  v_progress_changed := (
    (p_progress_count IS NOT NULL AND p_progress_count <> v_old.progress_count) OR
    (p_progress_total IS NOT NULL AND p_progress_total <> v_old.progress_total)
  );

  IF v_phase_changed THEN
    INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
    VALUES ('phase_changed', 'phase', NULL,
            format('Phase: %s → %s', v_old.current_phase, v_new.current_phase), p_actor);
  ELSIF v_progress_changed THEN
    INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
    VALUES ('phase_progress_updated', 'phase', NULL,
            format('Phase progress: %s / %s', v_new.progress_count, v_new.progress_total), p_actor);
  END IF;

  RETURN to_jsonb(v_new);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_update_vac_phase_state(INT,TEXT,INT,INT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_vac_phase_state(INT,TEXT,INT,INT,TEXT,TEXT) TO service_role;

-- Build Tracker create functions (fn_create_phase/task/gate) deferred to
-- migration 022 — live-schema pre-flight found column mismatches vs spec.
-- Closes c257a081 moves to 022.

COMMIT;
