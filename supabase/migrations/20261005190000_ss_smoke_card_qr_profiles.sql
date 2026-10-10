-- Smoke-only Cards & QR profile and print-order ledger.
-- Apply on the Suite Smoke database (pukemqiwlyqmyytxkdmo) when playtesting.
-- Do not apply on live until Louis green-lights the live tool.

CREATE TABLE IF NOT EXISTS public.rep_card_qr_profiles (
  rep_id uuid PRIMARY KEY REFERENCES public.reps(id) ON DELETE CASCADE,
  destination_url text NOT NULL,
  template_id text NOT NULL,
  show_name boolean NOT NULL DEFAULT true,
  show_email boolean NOT NULL DEFAULT true,
  show_qr boolean NOT NULL DEFAULT true,
  show_discount boolean NOT NULL DEFAULT false,
  discount_code text NOT NULL DEFAULT '',
  show_social boolean NOT NULL DEFAULT true,
  appearance_preset text NOT NULL DEFAULT 'sparkle_suite_morganite',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rep_card_qr_profiles_template_check
    CHECK (template_id IN ('match-site', 'halloween', 'classic-ivory')),
  CONSTRAINT rep_card_qr_profiles_destination_check
    CHECK (destination_url ~ '^https?://')
);

CREATE TABLE IF NOT EXISTS public.rep_card_print_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL REFERENCES public.reps(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  livemode boolean NOT NULL DEFAULT false,
  destination_url text NOT NULL,
  design_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  fulfillment_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT rep_card_print_orders_quantity_check
    CHECK (quantity IN (500, 1000)),
  CONSTRAINT rep_card_print_orders_amount_check
    CHECK (
      (quantity = 500 AND amount_cents = 10000)
      OR (quantity = 1000 AND amount_cents = 12000)
    ),
  CONSTRAINT rep_card_print_orders_livemode_check
    CHECK (livemode = false),
  CONSTRAINT rep_card_print_orders_status_check
    CHECK (status IN ('pending', 'paid', 'received'))
);

ALTER TABLE public.rep_card_qr_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_card_print_orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.rep_card_qr_profiles TO authenticated;
GRANT SELECT ON public.rep_card_print_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rep_card_qr_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.rep_card_print_orders TO service_role;

DROP POLICY IF EXISTS rep_card_qr_profiles_own ON public.rep_card_qr_profiles;
CREATE POLICY rep_card_qr_profiles_own ON public.rep_card_qr_profiles
  FOR ALL
  TO authenticated
  USING (rep_id = (SELECT id FROM public.reps WHERE auth_user_id = auth.uid()))
  WITH CHECK (rep_id = (SELECT id FROM public.reps WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS rep_card_print_orders_own_read ON public.rep_card_print_orders;
CREATE POLICY rep_card_print_orders_own_read ON public.rep_card_print_orders
  FOR SELECT
  TO authenticated
  USING (rep_id = (SELECT id FROM public.reps WHERE auth_user_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
