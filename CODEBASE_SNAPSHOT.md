# Codebase Snapshot — Neon Rabbit Core
_Generated: 2026-04-16_

## Project
**Neon Rabbit Core** — the umbrella repo (formerly `sparkle-suite`) housing every codebase under the Neon Rabbit brand: the **Sparkle Suite** rep-facing platform, the **NR HQ** internal build tracker, the **Open Brain** semantic memory store, and the **Live Queue** Chrome extension. Built on Next.js 16 + React 19, Supabase (Postgres + Edge Functions), Stripe billing, and Telegram Bot integration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2.1, React 19.2.4, Tailwind CSS 4, TypeScript 5 |
| Chrome Extension | Manifest V3, vanilla JS, chrome.storage + chrome.alarms APIs |
| Backend / DB | Supabase (Postgres, pgvector, pgmq, pg_net, pg_cron) |
| Payments | Stripe (v22, dahlia API), subscription billing, SMS wallet loads, auto-recharge, webhooks, customer portal |
| Auth | Supabase Auth (email/password), @supabase/ssr for SSR cookie handling |
| Edge Functions | Deno + Hono (MCP) or plain Deno.serve |
| AI / Embeddings | OpenRouter API (openai/text-embedding-3-small) |
| Messaging | Telegram Bot API (node-telegram-bot-api) |
| Validation | Zod 4 |
| Deployment | Supabase Cloud (us-east-1, ref: bqhzfkgkjyuhlsozpylf) |

---

## Directory Tree

```
neon-rabbit-core/
├── app/
│   ├── api/
│   │   ├── open-brain/context/route.ts
│   │   ├── stripe/
│   │   │   ├── create-checkout/route.ts
│   │   │   ├── create-portal-session/route.ts
│   │   │   ├── subscription-status/route.ts
│   │   │   ├── sync/route.ts
│   │   │   ├── wallet/
│   │   │   │   ├── auto-recharge/route.ts     ← update auto-recharge settings
│   │   │   │   └── load/route.ts              ← create checkout session for wallet load
│   │   │   └── webhook/route.ts
│   │   └── telegram/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── chrome-extension/
│   ├── background.js
│   ├── content.js
│   ├── manifest.json
│   ├── popup.css
│   ├── popup.js
│   └── icons/
├── lib/
│   ├── services/
│   │   └── wallet.ts             ← ensureWallet, deductSmsCharge, auto-recharge trigger
│   ├── stripe/
│   │   ├── config.ts             ← Zod env validation, lazy-loaded
│   │   ├── client.ts             ← Stripe instance (v22 dahlia API)
│   │   ├── customers.ts          ← create/getOrCreate Stripe customer
│   │   └── refunds.ts            ← pro-rata refund calculation + state machine
│   ├── supabase.ts               ← re-exports from supabase/client.ts
│   ├── supabase/
│   │   ├── auth.ts               ← getAuthenticatedRep() for API route auth
│   │   ├── client.ts             ← browser client (@supabase/ssr)
│   │   ├── server.ts             ← server client (cookie-aware)
│   │   └── admin.ts              ← service role client (bypasses RLS)
│   └── telegram-bot.ts
├── scripts/
│   └── seed-test-rep.ts          ← idempotent test rep seeder (cents-aware)
├── supabase/
│   ├── config.toml
│   ├── README.md
│   ├── functions/
│   │   ├── daily-financial-sync/index.ts
│   │   ├── embed/index.ts
│   │   ├── live-queue-sync/index.ts
│   │   ├── nr-hq-mcp/index.ts          ← NR HQ build tracker MCP (5 reads + 12 writes)
│   │   ├── open-brain-mcp/index.ts
│   │   ├── open-brain-mcp-march/index.ts
│   │   └── open-brain-status-updater/index.ts
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_open_brain_embedding_pipeline.sql
│       ├── 003_neon_rabbit_hq.sql
│       ├── 004_march_open_brain.sql
│       ├── 005_live_queue.sql
│       ├── 006_sparkle_suite_schema.sql
│       ├── 007_fix_reps_admin_rls_recursion.sql
│       ├── 008_stripe_billing.sql
│       └── 009_sms_wallet_cents.sql    ← SMS wallet cents conversion + auto-recharge lock
├── vault/                         ← project docs/notes
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
├── README.md
├── SS_Service_Layer_Spec_v1_0.md
├── SS_Supabase_Schema_v1_0.md
└── CODEBASE_SNAPSHOT.md
```

---

## Dependencies

```json
{
  "@supabase/supabase-js": "^2.100.1",
  "@supabase/ssr": "^0.10.2",
  "next": "16.2.1",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "node-telegram-bot-api": "^0.67.0",
  "stripe": "^22.0.1",
  "zod": "^4.3.6"
}
```

Dev: TypeScript 5, Tailwind CSS 4, ESLint 9, tsx, dotenv

---

## Auth Architecture (Phase 0.3)

- **Provider:** Supabase Auth — email/password only (no social, no magic link yet)
- **Self-registration:** Disabled. Louis creates rep accounts via admin API during onboarding.
- **Auth users:**
  - `louis@neonrabbit.net` — admin (full cross-rep visibility via RLS)
  - `testrep@neonrabbit.net` — development sandbox rep account
- **Link to data:** `reps.auth_user_id` references `auth.users(id)`
- **Client utilities:**
  - `lib/supabase/client.ts` — browser client (createBrowserClient from @supabase/ssr)
  - `lib/supabase/server.ts` — server client (createServerClient with cookie handling)
  - `lib/supabase/admin.ts` — service role client (bypasses RLS, for admin operations)

---

## Database Schema

### `open_brain`
Semantic memory store for Louis's AI brain.
- `id`, `content TEXT`, `embedding halfvec(1536)`, `source TEXT`, `tags TEXT[]`, `metadata JSONB`, `created_at`
- HNSW index on embedding
- RPC: `match_open_brain(query_embedding, match_threshold, match_count)`

