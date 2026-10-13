-- Cards & QR: Louis approves each paid order before anything reaches the printer (2026-10-11).
-- fulfillment_email_* columns now record the APPROVAL NEEDED email to Louis.
ALTER TABLE public.rep_card_print_orders
  ADD COLUMN IF NOT EXISTS printer_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS printer_approved_by text,
  ADD COLUMN IF NOT EXISTS printer_approval_meta jsonb,
  ADD COLUMN IF NOT EXISTS printer_email_to text,
  ADD COLUMN IF NOT EXISTS printer_email_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS printer_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS printer_email_id text,
  ADD COLUMN IF NOT EXISTS printer_email_error text;

-- Live orders are allowed once CARD_QR_STRIPE_LIVE=true on Live; the app decides, not the table.
ALTER TABLE public.card_order_ledger DROP CONSTRAINT IF EXISTS card_order_ledger_livemode_check;

NOTIFY pgrst, 'reload schema';
