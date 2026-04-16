-- ─── 011: open_items governance tracker ───────────────────────────────────────
-- Tracks gaps, legal blockers, grey-area decisions, and deferred research
-- across all Neon Rabbit projects. Service-role writes; anon reads.

BEGIN;

-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE open_item_category AS ENUM
    ('gap', 'legal', 'decision', 'research', 'grey_area', 'task');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE open_item_status AS ENUM
    ('open', 'deferred', 'in_progress', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE open_item_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.open_items (
  id              uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
  project         text                NOT NULL DEFAULT 'neon_rabbit',
  title           text                NOT NULL,
  description     text,
  category        open_item_category  NOT NULL,
  status          open_item_status    NOT NULL DEFAULT 'open',
  priority        open_item_priority  NOT NULL DEFAULT 'medium',
  blocking_phase  text,
  source_session  text,
  resolution      text,
  created_at      timestamptz         NOT NULL DEFAULT now(),
  updated_at      timestamptz         NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

-- updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_open_items_updated_at ON public.open_items;
CREATE TRIGGER trg_open_items_updated_at
  BEFORE UPDATE ON public.open_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_open_items_status   ON public.open_items(status);
CREATE INDEX IF NOT EXISTS idx_open_items_category ON public.open_items(category);
CREATE INDEX IF NOT EXISTS idx_open_items_blocking ON public.open_items(blocking_phase);
CREATE INDEX IF NOT EXISTS idx_open_items_project  ON public.open_items(project);

-- RLS
ALTER TABLE public.open_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_full_access_open_items ON public.open_items;
CREATE POLICY service_role_full_access_open_items
  ON public.open_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_read_open_items ON public.open_items;
CREATE POLICY anon_read_open_items
  ON public.open_items FOR SELECT TO anon
  USING (true);

-- Seed (guarded — runs only if table is empty)
INSERT INTO public.open_items (title, description, category, status, priority, blocking_phase)
SELECT * FROM (VALUES
  ('Gap 4 — DUCLUS lightbox photography kit standardization',
   'DUCLUS 12x12 lightbox arrived April 12. Louis testing with real BP jewelry. If pass: standardize as rep onboarding kit, bake cost into start fee, test USB webcam options. If fail: find alternative. Three-tier kit model: lightbox only / lightbox + USB webcam / fallback to phone camera. Does NOT block prototype.',
   'gap'::open_item_category, 'in_progress'::open_item_status, 'medium'::open_item_priority,
   'Phase 8 (onboarding pipeline)'),
  ('Gap 10 — BP community trade board examples',
   'Need working SS trade board to compare against. Revisit to see how BP''s own trade system differs and where SS adds value.',
   'research', 'deferred', 'low', 'After Phase 3'),
  ('Gap 12 — Lindsey revenue data',
   'Gap 11 (TAM) resolved — 20K-50K active BP reps, revenue model validated at 5-10% penetration. Revisit Lindsey''s actual numbers when pricing decisions happen.',
   'research', 'deferred', 'medium', 'Pre-launch pricing session'),
  ('Gap 13 — Business card pipeline',
   'Research sprint needed for vendor, design, pricing. Not blocking — add-on product. Also tracked on Pre-Launch Checklist as item #10.',
   'research', 'deferred', 'low', 'Post-launch'),
  ('Gap 14 — Thumper capability boundaries',
   'Test in context of real build. Will surface naturally during system prompt design session — what can Thumper do, what should it refuse, where are the edges?',
   'research', 'deferred', 'medium', 'Phase 1.2 (Thumper system prompt)'),
  ('Gap 19 — Infrastructure cost modeling',
   'Build first, model real numbers. Includes Vercel, Supabase, Claude API, Telnyx, Resend, Photoroom, PostHog. Estimate once real usage patterns are visible from prototype testing.',
   'research', 'deferred', 'medium', 'Pre-launch'),
  ('BP Policy Section 7.1 verification',
   'Pull actual BP rep agreement, confirm third-party tools are not prohibited. If prohibited, assess risk and mitigation. Owner: Louis. Pre-Launch Checklist item #3 — BLOCKING LAUNCH.',
   'legal', 'open', 'high', 'Pre-launch'),
  ('Attorney session (8-item agenda)',
   '8 agenda items accumulated across SS planning sessions (see SS_Master_Build_Plan_v2.0 Legal Foundation section). Schedule when revenue supports. Need service agreement + disclaimers before taking money. Pre-Launch Checklist item #2 — BLOCKING LAUNCH.',
   'legal', 'open', 'high', 'Pre-launch'),
  ('A2P 10DLC registration (TCR)',
   'Carriers block unregistered SMS. Required before any SMS automation goes live. Owner: Louis. Pre-Launch Checklist item #1 — BLOCKING LAUNCH.',
   'legal', 'open', 'high', 'Pre-launch (before SMS launch)'),
  ('Platform subscription pricing',
   'Monthly/quarterly/annual amounts. Louis decision session needed. Informed by Gap 11 TAM data and Gap 5 cost modeling. Pre-Launch Checklist item #4 — BLOCKING LAUNCH.',
   'grey_area', 'open', 'high', 'Pre-launch + Phase 0.4 (Stripe configuration)'),
  ('Start fee amount',
   'Louis decision session needed. Affects Gate 2 amount in Phase 8 onboarding flow. Pre-Launch Checklist item #5 — BLOCKING LAUNCH.',
   'grey_area', 'open', 'high', 'Pre-launch + Phase 8 (Gate 2 in onboarding)'),
  ('Launch fee amount',
   'Louis decision session needed. Affects Gate 3 amount in Phase 8 onboarding flow. Pre-Launch Checklist item #6 — BLOCKING LAUNCH.',
   'grey_area', 'open', 'high', 'Pre-launch + Phase 8 (Gate 3 in onboarding)'),
  ('Photography kit pricing tiers',
   'Lightbox-only vs lightbox+camera impact on start fee. Needs DUCLUS test results first (Gap 4). Three-tier kit model decision pending.',
   'grey_area', 'open', 'medium', 'Phase 8 (onboarding) + Pre-launch pricing decision'),
  ('SMS wallet auto-recharge threshold',
   'Default set to $5.00, adjustable per rep. Confirm or adjust based on real usage data from prototype testing.',
   'grey_area', 'open', 'low', NULL),
  ('Branding menu design',
   'What template/color/hero options reps select from during onboarding. Design session item.',
   'grey_area', 'open', 'medium', 'Phase 8.20 (branding menu in onboarding)')
) AS seed(title, description, category, status, priority, blocking_phase)
WHERE NOT EXISTS (SELECT 1 FROM public.open_items LIMIT 1);

COMMIT;
