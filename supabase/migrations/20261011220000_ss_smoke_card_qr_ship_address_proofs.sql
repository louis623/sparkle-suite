-- Smoke-only: saved card shipping address + approved proof snapshots on pending orders (2026-10-11).
-- Applied to Smoke (pukemqiwlyqmyytxkdmo) only. Not for Live.

CREATE TABLE IF NOT EXISTS public.rep_card_ship_addresses (
  rep_id uuid PRIMARY KEY REFERENCES public.reps(id) ON DELETE CASCADE,
  name text NOT NULL,
  street1 text NOT NULL,
  street2 text NOT NULL DEFAULT '',
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  phone text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_card_ship_addresses_state_check CHECK (state ~ '^[A-Z]{2}$'),
  CONSTRAINT rep_card_ship_addresses_zip_check CHECK (zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
  CONSTRAINT rep_card_ship_addresses_name_check CHECK (length(name) BETWEEN 2 AND 80),
  CONSTRAINT rep_card_ship_addresses_street_check CHECK (length(street1) BETWEEN 3 AND 100)
);

ALTER TABLE public.rep_card_ship_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rep_card_ship_addresses FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.rep_card_ship_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rep_card_ship_addresses TO service_role;

DROP POLICY IF EXISTS rep_card_ship_addresses_own ON public.rep_card_ship_addresses;
CREATE POLICY rep_card_ship_addresses_own ON public.rep_card_ship_addresses
  FOR ALL
  TO authenticated
  USING (rep_id = (SELECT id FROM public.reps WHERE auth_user_id = auth.uid()))
  WITH CHECK (rep_id = (SELECT id FROM public.reps WHERE auth_user_id = auth.uid()));

-- Approved proof snapshot, written by the server (service role) when checkout starts.
ALTER TABLE public.rep_card_print_orders
  ADD COLUMN IF NOT EXISTS ship_address jsonb,
  ADD COLUMN IF NOT EXISTS proof_pdf_path text,
  ADD COLUMN IF NOT EXISTS proof_front_path text,
  ADD COLUMN IF NOT EXISTS proof_back_path text,
  ADD COLUMN IF NOT EXISTS proof_pdf_sha256 text,
  ADD COLUMN IF NOT EXISTS design_theme text,
  ADD COLUMN IF NOT EXISTS details_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_scan_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_approved_at timestamptz;

-- Private bucket; no storage.objects policies, so only the service role can read or write.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('card-qr-proofs', 'card-qr-proofs', false, 20971520, ARRAY['application/pdf', 'image/png'])
ON CONFLICT (id) DO UPDATE SET public = false;

NOTIFY pgrst, 'reload schema';