### `clients` (original)
CRM-style client records.
- `id`, `name`, `email`, `phone`, `platform`, `tier`, `status`, `monthly_rate`, `setup_fee`, `site_url`, `notes`, `created_at`

### `pipeline_status`
Client pipeline stage tracking.

### `builds`
Client build tracking with checklists.

### `payments`
Payment records (Stripe integration placeholder).

### `projects` (neon_rabbit_hq)
Business project management.
- `id`, `name`, `tier` (1–4), `status`, `scope`, `tool`, `next_action`, `category`, `history JSONB`, `clients JSONB`, `milestones JSONB`, `user_id`

### `financial_snapshots`
Monthly financial health snapshots.
- `id`, `mrr`, `revenue`, `expenses`, `net`, `runway_months`, `personal_balance`, `business_balance`, `recorded_at`, `user_id`

### `expenses`
Recurring expenses tracker.
- `id`, `name`, `amount`, `category`, `billing_cycle`, `active`, `user_id`

### `clients` (neon_rabbit_hq schema)
Full CRM with launch tracking.
- `id`, `name`, `site_name`, `site_url`, `status`, `tier`, `mrr`, `launched_at`, `notes`, `user_id`

### `queue_items`
Todo/task queue with priority and due dates.

### `ideas`
Captured ideas/notes.

### `maintenance_items`
Recurring maintenance tasks with `next_due`.

### `pa_items`
Personal assistant items.

### `thoughts_march`
Isolated Open Brain instance for user March.
- `id`, `content`, `embedding vector(1536)`, `type`, `topics TEXT[]`, `people TEXT[]`, `action_items TEXT[]`, `metadata JSONB`
- RPCs: `match_thoughts_march()`, `upsert_thought_march()`

### `live_queue`
Live sales queue sync table — Chrome extension writes, website reads via Realtime.
- `id UUID PK`, `rep_id UUID`, `sync_code TEXT UNIQUE`, `queue JSONB DEFAULT '[]'`, `last_updated TIMESTAMPTZ`, `created_at TIMESTAMPTZ`
- Index: `idx_live_queue_sync_code`
- RLS: Public SELECT (anyone can read), writes via service role only
- Realtime: enabled via `supabase_realtime` publication

**Seeded reps (live_queue):**
| Rep | Client | Sync Code |
|-----|--------|-----------|
| Lindsey | Mile High Fizz | MHF-7342 |
| Brittany | BrittwithBling | BWB-5819 |
| Bri | Bri's Glowtique | BGL-2463 |
| Heather | The Bling Kitchen | TBK-9157 |
| Kara | Sprinkled in Diamonds | SID-6284 |

### Sparkle Suite Tables (16 tables — migration 006)

**Core:**
- `reps` — central table, linked to auth.users. Columns: display_name, business_name, email, phone, custom_domain, template_id, shop_link, streaming_links (JSONB), social_handles (JSONB), profile_photo_url, camera_source, status (rep_status enum)
- `collections` — Bomb Party jewelry collections (shared across all reps). Columns: name (UNIQUE)
- `jewelry_designs` — proprietary BP jewelry database. Columns: item_number (UNIQUE), design_name, collection_id (FK), material, main_stone, bp_msrp, canonical_photo_url, special_features, length_info, type_prefix (jewelry_type enum), times_traded, times_listed

**Trade Board:**
- `trade_listings` — individual listings on a rep's board. Columns: rep_id (FK), design_id (FK), listing_photo_url, uses_canonical_photo, trade_preferences, rep_notes, status (listing_status enum), removal_reason, listed_at
- `trade_requests` — customer-submitted trade requests. Columns: listing_id (FK), customer_name, customer_description, status (trade_request_status enum), rejection_reason, rep_notes
- `trade_fulfillment` — post-approval pipeline (approved → shipped → completed). Columns: request_id (FK UNIQUE), fulfillment_status, shipping_notes, received_listing_id (FK), status_updated_at, completed_at

**Rep Operations:**
- `calendar_events` — show schedule. Columns: rep_id (FK), platform, event_time, duration_minutes, discount_code, discount_description, description, is_recurring, recurrence_rule, status (event_status enum)
- `customer_audience` — TCPA/CAN-SPAM compliant subscriber list. Columns: rep_id (FK), name, phone, email, sms_consent, email_consent, marketing_consent, consent_date, sms_opted_out_at, email_opted_out_at, stop_keyword_received_at
- `sms_wallet` — pre-loaded SMS balance (cents, $25 min load). Columns (post-009): `balance_cents INTEGER`, `auto_recharge_enabled BOOLEAN`, `auto_recharge_threshold_cents INTEGER`, `auto_recharge_amount_cents INTEGER`, `minimum_load_amount_cents INTEGER`, `auto_recharge_pending BOOLEAN`, `auto_recharge_attempt_id UUID`, `last_loaded_at`. Constraints: nonneg balance, threshold; amount ≥ 100¢; min_load ≥ 100¢; amount > threshold.
- `wallet_transactions` — wallet load/charge log. Columns (post-009): `wallet_id` (FK), `type` (wallet_transaction_type enum), `amount_cents INTEGER` (unsigned; direction encoded in type), `stripe_fee_cents INTEGER NULL` (NULL = fee unknown), `stripe_payment_intent_id`, `description`. Unique partial index on `stripe_payment_intent_id` enforces idempotency.
- `message_log` — SMS/email send records. Columns: rep_id (FK), channel (message_channel enum), recipient, content_preview, screening_result, screening_notes, delivery_status, cost, is_automated, sent_at
- `rep_notes` — Thumper memory (chronological summaries). Columns: rep_id (FK), summary, conversation_date
- `rep_messages` — dashboard-delivered messages (reports, newsletters, support). Columns: rep_id (FK), message_type (rep_message_type enum), direction (message_direction enum), subject, body, is_read, read_at
- `site_settings` — per-rep website customization. Columns: rep_id (FK UNIQUE), banner_text, banner_visible, ticker_text, ticker_visible, tagline, hero_image_url, hero_animation_type, team_name, show_join_page
- `subscriptions` — Stripe subscription management. Columns: rep_id (FK UNIQUE), stripe_subscription_id (UNIQUE), stripe_customer_id, plan_tier (plan_tier enum), status (subscription_status enum), monthly_amount, current_period_start, current_period_end, cancelled_at, cancelled_reason, cancellation_effective_date, cancel_at_period_end (BOOLEAN), stripe_livemode (BOOLEAN), stripe_event_timestamp (BIGINT — for webhook race-condition protection)
- `onboarding_status` — onboarding pipeline with photography kit tracking. Columns: rep_id (FK UNIQUE), current_stage (onboarding_stage enum), completed_steps (JSONB), camera_type, camera_quality_passed, lightbox_shipped, lightbox_shipped_at, kit_received, kit_received_at, started_at, completed_at

