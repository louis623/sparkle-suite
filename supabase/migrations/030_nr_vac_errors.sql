-- ─── 030: VAC errors table + seed ────────────────────────────────────────
-- Adds vac_errors: documented duty-to-assist failures, ignored evidence,
-- diagnostic contradictions, and procedural defects in VA's handling of
-- Louis Chapman's claims. Surfaced on the VA Errors page of the
-- vac-case-reference site.
--
-- RLS pattern matches the rest of the VAC schema (migrations 021/025):
-- one `authenticated` SELECT policy. service_role bypasses RLS by default
-- in Postgres; no explicit policy needed for it. MCP write functions
-- (fn_create_vac_error / fn_update_vac_error) are deferred to a future
-- phase — Phase 0 only seeds the 8 known errors.
--
-- update_updated_at_column() was created in migration 011 — reused here.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- TABLE: vac_errors
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.vac_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES public.vac_conditions(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL CHECK (error_type IN (
    'duty_to_assist',
    'c_and_p_failure',
    'evidence_ignored',
    'diagnostic_contradiction',
    'procedural',
    'records_gap'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_ref TEXT,
  impact TEXT,
  legal_basis TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vac_errors_condition_id_idx
  ON public.vac_errors (condition_id) WHERE condition_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS vac_errors_severity_created_at_idx
  ON public.vac_errors (severity, created_at DESC);

DROP TRIGGER IF EXISTS trg_vac_errors_updated_at ON public.vac_errors;
CREATE TRIGGER trg_vac_errors_updated_at
  BEFORE UPDATE ON public.vac_errors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════
-- RLS — authenticated SELECT only (matches migration 021 pattern)
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.vac_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vac_errors_auth_read ON public.vac_errors;
CREATE POLICY vac_errors_auth_read ON public.vac_errors
  FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════
-- SEED — 8 known errors as of 2026-04-28
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO public.vac_errors
  (condition_id, error_type, title, description, evidence_ref, impact, legal_basis, severity)
VALUES
  ('9434d07b-256c-468d-b08f-be61ccfef70b',
   'evidence_ignored',
   'C&P Examiner Found No Hypertension Despite 7 Sources',
   'November 2025 C&P examiner concluded "no diagnosis of hypertension" despite 7 separate clinical sources documenting HTN across multiple providers and settings from 2017-2021, including VA''s own prescriptions (amlodipine, metoprolol "FOR BLOOD PRESSURE"), Boulder Heart formal ICD coding, and consistent elevated BP readings (up to 164/102).',
   'Sources: Mykoniatis amlodipine Rx 11/22/2017, Dalton BCH discharge Feb 2018, Iyengar/Oza Boulder Heart HTN ICD May 2018+, Marana metoprolol 3/4/2021, VA problem list 3/3/2021, Mayo problem list 5/24/2021, elevated BPs across all settings',
   'Hypertension denial sustained despite overwhelming clinical evidence. VA examiner effectively overrode 7 treating providers. This is the strongest PACT Act presumptive claim in the portfolio.',
   '38 CFR 4.104; PACT Act presumptive conditions list for Gulf War veterans',
   'critical'),

  ('86c0fd55-a136-4d6e-9368-83e0b9afd97a',
   'duty_to_assist',
   'PCL-5 PTSD Screening Planned But Never Administered',
   'VA Staff Psychologist Dr. Roffman (3/24/2021) formally diagnosed "Unspecified Trauma-Stressor Related DO, R/O PTSD," documented multiple Criterion A events from Iraq combat, and explicitly planned to administer PCL-5 via MyHealtheVet. The screening was never completed. Four VA providers documented combat/MH symptoms between 2020-2021 with zero completed PCL-5 administrations.',
   'Source: 82c662a6 (Roffman consult 3/24/2021, line 6804 — planned PCL-5). Also: Georgia 2020, Danborn 2020, Lendvay 2021 documented combat symptoms without PCL-5.',
   'PTSD cannot be properly evaluated without a PCL-5. VA''s own psychologist identified the need, planned the screening, and it was never followed through. This is a textbook duty-to-assist failure.',
   '38 CFR 3.159(c)(4) — duty to provide medical examination; 38 USC 5103A',
   'critical'),

  ('86c0fd55-a136-4d6e-9368-83e0b9afd97a',
   'c_and_p_failure',
   'PC-PTSD-5 Gateway Question — Non-Disclosure Pattern',
   'Marana PCP intake 3/4/2021: PC-PTSD-5 score 0 — Louis answered NO to gateway question about experiencing traumatic events. This is the same systematic non-disclosure pattern documented across his entire Guard period (2009-2015) on every PHQ-2 screening. Military stigma against reporting MH symptoms is clinically well-documented. Non-disclosure does not equal absence of symptoms.',
   'Source: 82c662a6 (Marana PCP intake). Pattern: every PHQ-2 in STR box (source dc2abcb7) answered NO. MEPS: all NO. Post-Iraq review Oct 2004: NO problems.',
   'VA relied on a single-question gateway screening with known sensitivity limitations in military populations to screen out a combat veteran with documented trauma symptoms from multiple other providers.',
   '38 CFR 3.304(f) — PTSD stressor corroboration; M21-1, Part III, Subpart iv, Chapter 4',
   'high'),

  ('44c9c7f9-0b40-4d69-a855-7e556fcefb2f',
   'duty_to_assist',
   'No C&P Exam Ordered for AFib on Original Claim',
   'Original claim rating decision 7/23/2020 denied atrial fibrillation. VA conceded current diagnosis but found no in-service event. NO C&P examination was ordered for AFib despite documented onset 12/11/2013 during Guard service at Golden VA with EKG-confirmed AFib with RVR at 130 BPM.',
   'Source: 8f631117 (rating decision 7/23/2020). AFib onset documentation: Golden VA 12/11/2013 (source 0cbfe5a5).',
   'VA denied without examining the veteran despite evidence of in-service onset. A C&P exam would have required the examiner to address the documented EKG findings during Guard service.',
   '38 CFR 3.159(c)(4) — duty to provide examination when evidence indicates condition may be associated with service',
   'critical'),

  ('81ed92b1-b46c-452a-8f81-81bfab2355ad',
   'duty_to_assist',
   'No C&P Exam Ordered for Back on Original Claim',
   'Original claim rating decision 7/23/2020 denied low back condition. VA conceded current diagnosis but found no in-service event. NO C&P examination was ordered despite VA''s own 2010 problem list entry for "Chronic low back pain" and 2013 Guard duty excuse letter explicitly referencing body armor.',
   'Source: 8f631117 (rating decision 7/23/2020). VA chronic back documentation: Hassett 7/2/2010 (source a5787c6b). Priest body armor letter 5/2/2013 (source 0cbfe5a5).',
   'VA denied without examination despite its own records showing chronic back pain during Guard service and a VA provider connecting the condition to body armor. VA''s evidence contradicted its own denial.',
   '38 CFR 3.159(c)(4); McLendon v. Nicholson, 20 Vet. App. 79 (2006)',
   'critical'),

  ('4a62780b-e39d-4522-ba23-27416cb689b0',
   'diagnostic_contradiction',
   'VA Diagnosed Psoriasis Then Denied Service Connection',
   'VA diagnosed guttate psoriasis in its own clinical records, then denied service connection for the condition citing insufficient evidence linking it to deployments. VA cannot credibly argue the condition does not exist or is not established when VA''s own clinicians diagnosed it.',
   'VA clinical records documenting psoriasis diagnosis. McMullan nexus: "more likely than not related to military service, specifically burn pit exposures." TERA conceded 4/9/2026. Burn Pit Registry enrolled.',
   'Creates a logical contradiction in VA''s position: VA acknowledges the diagnosis (their own providers made it) but denies the service connection despite conceding toxic exposure and burn pit registry enrollment.',
   'PACT Act Section 3109; 38 USC 1116(a) — presumptive service connection',
   'critical'),

  ('12bd76fc-72b3-494b-93b4-45724ea6adf5',
   'records_gap',
   'VAMC Denver Records Gap 2004-2006 — VA Acknowledged',
   'VA''s own letter (2/24/2020, ref 308/TER) formally documents that NO medical treatment records exist at VAMC Denver for Louis from 1/1/2004 through 3/12/2006. This gap covers the immediate post-Iraq deployment period — the most critical window for documenting post-deployment mental health onset. VA cannot argue "no evidence of post-deployment MH issues" when they themselves lost the records.',
   'Source: bb56d880 (VA Records Unavailability letter 2/24/2020).',
   'Strengthens benefit-of-the-doubt argument under 38 USC 5107(b). When records are missing through no fault of the veteran, VA is supposed to apply heightened duty to assist. This is the third procedural failure in the GAD case alongside Golden VA dismissal and PCL-5 non-administration.',
   '38 USC 5107(b) — benefit of the doubt; 38 CFR 3.102; O''Hare v. Derwinski, 1 Vet. App. 365 (1991)',
   'high'),

  ('12bd76fc-72b3-494b-93b4-45724ea6adf5',
   'evidence_ignored',
   'Golden VA Records Dismissed as "Not Relevant"',
   'VA stated that records from Golden VA Clinic "submitted in connection with the current claim does not constitute relevant evidence" in the GAD denial. While the specific Golden VA records (2009-2018 ROI) do not show GAD treatment or sertraline prescriptions, VA used this narrow finding as a blanket dismissal rather than considering the full evidentiary picture including Mayo GAD diagnosis, McMullan nexus, and documented 23-year mental health progression across 8+ providers.',
   'Source: GAD denial letter 4/9/2026. Golden VA records: source 82c662a6 (227-page 2018 ROI). Counter-evidence: Mayo Jan 2026 GAD dx, McMullan nexus, Roffman Anxiety DO dx, personal/spouse/buddy statements.',
   'VA used a narrow accurate finding (Golden VA records lack GAD treatment) to broadly dismiss the claim without weighing the totality of evidence. The denial does not address McMullan''s independent medical opinion, Mayo''s "for VA purposes" diagnosis, or Roffman''s Anxiety DO diagnosis at Jacksonville VA.',
   '38 CFR 3.303(a) — evidence evaluation; Nieves-Rodriguez v. Peake, 22 Vet. App. 295 (2008)',
   'high');

-- Provenance log
INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
VALUES (
  'note', NULL, NULL,
  'vac_errors table created via migration 030; seeded with 8 known errors (5 critical, 3 high) as of 2026-04-28. Surfaced on the VA Errors page of vac-case-reference. RLS: authenticated SELECT only; writes deferred to future fn_* functions.',
  'migration'
);

COMMIT;
