-- Smoke-only: business card order backend (2026-10-11). Test mode only.
-- Applied to Smoke (pukemqiwlyqmyytxkdmo) only. Not for Live.

-- Human order numbers: SS-CARD-000123.
CREATE SEQUENCE IF NOT EXISTS public.rep_card_order_number_seq START 100;
GRANT USAGE ON SEQUENCE public.rep_card_order_number_seq TO service_role;

-- The pending row is now created before the Stripe session, so the session id comes later.
ALTER TABLE public.rep_card_print_orders
  ALTER COLUMN stripe_checkout_session_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS paid_via text,
  ADD COLUMN IF NOT EXISTS fulfillment_email_to text,
  ADD COLUMN IF NOT EXISTS fulfillment_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfillment_email_error text,
  ADD COLUMN IF NOT EXISTS rep_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS rep_email_error text;

ALTER TABLE public.rep_card_print_orders
  ALTER COLUMN order_number SET DEFAULT ('SS-CARD-' || lpad(nextval('public.rep_card_order_number_seq')::text, 6, '0'));
UPDATE public.rep_card_print_orders SET order_number = DEFAULT WHERE order_number IS NULL;
ALTER TABLE public.rep_card_print_orders ALTER COLUMN order_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rep_card_print_orders_order_number_key ON public.rep_card_print_orders (order_number);

ALTER TABLE public.rep_card_print_orders DROP CONSTRAINT IF EXISTS rep_card_print_orders_paid_via_check;
ALTER TABLE public.rep_card_print_orders
  ADD CONSTRAINT rep_card_print_orders_paid_via_check CHECK (paid_via IS NULL OR paid_via IN ('webhook', 'success_page'));
ALTER TABLE public.rep_card_print_orders DROP CONSTRAINT IF EXISTS rep_card_print_orders_status_check;
ALTER TABLE public.rep_card_print_orders
  ADD CONSTRAINT rep_card_print_orders_status_check CHECK (status IN ('pending', 'paid', 'received', 'checkout_failed'));

-- Cheese's card-order ledger. Money facts only: no card, bank or address data.
CREATE TABLE IF NOT EXISTS public.card_order_ledger (
  order_id uuid PRIMARY KEY REFERENCES public.rep_card_print_orders(id) ON DELETE RESTRICT,
  order_number text NOT NULL UNIQUE,
  rep_id uuid NOT NULL REFERENCES public.reps(id) ON DELETE RESTRICT,
  paid_at timestamptz NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  quantity integer NOT NULL,
  livemode boolean NOT NULL,
  stripe_checkout_session_id text NOT NULL,
  stripe_payment_intent_id text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT card_order_ledger_livemode_check CHECK (livemode = false)
);
ALTER TABLE public.card_order_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.card_order_ledger FROM anon, authenticated;
GRANT SELECT, INSERT ON public.card_order_ledger TO service_role;

NOTIFY pgrst, 'reload schema';