### `stripe_events` (migration 008)
Webhook idempotency ledger. PK is Stripe event ID (`evt_xxx`). Prevents duplicate processing.
- `id TEXT PK`, `event_type TEXT`, `processed_at TIMESTAMPTZ`
- RLS: service-role only (policy denies all user access)

### `refund_operations` (migration 008)
Pro-rata refund state machine. Tracks cancellation + refund as a two-step process.
- `id UUID PK`, `subscription_id UUID FK`, `stripe_subscription_id TEXT`, `billing_period_start/end TIMESTAMPTZ`, `refund_amount_cents INTEGER`, `stripe_refund_id TEXT`, `stripe_livemode BOOLEAN`, `status TEXT` (pending/cancelled/refunded/failed), `error_message TEXT`, `completed_at TIMESTAMPTZ`
- UNIQUE constraint: `(stripe_subscription_id, billing_period_start)` — prevents duplicate refund operations per period
- RLS: service-role only

**reps table additions (migration 008):**
- `stripe_customer_id TEXT` — Stripe customer ID for direct lookup (indexed)

**17 Enums:** rep_status, listing_status, trade_request_status, fulfillment_status, event_status, plan_tier, subscription_status, wallet_transaction_type, message_channel, screening_result, delivery_status, rep_message_type, message_direction, onboarding_stage, removal_reason, rejection_reason, jewelry_type

**`wallet_transaction_type` (rebuilt in migration 009):** `load`, `sms_charge`, `refund`, `adjustment_credit`, `adjustment_debit`, `auto_recharge`. Legacy `adjustment` rows were split by sign at migration time.

**RLS:** Enabled on all 16 tables. Standard pattern: rep sees own data, admin (louis@neonrabbit.net) sees all. Admin check on `reps` table uses `auth.jwt() ->> 'email'` (fixed in migration 007 to avoid recursion). All other tables check admin via subquery on `reps`. Special cases: jewelry_designs/collections have shared read; trade_requests allows public INSERT.

**Realtime:** trade_requests, trade_listings, calendar_events, rep_messages

**RPC Functions (SECURITY DEFINER):**
- `rpc_submit_trade_request(p_listing_id, p_customer_name, p_customer_description)` — atomic: insert request + set listing to pending_trade
- `rpc_approve_trade(p_request_id, p_rep_notes)` — atomic: approve request + set listing traded + create fulfillment + increment times_traded
- `rpc_reject_trade(p_request_id, p_reason, p_rep_notes)` — atomic: deny request + restore listing to available
- `deduct_wallet_balance(p_wallet_id UUID, p_amount INTEGER)` — atomic debit + auto-recharge lock acquisition. Returns `(new_balance_cents, should_recharge, attempt_id)`. Raises `INSUFFICIENT_FUNDS`, `WALLET_NOT_FOUND`, `INVALID_AMOUNT`. Acquires lock when new balance ≤ threshold AND `auto_recharge_enabled` AND (lock not held OR lock stale > 30 min). The 30-min stale-lock fallback self-heals attempts abandoned mid-3DS.
- `credit_wallet(p_wallet_id, p_rep_id, p_amount, p_type, p_stripe_pi, p_stripe_fee, p_description, p_attempt_id)` — idempotent credit with ownership check and credit-only type allowlist (`load`, `auto_recharge`, `refund`, `adjustment_credit`). Order: lock wallet → verify rep ownership → attempt ledger insert (ON CONFLICT DO NOTHING on stripe PI) → credit balance only if inserted → clear lock only when type=`auto_recharge` and attempt matches. Returns `(new_balance_cents, credited)`.
- `release_wallet_recharge_lock(p_wallet_id, p_attempt_id)` — scoped by attempt_id; no-op if another attempt is live.

All three wallet RPCs are service-role only (REVOKE PUBLIC, GRANT EXECUTE service_role).

**Notable Indexes:**
- `idx_one_pending_request_per_listing` — partial unique index enforcing one pending request per listing
- `idx_designs_fulltext` — GIN index for full-text search on design_name, material, main_stone
- `idx_wallet_tx_stripe_pi_unique` — partial unique index on `wallet_transactions.stripe_payment_intent_id` (migration 009) — the idempotency gate for credit_wallet

---

## Test Rep Seed Data (Phase 0.6)

Account: `testrep@neonrabbit.net` — permanent development sandbox.

