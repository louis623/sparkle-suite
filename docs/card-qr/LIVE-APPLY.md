# Cards & QR: Live apply checklist

**Status: waiting for Louis's OK. Nothing here has been applied to Live.**
All of it has been applied on Smoke (`pukemqiwlyqmyytxkdmo`), and the final migration was re-run there to prove it is idempotent.

## 0. Before you start

- Merge PR #75 only after Louis OKs this file.
- Take a Live database backup (Supabase dashboard -> Database -> Backups) or note the PITR timestamp.
- Run every file **once, in this order**, in the Live SQL editor (or `supabase db push` against Live). Each runs as one statement batch; stop at the first error.

## 1. Migrations, in order

| # | File | What it does |
|---|---|---|
| 1 | `20261005190000_ss_smoke_card_qr_profiles.sql` | `rep_card_qr_profiles`, `rep_card_print_orders`, RLS (rep reads own) |
| 2 | `20261009160000_ss_smoke_card_qr_icon.sql` | `qr_icon` column |
| 3 | `20261009190000_ss_smoke_card_qr_icon_marks.sql` | approved center marks set 1 |
| 4 | `20261009230000_ss_smoke_card_qr_business_card.sql` | card back options + text-to-link number |
| 5 | `20261011150000_ss_smoke_card_qr_social_platform.sql` | social platform choice |
| 6 | `20261011170000_ss_smoke_card_qr_flyer_text_link.sql` | text-to-link opt-ins |
| 7 | `20261011190000_ss_smoke_card_qr_icon_marks_v3.sql` | center marks set 3 |
| 8 | `20261011200000_ss_smoke_card_qr_icon_cowgirl_boot.sql` | cowgirl boot (33 marks) |
| 9 | `20261011220000_ss_smoke_card_qr_ship_address_proofs.sql` | `rep_card_ship_addresses` (RLS), proof columns, private `card-qr-proofs` bucket |
| 10 | `20261012000000_ss_smoke_card_qr_order_backend.sql` | order numbers `SS-CARD-000100+`, email columns, `card_order_ledger` (service role only) |
| 11 | `20261012010000_ss_card_qr_printer_approval.sql` | printer approval columns |
| 12 | `20261012020000_ss_card_qr_live.sql` | **go-live**: drops both `livemode = false` rules, adds email claim state and `card_qr_claim_email()`. Idempotent. |

The file names still say `ss_smoke` because Smoke already recorded them under those names; the headers now say they are for Live too.

## 2. Verification queries (run on Live after step 1)

Each should return the value shown.

```sql
-- a) No livemode=false rules left (expect 0 rows)
select conname from pg_constraint
where conname in ('rep_card_print_orders_livemode_check', 'card_order_ledger_livemode_check');

-- b) Tables exist with RLS on (expect 4 rows, all true)
select relname, relrowsecurity from pg_class
where relname in ('rep_card_qr_profiles', 'rep_card_print_orders', 'rep_card_ship_addresses', 'card_order_ledger')
order by relname;

-- c) Ledger is not readable by reps (expect 0 rows)
select grantee, privilege_type from information_schema.role_table_grants
where table_name = 'card_order_ledger' and grantee in ('anon', 'authenticated');

-- d) Proof bucket is private (expect one row: card-qr-proofs | false)
select id, public from storage.buckets where id = 'card-qr-proofs';

-- e) Order number default (expect it to start with ('SS-CARD-')
select column_default from information_schema.columns
where table_name = 'rep_card_print_orders' and column_name = 'order_number';

-- f) Claim function exists, service role only (expect: true, false, false)
select has_function_privilege('service_role', 'public.card_qr_claim_email(uuid,text)', 'execute') as service_role,
       has_function_privilege('authenticated', 'public.card_qr_claim_email(uuid,text)', 'execute') as authenticated,
       has_function_privilege('anon', 'public.card_qr_claim_email(uuid,text)', 'execute') as anon;

-- g) All 33 center marks allowed (expect a CHECK listing 'cowgirl-boot')
select pg_get_constraintdef(oid) from pg_constraint where conname = 'rep_card_qr_profiles_qr_icon_check';

-- h) New columns present (expect 13)
select count(*) from information_schema.columns
where table_name = 'rep_card_print_orders' and column_name in (
  'order_number', 'paid_via', 'fulfillment_email_sent_at', 'rep_email_sent_at', 'printer_approved_at',
  'printer_approved_by', 'printer_email_sent_at', 'approver_email_status', 'approver_email_claimed_at',
  'approver_email_attempts', 'printer_email_status', 'printer_email_claimed_at', 'proof_pdf_path');
```

## 3. Live env vars (Vercel, Live project, production)

Names only. Set before turning the flags on.

| Name | Value / note |
|---|---|
| `CARD_QR_ENABLED` | `true` (server gate) |
| `NEXT_PUBLIC_CARD_QR_ENABLED` | `true` (shows the tool; needs a redeploy) |
| `CARD_QR_STRIPE_LIVE` | `true` only when Louis is ready to take real money. Without it Live stays test-only. |
| `CARD_QR_APPROVAL_SECRET` | random, at least 32 characters (signs the 7-day approve link) |
| `CARD_QR_APPROVER_EMAIL` | optional; defaults to louis@neonrabbit.net |
| `CARD_QR_PRINTER_EMAIL` | leave **unset** until Louis says to email the printer |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | live keys; webhook endpoint must include `checkout.session.completed` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | `Sparkle Suite <notifications@yoursparklesuite.com>` |
| `NEXT_PUBLIC_APP_URL` | Live origin (used in the approve link) |
| `CRON_SECRET` | already used by other crons; the daily approval check needs it |

`SPARKLE_ENVIRONMENT` / `NEXT_PUBLIC_SPARKLE_ENVIRONMENT` must **not** be `smoke` on Live.

## 4. After deploy: smoke check on Live

1. As a test rep, the Cards & QR tool loads and the QR scans.
2. Before `CARD_QR_STRIPE_LIVE=true`: with a test key, place one order with card 4242 4242 4242 4242. Expect: order row `paid` once, one `card_order_ledger` row, an `APPROVAL NEEDED: SS-CARD-xxxxxx for Amelia` email to Louis with the proof PDF, and the rep confirmation. Nothing goes to the printer.
3. Open the approve link, click approve: with `CARD_QR_PRINTER_EMAIL` unset it records the approval and sends nothing.
4. `curl -H "Authorization: Bearer $CRON_SECRET" https://<live>/api/internal/card-qr/approver-emails` returns `{"ok":true,"checked":0,...}`.

## Rollback

The tool can be switched off at any time by removing `CARD_QR_ENABLED` / `NEXT_PUBLIC_CARD_QR_ENABLED` and redeploying. The schema changes are additive; there is no need to roll them back.
