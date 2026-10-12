-- Cards & QR: go-live consolidation (2026-10-11). Idempotent: safe to re-run, safe on Smoke and Live.
-- Apply AFTER the ten earlier card_qr migrations (see docs/card-qr/LIVE-APPLY.md).

-- 1) Live orders: drop every test-only livemode rule. The app decides via CARD_QR_STRIPE_LIVE.
ALTER TABLE public.rep_card_print_orders DROP CONSTRAINT IF EXISTS rep_card_print_orders_livemode_check;
ALTER TABLE IF EXISTS public.card_order_ledger DROP CONSTRAINT IF EXISTS card_order_ledger_livemode_check;

-- 2) Email send state with claims (approver = Louis's APPROVAL NEEDED email; printer = after approval).
ALTER TABLE public.rep_card_print_orders
  ADD COLUMN IF NOT EXISTS approver_email_status text,
  ADD COLUMN IF NOT EXISTS approver_email_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approver_email_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS printer_email_status text,
  ADD COLUMN IF NOT EXISTS printer_email_claimed_at timestamptz;

ALTER TABLE public.rep_card_print_orders DROP CONSTRAINT IF EXISTS rep_card_print_orders_approver_email_status_check;
ALTER TABLE public.rep_card_print_orders
  ADD CONSTRAINT rep_card_print_orders_approver_email_status_check
  CHECK (approver_email_status IS NULL OR approver_email_status IN ('claimed', 'sent', 'failed'));
ALTER TABLE public.rep_card_print_orders DROP CONSTRAINT IF EXISTS rep_card_print_orders_printer_email_status_check;
ALTER TABLE public.rep_card_print_orders
  ADD CONSTRAINT rep_card_print_orders_printer_email_status_check
  CHECK (printer_email_status IS NULL OR printer_email_status IN ('claimed', 'sent', 'failed'));

-- Backfill states for rows that already sent.
UPDATE public.rep_card_print_orders SET approver_email_status = 'sent'
  WHERE fulfillment_email_sent_at IS NOT NULL AND approver_email_status IS DISTINCT FROM 'sent';
UPDATE public.rep_card_print_orders SET printer_email_status = 'sent'
  WHERE printer_email_sent_at IS NOT NULL AND printer_email_status IS DISTINCT FROM 'sent';

CREATE INDEX IF NOT EXISTS rep_card_print_orders_approver_unsent_idx
  ON public.rep_card_print_orders (paid_at)
  WHERE status IN ('paid', 'received') AND fulfillment_email_sent_at IS NULL;

-- 3) Atomic claim. True means this caller owns the send. A claim older than 15 minutes is stale
--    (crash or unknown outcome) and can be taken again; 'failed' is a confirmed failure and retryable.
CREATE OR REPLACE FUNCTION public.card_qr_claim_email(p_order_id uuid, p_kind text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF p_kind = 'approver' THEN
    UPDATE public.rep_card_print_orders
       SET approver_email_status = 'claimed', approver_email_claimed_at = now(),
           approver_email_attempts = approver_email_attempts + 1
     WHERE id = p_order_id
       AND status IN ('paid', 'received')
       AND fulfillment_email_sent_at IS NULL
       AND (approver_email_status IS NULL OR approver_email_status = 'failed'
            OR (approver_email_status = 'claimed' AND approver_email_claimed_at < now() - interval '15 minutes'));
  ELSIF p_kind = 'printer' THEN
    UPDATE public.rep_card_print_orders
       SET printer_email_status = 'claimed', printer_email_claimed_at = now()
     WHERE id = p_order_id
       AND status IN ('paid', 'received')
       AND printer_approved_at IS NOT NULL
       AND printer_email_sent_at IS NULL
       AND (printer_email_status IS NULL OR printer_email_status = 'failed'
            OR (printer_email_status = 'claimed' AND printer_email_claimed_at < now() - interval '15 minutes'));
  ELSE
    RAISE EXCEPTION 'card_qr_claim_email: unknown kind %', p_kind;
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.card_qr_claim_email(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.card_qr_claim_email(uuid, text) TO service_role;

NOTIFY pgrst, 'reload schema';