| Table | Seeded Data |
|-------|-------------|
| reps | 'Demo Rep', 'Sparkle Suite Demo', active |
| site_settings | tagline, banner, ticker — all visible |
| sms_wallet | 5000¢ ($50.00) balance, auto_recharge_enabled=false, threshold=500¢, amount=2500¢ |
| subscriptions | monthly, active, $0 (test) |
| onboarding_status | stage: launched, phone_fallback camera |
| collections | March 2026, Galaxy, Celestial |
| jewelry_designs | RG31452, NK66139, ER84972, ST78951, BR22415 |
| trade_listings | 3 listed (RG31452, NK66139, ER84972) |
| calendar_events | Friday Night Fizz, Sunday Sparkle Session |
| rep_notes | 1 Thumper memory note |

Seed script: `scripts/seed-test-rep.ts` (run via `npx tsx scripts/seed-test-rep.ts`)
- Idempotent — cleans up existing test rep data before re-inserting
- Uses service role client to bypass RLS
- Dynamically looks up auth user IDs (no hardcoded UUIDs)
- Also creates Louis's admin rep row if missing
- Uses migration-009 cents columns (`balance_cents`, `auto_recharge_threshold_cents`, `auto_recharge_amount_cents`, `minimum_load_amount_cents`, `auto_recharge_pending`)

---

## Edge Functions

### `open-brain-mcp`
MCP server for Louis's Open Brain — semantic thought storage and search.
- Auth: `MCP_ACCESS_KEY` header
- Tools: `search_thoughts`, `list_thoughts`, `thought_stats`, `capture_thought`
- Tech: Hono + @modelcontextprotocol/sdk + Zod
- Tables: `open_brain` (via RPCs `match_open_brain`, `upsert_thought` — presumed)
- URL: `https://bqhzfkgkjyuhlsozpylf.supabase.co/functions/v1/open-brain-mcp`

### `open-brain-mcp-march`
Mirror of open-brain-mcp for user March.
- Auth: `MCP_ACCESS_KEY_MARCH` header
- Tables: `thoughts_march` (via `match_thoughts_march`, `upsert_thought_march`)
- URL: `https://bqhzfkgkjyuhlsozpylf.supabase.co/functions/v1/open-brain-mcp-march`

### `nr-hq-mcp`
Read-only MCP server exposing NR HQ build tracker state to Claude Desktop / claude.ai.
- Auth: `x-brain-key: MCP_ACCESS_KEY` header (query `?key=` fallback)
- Tools: `get_phases`, `get_tasks`, `get_gates`, `get_action_cards`, `get_build_summary`
- Tech: Hono + @modelcontextprotocol/sdk + Zod, anon Supabase client (public SELECT RLS)
- Tables: `construction_phases`, `construction_tasks`, `construction_gates`, `build_action_log`
- Default project: env `NR_HQ_DEFAULT_PROJECT` or `sparkle_suite`
- URL: `https://bqhzfkgkjyuhlsozpylf.supabase.co/functions/v1/nr-hq-mcp`

### `embed`
Background worker: reads from `embed_jobs` pgmq queue, generates OpenAI embeddings, writes back to `open_brain`.

### `live-queue-sync`
REST endpoint for Chrome extension → live_queue table sync.
- Auth: `x-sync-key: LIVE_QUEUE_SYNC_KEY` header (32-char alphanumeric secret)
- Method: `POST`
- Body: `{ sync_code: string, queue: string[], timestamp: string }`
- Returns: `{ status: "ok" }` or error object
- Uses service role key internally to bypass RLS for writes
- CORS: open (`*`) for Chrome extension access
- URL: `https://bqhzfkgkjyuhlsozpylf.supabase.co/functions/v1/live-queue-sync`

### `daily-financial-sync`
Scheduled job reconciling financial snapshots.

### `open-brain-status-updater`
Status maintenance job for Open Brain records.

---

## Next.js App (app/)

### API Routes
- `POST /api/telegram` — Telegram webhook → `handleTelegramUpdate()` → inserts to `open_brain`
- `POST /api/open-brain/context` — Semantic search: takes `{ query, count }`, generates embedding, calls `match_open_brain()` RPC
- `POST /api/stripe/create-checkout` — Authenticated. Creates Stripe Checkout Session for subscription. Checks for existing active sub (409). Server-built URLs only.
- `POST /api/stripe/webhook` — Stripe webhook. Signature verified. Event-ID dedup via stripe_events table. Handles: `checkout.session.completed` (routes wallet-load vs subscription by metadata), `customer.subscription.updated/deleted`, `invoice.payment_succeeded/failed`, `payment_intent.succeeded/payment_failed/canceled/requires_action` (auto-recharge flow). Returns 500 on error (Stripe retries). Race-condition protection via stripe_event_timestamp.
- `POST /api/stripe/create-portal-session` — Authenticated. Creates Stripe Customer Portal session for managing subscription/payment method.
- `GET /api/stripe/subscription-status` — Authenticated. Returns current subscription status from Supabase (not Stripe API).
- `POST /api/stripe/sync` — Authenticated. Reconciliation: fetches Stripe subscriptions, upserts Supabase to match, returns diff.
- `POST /api/stripe/wallet/load` — Authenticated. Body: `{ amount_cents: number }`. Validates amount ≥ `minimum_load_amount_cents`, ensures wallet row exists, gets-or-creates Stripe customer, creates Checkout Session (mode=payment) with metadata `{ rep_id, wallet_id, wallet_load: 'true', intended_cents }`. Credit applied via webhook `checkout.session.completed`.
- `POST /api/stripe/wallet/auto-recharge` — Authenticated. Body: `{ enabled: boolean, threshold_cents?: integer, amount_cents?: integer }`. Validates `amount_cents ≥ 2500` and merged amount > merged threshold. Updates `sms_wallet` in-place, returns new settings.

### Pages
- `app/page.tsx` — Default Next.js home (placeholder, not customized yet)
- `app/layout.tsx` — Root layout with Geist fonts

---

## Lib

### `lib/supabase.ts`
Re-exports `createClient` from `lib/supabase/client.ts`.

### `lib/supabase/client.ts`
Browser Supabase client using `createBrowserClient` from `@supabase/ssr`.

### `lib/supabase/server.ts`
Server-side Supabase client with Next.js cookie handling via `createServerClient` from `@supabase/ssr`.

### `lib/supabase/auth.ts`
`getAuthenticatedRep()` — extracts authenticated user from request cookies via `@supabase/ssr`, looks up corresponding `reps` row. Used by all non-webhook Stripe routes. Throws `AuthError` on failure.

### `lib/supabase/admin.ts`
Service role Supabase client — bypasses RLS. For admin operations and seeding.

### `lib/stripe/config.ts`
Zod schema validation for Stripe env vars. Lazy-loaded (deferred to first request, not module evaluation) to avoid build-time crashes. Fail-fast in production runtime, warn in dev. Exports: `getStripeConfig()`, `isStripeEnabled()`, `getPriceId()`, `getAppUrl()`.

### `lib/stripe/client.ts`
Lazy Stripe instance (v22, `2026-03-25.dahlia` API). Created on first call to `getStripe()`.

### `lib/stripe/customers.ts`
- `createStripeCustomer(repId, email, name)` — creates Stripe customer with `rep_id` + `platform: sparkle_suite` metadata, saves `stripe_customer_id` to reps table
- `getOrCreateStripeCustomer(repId)` — idempotent: returns existing if reps.stripe_customer_id is set

### `lib/stripe/refunds.ts`
- `calculateProRataRefund(periodStart, periodEnd, amount)` — epoch-second math, clamped to [0, amount]
- `processProRataRefund(subscriptionId)` — state machine: insert refund_operations → cancel in Stripe → refund via Stripe (with idempotency key). Handles partial failures: if cancel succeeds but refund fails, marks "cancelled" with error for manual attention.

### `lib/services/wallet.ts`
SMS wallet service layer.

```ts
interface WalletRow {
  id: string
  rep_id: string
  balance_cents: number
  auto_recharge_enabled: boolean
  auto_recharge_threshold_cents: number
  auto_recharge_amount_cents: number
  minimum_load_amount_cents: number
  auto_recharge_pending: boolean
  auto_recharge_attempt_id: string | null
  last_loaded_at: string | null
  created_at: string
  updated_at: string
}
```

- `SMS_CHARGE_CENTS = 9` — per-SMS debit amount.
- `ensureWallet(repId)` — upsert-then-select on `sms_wallet` keyed by rep_id. Returns the row (defaults from schema).
- `deductSmsCharge(repId)` — calls `deduct_wallet_balance` RPC with `SMS_CHARGE_CENTS`. On `INSUFFICIENT_FUNDS`, re-reads the current balance (never returns stale). On success, if RPC returned `should_recharge = true`, schedules `triggerAutoRecharge` via Next.js `after()` so the SMS request isn't delayed.
- `triggerAutoRecharge(walletId, repId, attemptId)` (internal) — fresh-reads the wallet, aborts on `attempt_id` drift, resolves the Stripe customer (prefer `reps.stripe_customer_id`, fall back to latest active/trialing subscription), resolves a payment method (prefer `customer.invoice_settings.default_payment_method`, fall back to live-sub's `default_payment_method`), then `stripe.paymentIntents.create` with `confirm: true, off_session: true`, metadata `{ rep_id, wallet_id, auto_recharge: 'true', attempt_id }`, and `idempotencyKey: auto-recharge-${attemptId}`. Credit happens in the webhook, not here. On PI create failure or missing customer/PM, calls `release_wallet_recharge_lock`.
- `releaseLock(walletId, attemptId)` (internal) — thin wrapper over the RPC.

### `lib/telegram-bot.ts`
Telegram message handler:
- `generateEmbedding(text)` — OpenAI embeddings
- `handleTelegramUpdate(body)` — receives webhook, stores message to `open_brain`

---

## Scripts

### `scripts/seed-test-rep.ts`
Idempotent seed script for the test rep development sandbox.
- Creates auth users (louis@neonrabbit.net, testrep@neonrabbit.net) if not present
- Cleans up existing test rep data, then re-seeds across 10 tables
- Uses migration-009 `sms_wallet` columns (cents + auto-recharge lock fields)
- Runs verification: auth sign-in, data presence, RLS isolation, admin visibility
- Run: `npx tsx scripts/seed-test-rep.ts`

---

## Supabase Migrations (in order)

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Base schema: open_brain, clients (→ clients_build_pipeline in 010), pipeline_status, builds, payments |
| `002_open_brain_embedding_pipeline.sql` | pgvector, pgmq, pg_net, pg_cron; embed pipeline; HNSW index |
| `003_neon_rabbit_hq.sql` | Business management tables: projects, financials, expenses, clients (IF NOT EXISTS — no-op over 001), todos, ideas |
| `004_march_open_brain.sql` | Isolated thoughts_march table + RPCs for user March |
| `005_live_queue.sql` | live_queue table, RLS, seeded 5 rep rows, Realtime enabled |
| `006_sparkle_suite_schema.sql` | Sparkle Suite platform: 16 tables, 17 enums, all indexes, RLS policies, Realtime (4 tables), 3 RPC functions |
| `007_fix_reps_admin_rls_recursion.sql` | Fix: admin RLS on reps table uses JWT claim instead of self-referencing subquery |
| `008_stripe_billing.sql` | Stripe billing infra: stripe_events (idempotency), refund_operations (state machine), subscriptions additions (cancel_at_period_end, stripe_livemode, stripe_event_timestamp), reps.stripe_customer_id |
| `009_sms_wallet_cents.sql` | SMS wallet cents conversion (DECIMAL → INTEGER cents on `sms_wallet` + `wallet_transactions`), enum rebuild (split `adjustment` → credit/debit + add `auto_recharge`), auto-recharge lock fields (`auto_recharge_pending`, `auto_recharge_attempt_id`), fail-loud pre-validation guards, and three SECURITY DEFINER RPCs: `deduct_wallet_balance`, `credit_wallet` (idempotent via unique partial index on `stripe_payment_intent_id`), `release_wallet_recharge_lock`. Deduct RPC self-heals locks stale > 30 min. |
| `010_nr_client_table_renames.sql` | Rename `clients` → `clients_build_pipeline` (SS build pipeline; pipeline_status/builds/payments FKs auto-track), `sparkle_clients` → `neon_rabbit_clients` (HQ canonical client DB; daily-financial-sync Edge Function target). Rename-only — no schema or data changes. |
| `011_nr_open_items.sql` | `open_items` governance tracker: 3 enums (`open_item_category`, `open_item_status`, `open_item_priority`), table + `updated_at` trigger, 4 indexes, RLS (service_role full / anon read), 15-row seed across gap(1) / research(5) / legal(3) / grey_area(6). |
| `012_nr_open_items_sync_secret.sql` | Append `open_items` task row flagging the pre-existing SYNC_SECRET auth disconnect on `daily-financial-sync` (cron silently 401-ing for ~12 days; last good `financial_snapshots` write 2026-04-04). Guarded on title — idempotent. |

---

## Key Environment Variables

| Variable | Used In |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server clients (public, RLS-enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client + edge functions (bypasses RLS) |
| `OPENAI_API_KEY` | Telegram bot embeddings, context API route |
| `TELEGRAM_BOT_TOKEN` | Telegram webhook handler |
| `MCP_ACCESS_KEY` | open-brain-mcp auth |
| `MCP_ACCESS_KEY_MARCH` | open-brain-mcp-march auth |
| `OPENROUTER_API_KEY` | open-brain-mcp embeddings + metadata extraction |
| `LIVE_QUEUE_SYNC_KEY` | live-queue-sync auth (Chrome extension secret) |
| `STRIPE_SECRET_KEY` | Stripe API (sk_test_ or sk_live_) — required in production |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification (whsec_) — required in production |
| `STRIPE_PRICE_MONTHLY` | Stripe Price ID for monthly plan (optional) |
| `STRIPE_PRICE_QUARTERLY` | Stripe Price ID for quarterly plan (optional) |
| `STRIPE_PRICE_ANNUAL` | Stripe Price ID for annual plan (optional) |
| `NEXT_PUBLIC_APP_URL` | App base URL for checkout/portal redirect URLs |

---

## Data Flows

```
Telegram message
  → /api/telegram (Next.js)
  → handleTelegramUpdate()
  → generateEmbedding() [OpenAI]
  → INSERT open_brain

User query
  → /api/open-brain/context (Next.js)
  → generateEmbedding() [OpenAI]
  → match_open_brain() [Supabase RPC]
  → return results

MCP client (Claude Desktop etc.)
  → open-brain-mcp Edge Function
  → capture_thought / search_thoughts / etc.
  → Supabase RPCs

Chrome extension (live show)
  → live-queue-sync Edge Function [x-sync-key auth]
  → UPDATE live_queue WHERE sync_code = ?

Website component
  → Supabase Realtime subscription on live_queue
  → Real-time queue display to viewers

Rep dashboard (future)
  → lib/supabase/server.ts (SSR, cookie auth)
  → RLS-enforced queries (rep sees own data only)
  → Admin (Louis) sees all via JWT email check

Stripe subscription flow:
  → POST /api/stripe/create-checkout (authenticated)
  → Creates Stripe Checkout Session
  → Redirect to Stripe-hosted payment page
  → On success: Stripe fires checkout.session.completed webhook
  → POST /api/stripe/webhook verifies signature + dedup
  → Upserts subscriptions table, links stripe_customer_id to reps
  → Subsequent changes: subscription.updated/deleted webhooks keep DB in sync
  → invoice.payment_succeeded/failed update subscription status
  → Rep can manage via Customer Portal (/api/stripe/create-portal-session)
  → Manual reconciliation available via /api/stripe/sync

Stripe pro-rata refund flow:
  → processProRataRefund(subscriptionId) [lib/stripe/refunds.ts]
  → Insert refund_operations row (pending)
  → Cancel subscription in Stripe → status: cancelled
  → Issue refund with idempotency key → status: refunded
  → If refund fails after cancel: status stays cancelled, error logged for manual resolution

SMS wallet manual load flow:
  → POST /api/stripe/wallet/load { amount_cents } (authenticated)
  → ensureWallet(repId) — upsert-then-select
  → Validates amount ≥ minimum_load_amount_cents
  → stripe.checkout.sessions.create (mode='payment') with metadata { rep_id, wallet_id, wallet_load: 'true', intended_cents }
  → Redirect to Stripe-hosted payment page
  → On success: checkout.session.completed webhook
  → handleWalletLoad: retrieves PI with balance_transaction, verifies amount_received == intended, resolves Stripe fee (nullable — never invented)
  → credit_wallet RPC (type='load', idempotent on stripe_payment_intent_id)

SMS send → deduct → auto-recharge flow:
  → deductSmsCharge(repId) [lib/services/wallet.ts]
  → deduct_wallet_balance RPC — atomic debit + lock acquisition
       · INSUFFICIENT_FUNDS: returns {success: false, fresh balance}
       · success with should_recharge=true: schedules triggerAutoRecharge via Next.js after()
  → triggerAutoRecharge runs out-of-band:
       · fresh-read wallet, abort on attempt_id drift
       · resolve customer (reps.stripe_customer_id || active sub) and payment method
       · stripe.paymentIntents.create { off_session: true, confirm: true, metadata with attempt_id, idempotencyKey: auto-recharge-<attemptId> }
       · if create fails or customer/PM missing → release_wallet_recharge_lock
  → Stripe webhook handlers settle the PI:
       · payment_intent.succeeded → credit_wallet (type='auto_recharge', clears lock when attempt_id matches)
       · payment_intent.payment_failed / canceled → release_wallet_recharge_lock
       · payment_intent.requires_action → log only (non-terminal; do NOT release lock — avoids duplicate off-session attempts during 3DS)
       · stale lock (>30 min) in deduct RPC → self-heal by issuing a fresh attempt_id
```

---

## Claude Skills (`.claude/skills/`)

Local-only (gitignored). Not committed to the repo.

| Skill | Trigger | Description |
|-------|---------|-------------|
| `sparkle-live-queue` | chrome-extension work, "live queue", "bomb party scraper", "party orders", "reveal queue", "sparkle sync" | Complete reference for the Live Queue Chrome extension — BP HTML structure (confirmed April 2026), three absolute safety rules, past incidents, architecture, debugging checklist |

---

## Chrome Extension (`chrome-extension/`)

Manifest V3 extension that scrapes the Bomb Party back-office live-party-orders page and syncs the unrevealed queue to the `live-queue-sync` edge function.

**Three inviolable rules:** No page refreshes. No DOM writes on the BP page. No alerts/popups/thrown errors.

### Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest: permissions (storage, alarms), host (myoffice.bombparty.com), content script + service worker + popup |
| `content.js` | Read-only DOM scraper — finds the orders table by `#party-order-table` ID only (no fallbacks); uses `data-sort-by` attribute on `<th>` elements (`FirstName`, `IsRevealed`) for column detection, not textContent; selects `<tr class="product product-row">` rows from tbody; reads checkbox.checked for revealed state; attaches MutationObserver on document.body to detect table appearance (5s timeout then falls back to 2s polling); observes tbody for row/attribute changes; reverses DOM order for oldest-first queue; every unrevealed order gets its own entry (no dedup); pushes to edge function |
| `background.js` | Service worker — 60s alarm triggers content script sync via message passing (last-resort safety net) |
| `popup.html/css/js` | Setup UI (sync code input) and status UI (toggle, status dot — Connected/Error/Paused) |
| `icons/` | Pink (#ec4899) placeholder icons with white sparkle (16/48/128px) |

### Data Flow

```
Bomb Party live-party-orders page
  → content.js scrapes <tbody> rows
  → Filters: unrevealed, name >= 2 chars (no dedup — each order is a separate entry)
  → Sorts oldest-first (by Order Date or reversed DOM order)
  → Hashes queue, skips if unchanged
  → POST to live-queue-sync edge function (x-sync-key header)
  → Edge function updates live_queue table
  → Supabase Realtime pushes to website subscribers
```

---

## Session 2026-04-16 — Memory Library Task 2 (client table renames + open_items)

Two migration files landed, one Edge Function redeployed. Goal: align client-table names with the umbrella rebrand and stand up a governance tracker for pre-launch blockers before the 6 AM EST cron runs on 2026-04-17.

**Renames (migration 010, rename-only — no schema or data changes):**
- `clients` → `clients_build_pipeline` — the SS build pipeline table (001-lineage). `pipeline_status.client_id`, `builds.client_id`, `payments.client_id` FKs auto-track the renamed parent via `pg_catalog` OIDs; no FK DDL required.
- `sparkle_clients` → `neon_rabbit_clients` — the HQ canonical client DB written by `daily-financial-sync`. (This table had never been checked in as a migration — only lived in live Supabase. Task 2 chose not to backfill a CREATE safety net; the inferred column set would likely be wrong-shape and mask a real miss. `supabase db reset` has never been run on this project.)

**Edge Function (`daily-financial-sync/index.ts`):** six references updated — four `.from("neon_rabbit_clients")` call sites + one `source:` string + one comment. Deployed via `supabase functions deploy daily-financial-sync`. Smoke-tested with `type: "evening"` (skips Stripe/Plaid writes, exercises only the brief-generation path that queries `neon_rabbit_clients`).

**New table (migration 011 — `open_items`):** 15 seed rows tracking gap(1) / research(5) / legal(3) / grey_area(6) items across the pre-launch plan. Migration 012 appends one additional `task` row flagging a pre-existing SYNC_SECRET auth disconnect (see below). Legal + grey_area rows are the current BLOCKING-LAUNCH items (A2P 10DLC, attorney session, BP Policy 7.1, platform/start/launch fee amounts). Enums include `decision` and `task` categories reserved for future use. RLS: service_role full write, anon read.

**Other app code audit:** confirmed via repo-wide grep that no other Edge Function, `app/` route, `lib/` module, or script referenced `sparkle_clients` or `.from("clients")`. The historical comment on line 21 of `005_live_queue.sql` ("will be linked to sparkle_clients table later") was left as-is — rewriting a shipped migration is worse than a stale comment.

**Guardrails honored:** no data dropped, no column changes, no touch of `construction_*` tables, `open_brain`, embedding infrastructure, cron schedules, or the `neon-rabbit-hq` repo.

**Side finding (flagged via migration 012 → `open_items` task row):** during verification, the smoke-test curl returned HTTP 401. Investigation showed the 6 AM/9 PM cron (`morning-financial-sync`, `evening-brief`) has been silently 401-ing for ~12 days — the Edge Function reads `SYNC_SECRET` via `Deno.env.get()` but the secret is absent from `supabase secrets list`, while the cron sources `sync_secret` from Supabase Vault. Last successful `financial_snapshots` write was 2026-04-04. Pre-existing, not caused by the Task 2 rename, but now tracked as a high-priority open item blocking HQ Phase 2B (financial sync).

---

## Session 2026-04-16 — Memory Library Task 3 (12 MCP write tools on `nr-hq-mcp`)

Single-file Edge Function change — extends `supabase/functions/nr-hq-mcp/index.ts` from 5 read-only tools to 17 tools total (5 reads + 12 writes). Goal: let Claude Chat update Build Tracker state, Open Items, and canonical Clients mid-conversation without prompting Claude Code.

**Architecture:**
- The 5 pre-existing read tools (`get_phases`, `get_tasks`, `get_gates`, `get_action_cards`, `get_build_summary`) stay on the anon-key Supabase client + RLS.
- The 12 new write tools use a second Supabase client created with `SUPABASE_SERVICE_ROLE_KEY`. Same Hono `x-brain-key` / `?key=` auth gate — writes still require `MCP_ACCESS_KEY` to reach the handler.
- Zero new tables, zero new migrations.

**The 12 new tools:**

*Build Tracker (4)*
| Tool | Behavior |
|------|----------|
| `update_task_status` | Updates a construction task by `task_key` + `project`. Auto-sets `completion_date=now()` when `status='complete'` and no date supplied. Never nulls `completion_date` on moves away from complete (historical record preserved). |
| `update_phase_status` | Updates a phase by `phase_key` + `project`, then recomputes `total_tasks` / `completed_tasks` from live `construction_tasks` counts in the same handler. |
| `update_gate_status` | Updates a gate by `gate_key` + `project`. Typo-fix from the original task spec which said `phase_key`. |
| `update_action_cards` | Atomic triple-write: archives all active `build_action_log` rows for the project (`is_active=false`), then inserts 3 new cards (`previous`/`current`/`next`). All 3 positions required per call. Each card is `{title, description?}`. Sequential writes — tiny race window between archive and insert is acceptable for a single-user system. |

*Open Items CRUD (4)*
| Tool | Behavior |
|------|----------|
| `create_open_item` | Inserts into `open_items` with defaults `project='neon_rabbit'`, `status='open'`, `priority='medium'`. |
| `update_open_item` | Patches any updatable field by `id`. Rejects empty patches. |
| `resolve_open_item` | Sets `status='resolved'`, writes resolution text, sets `resolved_at=now()`. Rejects empty/whitespace resolution. |
| `get_open_items` | Lists with optional `status` / `category` / `priority` filters. When `status` unspecified, defaults to active set: `open`, `deferred`, `in_progress` (hides resolved). |

*Clients CRUD targeting `neon_rabbit_clients` (4)*
| Tool | Behavior |
|------|----------|
| `create_client` | Inserts with 10 writable columns only. `id` (uuid) is the sole unique key. Returns the full row. |
| `update_client` | Patches any of the 10 writable columns by `id` (uuid). |
| `get_clients` | Lists all clients; optional `status` filter. Returns full rows INCLUDING the 5 cron-owned columns. |
| `get_client` | Fetch by `id` (uuid). Returns full row. |

**Locked decisions:**
1. `update_client` / `get_client` look up by `id` (uuid) only. **Decision 10 correction:** the original task prompt assumed a `code` column existed on `neon_rabbit_clients`; first-pass smoke tests exposed that the real table (created via Supabase dashboard, never in migrations) has no `code`, no `updated_at`, and only `id` is unique.
2. **5 cron-owned columns on `neon_rabbit_clients` are read-only from MCP.** Write schemas for `create_client` / `update_client` omit all 5. Principle: any column written by `daily-financial-sync` is cron-owned. The 5: `payment_status`, `stripe_customer_id`, `current_plan`, `next_charge_date`, `lifetime_revenue`. `get_client` / `get_clients` return them all. (The original 7-Stripe-column set in the task spec was speculative — the live table has none of stripe_subscription_id, subscription_status, current_period_end, last_payment_date, payment_amount, or latest_invoice_status.)
3. `neon_rabbit_clients` **writable set = 10:** `name`, `user_id`, `site_name`, `site_url`, `status`, `tier`, `mrr`, `started_at`, `launched_at`, `notes` (+ server-managed `id`, `created_at`). No `updated_at` column exists. `name` and `user_id` are required in `create_client` — `user_id` is NOT NULL at DB level and cannot fall back to an implicit current-user on service_role.
4. `update_task_status` completion_date behavior — auto-set on `status='complete'` when absent; never nulled on moves away.
5. `update_phase_status` recomputes `total_tasks` / `completed_tasks` from live `construction_tasks` after every status write.
6. `resolve_open_item` requires non-empty resolution text (whitespace rejected).
7. `update_gate_status` keyed by `gate_key` — single row match, no cascade.
8. `update_action_cards` accepts objects `{title (required, non-empty), description? (optional)}` for all 3 positions (all three required every call).
9. `update_action_cards` atomicity: sequential archive-then-insert. Race window is tens of ms for a single-user system; a Postgres RPC/transaction wasn't justified.

**Smoke test artifact:** `supabase/functions/nr-hq-mcp/smoke-test.sh` — runnable bash script with 14 curl calls (12 new tools + 2 baseline reads). Reads `MCP_ACCESS_KEY` from env (not hardcoded). Exits non-zero on any failure. Prints cleanup SQL at the end for removing the `SMOKE-0000` client + `SMOKE TEST — DELETE ME` open item rows. Louis runs this post-commit from 1Password-sourced key.

**Guardrails honored:** 5 read tools are byte-identical to pre-Task-3 state (schemas, return shapes, anon client). `open-brain-mcp` and `daily-financial-sync` untouched. No new tables/migrations. `clients_build_pipeline` untouched. NR HQ Claude.ai connector config untouched — Louis reloads the connector post-deploy (disconnect + reconnect) to pick up the new tool list.

**Post-deploy verification (Louis):** reload NR HQ connector, confirm 17 tools load in a fresh Claude Chat, fire one write to confirm end-to-end path.

