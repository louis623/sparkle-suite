# Codebase Snapshot — Neon Rabbit Core
_Generated: 2026-04-27 (HEAD: feat(ss): shared service layer foundation [Task 1.5A])_

> **Pricing — monthly-only forever (April 19, 2026 decision).** `ss_quarterly_test` (price_1TNcicHRBK3pZpO2Map0zvq0, $129/3mo) and `ss_annual_test` (price_1TNcjcHRBK3pZpO2817mT1CP, $468/yr) are archived on Stripe (active=false, history preserved). Only active price on product `prod_UMLNC0ybgRkVKX` is `ss_monthly_test` (price_1TNciVHRBK3pZpO2Vsz9xfSH, $49/mo).

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
│   │   ├── telegram/route.ts
│   │   └── thumper/                       ← Phase 1 Task 1.1 production chat surface
│   │       ├── route.ts                    ← streamText + 2 tools + HITL + Guardian telemetry + Enforcer audit
│   │       ├── conversation/[conversationId]/route.ts
│   │       ├── conversation/latest/route.ts ← Task 1.3 follow-up — returns rep's most recent conversation_id (cross-device sync)
│   │       ├── health/route.ts             ← public health probe (api/db reachable, recent_error_rate)
│   │       └── me/route.ts
│   ├── login/{page.tsx, _client.tsx}       ← Supabase Auth email/password login (redirects to /thumper)
│   ├── thumper/                           ← Production Thumper UI (Task 1.1 port of Claude Design handoff)
│   │   ├── page.tsx                        ← server wrapper (Suspense)
│   │   ├── _client.tsx                     ← useChat client + matchMedia desktop/mobile switch + cross-device init resolver (URL?c → /latest → fresh; AbortController + retry UI)
│   │   ├── _shell.module.css               ← root layout (reserves 400px right column on desktop)
│   │   ├── thumper-tokens.css              ← global :root tokens (Section A of handoff bundle)
│   │   └── components/                    ← 14 atoms × {.tsx, .module.css} + 2 helpers (Markdown, RelativeTime)
│   │       ├── ThumperGlyph, ThumperHeader, Bubble, ListingPreview, HITLBlock,
│   │       ├── ErrorBlock, Chips, InputRow, StreamingBubble, ChatHistory,
│   │       ├── EmptyGreeting, ThumperColumn, ThumperMobileShell, DashboardPlaceholder
│   │       └── Markdown.tsx, RelativeTime.tsx     ← Task 1.3 (no .module.css; styles co-located in Bubble.module.css)
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
│   ├── services/                 ← Task 1.5A — shared service layer (Thumper + future dashboard call into here)
│   │   ├── index.ts              ← barrel; re-exports all services + types + ServiceError + errors factory
│   │   ├── types.ts              ← source of truth for shared types (enums + I/O DTOs); trade-board.ts re-exports legacy names
│   │   ├── errors.ts             ← ServiceError base + TradeBoardError compat subclass + predefined errors map (LISTING_NOT_FOUND, DUPLICATE_LISTING, …)
│   │   ├── wallet.ts             ← ensureWallet, deductSmsCharge, auto-recharge trigger
│   │   ├── trade-board.ts        ← FACADE — getMyBoard + removeListing (auth client) + addListing/addListingBatch/updateListing
│   │   ├── trade-requests.ts     ← submitTradeRequest (svc, RPC), getTradeRequests (auth), approveTrade/rejectTrade (svc, RPC), getTradeHistory (auth)
│   │   ├── trade-fulfillment.ts  ← updateFulfillmentStatus (auth, forward-only approved→shipped→completed), getFulfillmentQueue (auth)
│   │   └── jewelry-database.ts   ← searchJewelryDatabase (svc, GIN→ILIKE fallback), resolveItemNumber (auth/svc), createDesign (svc), updateCanonicalPhoto (svc)
│   ├── thumper/                  ← Phase 1 Task 1.1 Thumper assistant (production)
│   │   ├── auth.ts               ← getAuthenticatedThumperContext()
│   │   ├── persistence.ts        ← thumper_conversations + approval_events I/O (incl. getLatestConversationId for cross-device sync)
│   │   ├── system-prompt.ts      ← THUMPER_SYSTEM_PROMPT (Task 1.2 — 7 sections, ~4500 tokens; +disclosure/affiliation/content-screening; warmer personality)
│   │   ├── probe-conversation-owner.ts ← admin-client cross-tenant ownership probe
│   │   ├── guardian-telemetry.ts ← logIncident, logToolExecution (writes thumper_incidents, tool_executions)
│   │   ├── audit.ts              ← hashState (SHA-256 of sorted-key JSON), writeTradeActionAudit
│   │   ├── image-compress.ts     ← Task 1.3 client-only canvas resize → JPEG q0.8, max 1024px edge, EXIF strip
│   │   ├── errors.ts             ← Task 1.4 — ThumperToolError base class for Tier 2 EXPLAIN classification
│   │   └── tools/                ← Task 1.4 tool registry
│   │       ├── index.ts          ← buildAllTools(ctx) — barrel + duplicate-name guard + needsApproval-survives-wrapping assertion
│   │       ├── types.ts          ← ToolContext, ToolDefinition (name + readOnly + build)
│   │       ├── wrappers/
│   │       │   ├── with-telemetry.ts      ← inner wrapper — logs tool_executions row per call (success/failure/duration/argsHash); composition: INSIDE error handler
│   │       │   └── with-error-handling.ts ← outer wrapper — Tier 1 RETRY (read-only only), Tier 2 EXPLAIN (ThumperToolError → friendly return), Tier 3 ESCALATE (incident + friendly return)
│   │       ├── list-my-trade-board.ts     ← ToolDefinition (readOnly: true), translates TradeBoardError → ThumperToolError
│   │       ├── remove-listing.ts          ← ToolDefinition (readOnly: false, needsApproval: true), owns its own trade_action_audit write (audit failure isolated, never reverses success)
│   │       └── add-listing.ts             ← Task 1.5B — ToolDefinition (readOnly: false), single + batch modes; obtains its own service-role admin client (createAdminClient) for addListing/addListingBatch/createDesign which require admin RLS; clickwrap is the rep's confirmation gate (not HITL); NEEDS_FULL_INFO recovery flow creates the design (createDesign) then lists it; NEEDS_COLLECTION returned as a hard limitation (no service patch path); writes trade_action_audit per add and per create_design; translates ServiceError → ThumperToolError for Tier 2 explain
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
│   ├── seed-test-rep.ts          ← idempotent test rep seeder (cents-aware)
│   └── gates/                    ← gate verification scripts (Gate 0 billing + wallet)
│       ├── gate0-inspect-prices.mjs
│       ├── gate0-inspect-schema.mjs
│       ├── gate0-inspect-state.mjs
│       ├── gate0-item4-archive-prices.mjs
│       ├── gate0-item4-checkout.mjs
│       ├── gate0-item4-pay.mjs
│       ├── gate0-item4-setup.mjs
│       ├── gate0-item4-verify.mjs
│       ├── gate0-item5-deduct.mjs       ← deduct_wallet_balance RPC × 5 (SMS charge path)
│       ├── gate0-item5-pay.mjs          ← Playwright driver for wallet-load Checkout redirect
│       ├── gate0-item5-setup.mjs        ← sms_wallet row bootstrap + baseline capture for gatetest
│       ├── gate0-item5-verify.mjs       ← wallet + wallet_transactions post-state assertions
│       └── gate0-item5-wallet-load.mjs  ← create Stripe Checkout (mode=payment) w/ wallet_load metadata
├── supabase/
│   ├── config.toml
│   ├── README.md
│   ├── functions/
│   │   ├── daily-financial-sync/index.ts
│   │   ├── embed/index.ts
│   │   ├── live-queue-sync/index.ts
│   │   ├── nr-hq-mcp/index.ts          ← NR HQ build tracker MCP (6 reads + 12 writes = 18 tools)
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
│       ├── 009_sms_wallet_cents.sql    ← SMS wallet cents conversion + auto-recharge lock
│       ├── 010_nr_client_table_renames.sql
│       ├── 011_nr_open_items.sql
│       ├── 012_nr_open_items_sync_secret.sql
│       ├── 013_build_action_log_audit.sql  ← entry_kind discriminator + 4 atomic state/audit RPCs
│       ├── 014_build_action_log_description_nullable.sql
│       ├── 015_build_action_log_position_scope.sql
│       ├── 016_drop_legacy_action_log_policies.sql
│       ├── 017_nr_clients_reconcile_reseed.sql
│       ├── 018_dashboard_authenticated_read.sql
│       ├── 019_dashboard_read_thoughts.sql
│       ├── 020_thumper_conversations.sql    ← thumper_conversations + approval_events
│       ├── 025_vac_key_dates.sql
│       ├── 026_nr_open_items_action_flag.sql ← is_action_item BOOLEAN flag + 8-row seed
│       ├── 027_nr_open_items_sort_order.sql  ← sort_order INTEGER for manual dashboard ranking
│       └── 028_ss_thumper_guardian_hooks.sql ← thumper_incidents, tool_executions, auth_events, trade_action_audit, sms_email_blast_audit (RLS service-role-only)
├── vault/                         ← project docs/notes
├── verification/                  ← Gate 0 + Phase 1 spike verification artifacts
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
├── README.md
├── SS_Service_Layer_Spec_v1_0.md
├── SS_Supabase_Schema_v1_0.md
├── SS_Phase1_Spike_Findings_v1.0.md  ← Phase 1 Task 1.0 closeout
└── CODEBASE_SNAPSHOT.md
```

---

## Dependencies

```json
{
  "@ai-sdk/anthropic": "^3.0.71",
  "@ai-sdk/react": "^3.0.170",
  "ai": "^6.0.168",
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
  - `gatetest@neonrabbit.net` — Gate 0 Item 4 webhook verification rep (live test subscription on Stripe; do not delete)
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
MCP server exposing NR HQ build tracker, open items, clients, VAC, and audit log to Claude Desktop / claude.ai.
- **VAC Key Dates tools (migration 025):** `get_vac_key_dates` (status/date_type filters, default excludes past dates), `create_vac_key_date` (title+date_value+date_type required; provider/condition_id/description optional), `update_vac_key_date` (id required; all fields including status optional). No delete tool exposed — callers set `status='cancelled'` instead. Writers call `supabaseWrite.rpc('fn_*_vac_key_date')`; reader queries `vac_key_dates` directly via service_role client, ordered by `date_value` ascending.
- Auth: `x-brain-key: MCP_ACCESS_KEY` header (query `?key=` fallback)
- Read tools: `get_phases`, `get_tasks`, `get_gates`, `get_action_cards`, `get_build_summary`, `get_recent_audit_log`
- Write tools: `update_task_status`, `update_phase_status`, `update_gate_status`, `update_action_cards` (the 4 status tools are thin wrappers over SECURITY DEFINER RPCs — `rpc_update_{task,phase,gate,action_cards}_status` — that use `SELECT FOR UPDATE` row locks for atomic state+audit writes in one transaction. All 4 accept an optional `actor` param (`'chat' | 'claude_code'`, default `'claude_code'`) that labels the audit row); `create_open_item`, `update_open_item`, `resolve_open_item`, `get_open_items`; `create_client`, `update_client`, `get_clients`, `get_client`
- Tech: Hono + @modelcontextprotocol/sdk + Zod. Reads use anon client (public RLS); writes use service_role client.
- Tables: `construction_phases`, `construction_tasks`, `construction_gates`, `build_action_log`, `open_items`, `neon_rabbit_clients`
- Default project: env `NR_HQ_DEFAULT_PROJECT` or `sparkle_suite`
- URL: `https://bqhzfkgkjyuhlsozpylf.supabase.co/functions/v1/nr-hq-mcp`
- **Audit semantics (migration 013):** every state change on a task, phase, gate, or action-card position writes a `build_action_log` row with `entry_kind='audit'`. No-op calls (same status, no other field changes) skip the audit write. `update_phase_status` always recomputes `total_tasks`/`completed_tasks` (drift-repair path) and bumps `updated_at` on every call; the audit row is emitted only when status actually changes. `get_action_cards` and `get_build_summary` defensively filter `entry_kind='card_snapshot'` so audit rows can never leak into the card-display paths.
- **Audit trust boundary:** `get_recent_audit_log` uses the service-role client because audit `old_value`/`new_value` payloads can contain task notes/completion session strings. Anon SELECT on `build_action_log` is scoped to `entry_kind='card_snapshot'`; audit rows are reachable only through the MCP `x-brain-key` gate.

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
| `013_build_action_log_audit.sql` | Codify dashboard-created `build_action_log` canonical shape + extend to a unified build-activity log. Adds `entry_kind` discriminator (`card_snapshot`/`audit`) + audit columns (`target_type`, `target_key`, `actor`, `old_value`, `new_value`, `summary`) with DEFAULTs for rollout safety. NULL-validation DO block before tightening NOT NULL on base columns. Backfill existing 36 rows to `entry_kind='card_snapshot'`. 4 CHECK constraints (`entry_kind`, `target_type`, `actor`, audit-shape guard). 2 indexes (project+kind+created, target+kind). RLS: service_role full, anon SELECT scoped to `card_snapshot`. 4 atomic state+audit RPCs with `SELECT FOR UPDATE` and actor/status validation: `rpc_update_task_status`, `rpc_update_phase_status`, `rpc_update_gate_status`, `rpc_update_action_cards`. Follow-up open_item row tracking the scheduled NOT-NULL enforcement migration. Fully transactional, idempotent on rerun. |
| `014_build_action_log_description_nullable.sql` | `alter column description drop not null`. The live column was NOT NULL from dashboard creation; audit rows legitimately don't carry a description (payload lives in summary/old/new). Also bumps the reserved NOT-NULL follow-up open_item to reference migration 016. |
| `015_build_action_log_position_scope.sql` | Rewrite `build_action_log_position_check` (dashboard-created CHECK restricting `position` to `previous/current/next`) so it only applies to `card_snapshot` rows. Audit rows use `position=target_key` (e.g. `task_0_1`) which needed the broader predicate. |
| `016_drop_legacy_action_log_policies.sql` | Drop pre-013 legacy RLS policies on `build_action_log` superseded by the entry_kind-scoped anon SELECT. |
| `017_nr_clients_reconcile_reseed.sql` | Reconcile `neon_rabbit_clients` canonical seed set after HQ renames. |
| `018_dashboard_authenticated_read.sql` | Allow authenticated dashboard reads on HQ tables (scoped). |
| `019_dashboard_read_thoughts.sql` | Allow authenticated dashboard reads on `open_brain`. |
| `020_thumper_conversations.sql` | Phase 1 Task 1.0 spike: `thumper_conversations` (UIMessage rows per rep) + `approval_events` (HITL approval ledger, UNIQUE approval_id for replay protection) + `requests_rep_update` RLS policy enabling removeListing auto-cancel of pending trade_requests. Additive only. |
| `025_vac_key_dates.sql` | VAC key dates: `vac_key_dates` table (title/date_value/date_type/provider/condition_id→vac_conditions ON DELETE SET NULL/description/status + `updated_at` trigger) with CHECK constraints on `date_type` (`appointment/deadline/follow_up/filing/records_request`) and `status` (`upcoming/completed/cancelled/missed`). Three indexes (date_value, status, partial on condition_id). RLS: authenticated SELECT only — mutations gated to service_role via `fn_create_vac_key_date` / `fn_update_vac_key_date` / `fn_delete_vac_key_date` (SECURITY INVOKER, REVOKE FROM PUBLIC/anon/authenticated, GRANT TO service_role). All three log to `vac_activity_log` with `entry_type='note'`. `fn_update_*` uses COALESCE-over-NULL for optional updates; `fn_delete_*` hard-deletes (scheduling only, not medical records). Numbered 025 because 024 was already taken by the memory-index compiler migration. |
| `026_nr_open_items_action_flag.sql` | Adds `is_action_item BOOLEAN NOT NULL DEFAULT false` to `open_items` + partial index `idx_open_items_action` on `(project, is_action_item) WHERE is_action_item=true`. Seeds 8 va_compensation rows so the HQ dashboard's Action Items card has content. |
| `027_nr_open_items_sort_order.sql` | Adds `sort_order INTEGER NULL` to `open_items` for manual ranking on the HQ dashboard (lower numbers first; NULL sorts last). Seeds the 9 current va_compensation action items with Louis-approved ranks 1–9. nr-hq-mcp `get_open_items` switches to `ORDER BY sort_order ASC NULLS LAST, priority DESC, created_at DESC` when `is_action_item=true`; default ordering preserved otherwise. `create_open_item` and `update_open_item` accept optional integer `sort_order`. |
| `028_ss_thumper_guardian_hooks.sql` | Phase 1 Task 1.1: Guardian (telemetry) + Enforcer (audit) tables for the production `/thumper` route. Five tables: `thumper_incidents` (severity ledger with resolution status), `tool_executions` (per-call timing + args_hash for telemetry), `auth_events` (login/logout/fail/reset/account_create), `trade_action_audit` (before/after SHA-256 state hashes for trade mutations), `sms_email_blast_audit` (schema-only — not wired in this task). All five RLS-enabled with single `service_role` policy; no rep-scoped policy. Writes go through `lib/thumper/guardian-telemetry.ts` and `lib/thumper/audit.ts` which use `createAdminClient()`. Runner: `tsx scripts/run-migration-028.ts` (asserts `DATABASE_URL` host includes project ref `bqhzfkgkjyuhlsozpylf` before applying). |
| `029_ss_jewelry_photo_storage.sql` | Phase 1 Task 1.5B follow-on: first Supabase Storage integration. Creates public `jewelry-photos` bucket via `INSERT INTO storage.buckets ... ON CONFLICT (id) DO NOTHING`. Two RLS policies on `storage.objects` (idempotent via `DROP POLICY IF EXISTS` — Postgres has no `CREATE POLICY IF NOT EXISTS`): public SELECT scoped to `bucket_id='jewelry-photos'`; authenticated INSERT scoped to the rep's own folder via `split_part(name, '/', 1) = (SELECT id::text FROM reps WHERE auth_user_id = auth.uid())`. No UPDATE/DELETE policies — service-role admin client handles those out-of-band. Path layout inside bucket: `{rep_id}/{uuid}.{ext}`. Uploads happen via `lib/services/storage.ts:uploadJewelryPhoto()` using the service-role client (RLS bypassed; defense-in-depth via path convention). Runner: `tsx scripts/run-migration-029.ts` (same `bqhzfkgkjyuhlsozpylf` host assertion); preferred path `supabase db push`. |

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

---

## Session 2026-04-17 — Memory Library Task 4 Part A (build_action_log audit writes)

Migrations 013–015 transform `build_action_log` from a pure rolling action-card store into a **unified build-activity log**. Every row is either a `card_snapshot` (the 3 active rolling cards + their archives) or an `audit` event (one row per state change on a task, phase, gate, or action-card position). The `nr-hq-mcp` Edge Function's 4 status tools are refactored into thin wrappers over 4 new atomic state+audit RPCs, and an 18th MCP tool `get_recent_audit_log` is added to read audit rows through the MCP trust boundary. Part B (dashboard History view) can now render a faithful timeline without a separate table.

**Schema (migration 013, codifies dashboard-created table):**
- Canonical base columns codified in `CREATE TABLE IF NOT EXISTS` (id uuid, project, position, title, description, is_active, created_at, updated_at). Drift reconciled via `ALTER COLUMN ... SET NOT NULL/DEFAULT`.
- Pre-flight `DO` block counts null values across the NOT-NULL-targeted columns and raises a clear error if any row violates the invariant — fail fast, do not tighten silently.
- Audit columns added: `entry_kind`, `target_type`, `target_key`, `actor`, `old_value`, `new_value`, `summary`. All nullable with DEFAULT on the two discriminator columns so old-code writes during the migration→deploy window still land valid.
- Backfill runs BEFORE RLS activates so the new anon SELECT predicate never observes a null `entry_kind`.
- CHECK constraints: `entry_kind IN ('card_snapshot','audit')`, `target_type IN ('task','phase','gate','action_card')`, `actor IN ('chat','claude_code')` (or null), and an audit-shape guard requiring audit rows to carry target_type/target_key/actor/summary.
- Indexes: `(project, entry_kind, created_at desc)` for project-scoped history scans, and a partial `(target_type, target_key, created_at desc) WHERE entry_kind='audit'` for target drill-down.
- RLS: service_role full; anon SELECT scoped to `entry_kind='card_snapshot'` — audit payloads (which can contain task notes / completion_session text) are **not** anon-readable.

**The 4 atomic state+audit RPCs (migration 013, SECURITY DEFINER, service_role only):**
- `rpc_update_task_status` — locks row with `SELECT FOR UPDATE`, applies Task 3 Decision 9 completion_date semantics exactly (explicit value wins; `status='complete'` with no value auto-sets to `now()` regardless of prior; never null on moves away), detects honest no-ops across status+notes+completion_session+completion_date, writes state+audit in one transaction. Audit `old_value`/`new_value` are plain strings on status-only changes, full JSON snapshots when multiple fields changed.
- `rpc_update_phase_status` — ALWAYS recomputes `total_tasks`/`completed_tasks` from live `construction_tasks` counts and bumps `updated_at` on every call (preserves the drift-repair use case). Audit row emitted only when status actually changes.
- `rpc_update_gate_status` — standard lock + compare + update + audit.
- `rpc_update_action_cards` — snapshots and locks active card rows, archives them (with a defensive `coalesce(entry_kind, 'card_snapshot')` self-heal on the archive predicate), inserts 3 new active `card_snapshot` rows, and emits one audit row per position whose title or description changed. Audit `old_value`/`new_value` are JSON card objects.

All 4 RPCs validate `actor` (`'chat'|'claude_code'`) and status values up front with `RAISE EXCEPTION` so SQL-direct callers get clear errors instead of opaque CHECK-violation messages. Status pools were probed against live CHECKs on 2026-04-17 and match: tasks `(not_started, in_progress, complete, blocked)`, phases `(not_started, in_progress, testing, complete)`, gates `(locked, testing, passed, failed)`.

**Edge Function (`nr-hq-mcp/index.ts`):**
- The 4 status tools (`update_task_status`, `update_phase_status`, `update_gate_status`, `update_action_cards`) are now thin RPC wrappers. Each accepts a new optional `actor: 'chat'|'claude_code'` param (defaults to `'claude_code'` when omitted — old callers unaffected). The `{task}`/`{phase}`/`{gate}`/`{project,cards}` response contracts are unchanged.
- 18th tool `get_recent_audit_log` reads via `supabaseWrite` (service-role path) because audit rows are RLS-protected from anon. Filters: `project`, `target_type`, `target_key`, `actor`; returns exact `count` + `page_size`. This is the only sanctioned read path for audit rows.
- `get_action_cards` and `get_build_summary` defensively filter `entry_kind='card_snapshot'` so audit rows can never leak into card-display surfaces.
- `update_phase_status`'s tool description now documents the always-recount + updated_at-bump semantics.

**Follow-up migrations discovered during validation:**
- Migration 014 — `alter column description drop not null`. The live column was NOT NULL from dashboard creation; audit rows genuinely don't have descriptions (payload lives in `summary`/`old_value`/`new_value`).
- Migration 015 — rewrite `build_action_log_position_check` to apply only to `card_snapshot` rows. Audit rows use `position=target_key` (e.g. `task_0_1`) which the original dashboard constraint `position IN ('previous','current','next')` rejected.
- Open_item reserved for migration 016 — tightens audit columns to NOT NULL after ≥48h clean traffic.

**Smoke test artifact (`supabase/functions/nr-hq-mcp/smoke-test.sh`):** extended from 14 to 17 logical tests (15–17 target the audit path via `get_recent_audit_log`). Self-contained: pre-reads `task_0_1` current status via `get_tasks`, computes a non-complete flip target, orders as flip → no-op → revert so the no-op step always lands at a non-complete state (avoids auto-completion_date aliasing). Env stays `MCP_ACCESS_KEY`-only; the new helpers (`unwrap_body`, `assert_contains`, `json_first_int`, `json_first_str`) strip the JSON-RPC escaping so grep patterns can match inner payload keys. Cleanup SQL printed at end is time-windowed (`created_at >= SCRIPT_START_TS`).

**End-to-end RPC validation (service role, before function smoke):** `rpc_update_task_status` flip + no-op + revert sequence on `task_0_1` confirmed audit rows appearing with correct actor/old/new/summary values and correct JSON payload shape when multiple fields change (status=`complete` triggers auto-`completion_date=now()` producing multi-field diff). Two audit rows written, no-op wrote zero, task state restored to `complete`. All artifacts cleaned up before commit.

**Guardrails honored:** Response contracts of the 4 status tools are byte-identical (wrappers reshape RPC output). Only additive surface changes: 1 new optional param on 4 existing tools + 1 new read tool. `get_phases`/`get_tasks`/`get_gates` untouched. `get_action_cards`/`get_build_summary` gain a defensive filter with no observable change (all valid rows satisfy it after backfill). `open_items` written only via the idempotent migration-013 insert (precedent: migration 012). `create_client`/`update_client` untouched. `daily-financial-sync`, `open-brain-mcp`, other Edge Functions untouched.

**Post-deploy verification (Louis, Rule 18):** reload NR HQ connector to pick up the new `actor` param + `get_recent_audit_log`, confirm 18 tools in a fresh Claude Chat, fire one `update_task_status` with `actor='chat'`, call `get_recent_audit_log` to confirm the row lands with the expected shape. Run the MCP smoke test with the 1Password-sourced `MCP_ACCESS_KEY` — all 17 logical tests should pass. Inspect the new rows in Supabase → Database → `build_action_log` (6 new columns; 36 historical rows carry `entry_kind='card_snapshot'`).

---

## Session 2026-04-20 — SS Phase 1 Task 1.0 Spike (vertical-slice validation)

End-to-end spike validating AI SDK 6 + Anthropic (Claude Sonnet 4.6) + Supabase for the Thumper conversational assistant. Shipped to `sparkle-suite.vercel.app`; closed out in commit `8c8ea32`. **Superseded in Task 1.1 (2026-04-26)**: spike route + UI deleted; production replacement at `/thumper` and `/api/thumper/*`. Tools (`list_my_trade_board`, `remove_listing`) carried over unchanged so `approval_events` replay ledger stays valid. The benchmark infra (`spike/run-benchmark.ts`, `spike/prompts.json`) is preserved and now points at `/api/thumper`.

**Original surface area (now removed):**
- `app/api/thumper/spike/route.ts` + `/conversation/[conversationId]` + `/me` (deleted in Task 1.1).
- `app/spike/{page.tsx, _client.tsx}` (deleted in Task 1.1).

**Library carry-over:** `lib/thumper/{auth,persistence,tools/*}.ts` and `lib/services/trade-board.ts` — reused as-is by the production route.

**Deliverables / artifacts:** `SS_Phase1_Spike_Findings_v1.0.md` (preflight → Step 10 red-team + benchmark findings + deploy URL + rollback plan).

**Dependencies added:** `ai@^6.0.168`, `@ai-sdk/anthropic@^3.0.71`, `@ai-sdk/react@^3.0.170`.

---

## Session 2026-04-26 — SS Phase 1 Task 1.1 (Promote spike to production)

Promoted the Task 1.0 spike into the production `/thumper` route. Real ~3600-token system prompt replaces the cache-padding placeholder. Claude Design handoff UI ported as 14 atomic components. Two structural subsystems laid in: **Guardian** (telemetry / health) and **Enforcer** (audit). Spike route + UI deleted.

**New surface area:**
- `app/api/thumper/route.ts` — production POST route. Augments the spike pattern with: `runId` correlation header (`x-thumper-run-id`), tool-execution telemetry via `withTelemetry()` HOF wrapping `tool.execute`, `trade_action_audit` write on `remove_listing` post-approval, `logIncident()` on unhandled errors. Uses `THUMPER_SYSTEM_PROMPT` directly (no padded variant).
- `app/api/thumper/{conversation/[conversationId], me}/route.ts` — ports verbatim from spike.
- `app/api/thumper/health/route.ts` — public health probe (`api_reachable`, `db_reachable`, `recent_error_rate` over last 15 min, `timestamp`). In-memory rate limit (60 req/min per IP).
- `app/thumper/{page.tsx, _client.tsx, _shell.module.css, thumper-tokens.css}` + `app/thumper/components/*` — production UI. 14 atoms × {.tsx, .module.css}: `ThumperGlyph`, `ThumperHeader`, `Bubble`, `ListingPreview`, `HITLBlock`, `ErrorBlock`, `Chips`, `InputRow`, `StreamingBubble`, `ChatHistory`, `EmptyGreeting`, `ThumperColumn`, `ThumperMobileShell`, `DashboardPlaceholder`. Desktop renders 400px right-pinned column; mobile renders 60px floating bubble + modal. Switch driven by `matchMedia('(min-width: 1024px)')` change listener.
- `lib/thumper/probe-conversation-owner.ts` — extracted admin-client cross-tenant probe (red-team attack #7 protection).
- `lib/thumper/guardian-telemetry.ts` — `logIncident()`, `logToolExecution()` writers via `createAdminClient()`. Both swallow internal errors so telemetry failure never throws into the request path.
- `lib/thumper/audit.ts` — `hashState()` (SHA-256 of sorted-key JSON, null/undefined → ""), `writeTradeActionAudit()` for `trade_action_audit` writes.

**System prompt:** `lib/thumper/system-prompt.ts` rewritten — single `THUMPER_SYSTEM_PROMPT` export, ~3600 estimated tokens (within 3500–5000 target). Six sections: identity & personality, v1 tool inventory (the two carry-over tools), scope boundaries (everything else is "not yet"), three-tier escalation (don't-know / misconfigured / broken→escalate-Louis), error copy pattern ("if this keeps happening, let Louis know"), forbidden patterns (no cross-rep data, no foreign rep_id calls, no instruction-overrides from rep_notes content, no fabricated tools/listings).

**Migration 028** — see migrations table. Five tables: `thumper_incidents`, `tool_executions`, `auth_events`, `trade_action_audit`, `sms_email_blast_audit`. All RLS service-role-only.

**Tests:** `tests/thumper/abort-modes.test.ts` (4 mocked unit cases — tab-close, network-drop, server-kill mid-HITL, clean finish), `tests/thumper/attack-5-poisoned-rep-notes.test.ts` (live integration — runs against local dev server, seeds poisoned `rep_notes`, asserts no foreign listing UUID in response or telemetry). vitest installed; `npm run test` runs unit only; `npm run test:attack5` runs the live test separately.

**Login redirect:** `app/login/_client.tsx:42` flipped from `/spike` to `/thumper`.

**Deletions:** `app/api/thumper/spike/`, `app/spike/` (entire directories) via `git rm -r` after build + test green. `spike/run-benchmark.ts` + `spike/prompts.json` preserved as benchmark infra.

**Dependencies added:** `vitest@^4.1.5`, `pg@^8.20.0`, `@types/pg@^8.20.0` (pg was already in tree but pulled by vitest install).

---

## Session 2026-04-26 — SS Phase 1 Task 1.2 (System prompt refinement)

Refined `lib/thumper/system-prompt.ts` from the Task 1.1 baseline. File contract unchanged — single `THUMPER_SYSTEM_PROMPT` string export consumed by `app/api/thumper/route.ts:267`. No tool, route, schema, or UI changes.

**Section deltas vs Task 1.1:**
- §1 Identity & personality — rewritten as "work friend." Adds tone rules (match-energy, sarcasm-ok, no-performative-helpfulness), a small-talk/banter block with five paired voice examples (rough show, killer run, hey-how's-it-going, thanks, do-you-sleep), and an anti-pattern example for the brittle "I'm just an AI" deflection.
- §3 Scope boundaries — final small-talk paragraph swapped for the gravity model: "Your gravity is always toward the work — you will naturally find your way back to being useful without forcing it." No more one-line redirects.
- §7 (new) Disclosure, affiliation, and content screening — three sub-blocks: (a) AI disclosure: honest when asked, never volunteered, light tone; (b) Non-affiliation: Sparkle Suite/Thumper are Neon Rabbit, not Bomb Party — stated only when asked or when confusion is apparent; (c) Content screening: refuses to ghostwrite MLM-coded recruiting copy ("passive income," "be your own boss," "ground floor," "this business sells itself," income testimonials/projections), reframes toward honest descriptions instead — does NOT restrict normal business conversation.
- §§2, 4, 5, 6 — unchanged.

**Token budget:** still inside the 3500–5000 cache-friendly window (Haiku 4.5 minimum cacheable prefix is comfortably exceeded; no TEST_PAD needed).

**Verification:** `npm test` (vitest) → 4/4 pass on `tests/thumper/abort-modes.test.ts`. No new tests added — the prompt is a string, not behavior; behavioral coverage comes from the existing red-team integration suite. tsc on the file produces no errors.

---

## Session 2026-04-21 to 2026-04-25 — Memory Index Compiler

The Memory Index compiler at `app/api/compile-memory-index/route.ts` synthesizes Louis's tagged thought corpus (`thoughts` table) into structured memory pages (`memory_index_pages`) under the v1.2 Editorial Policy. It runs as a Vercel Node-runtime route (`maxDuration = 300`) with a Postgres lease lock, audit ledger, and atomic DELETE-ALL + INSERT writes via the `compile_memory_index_pages` RPC.

**Architecture (v1.2 §0.1 per-page-type pass):**
- 7 sequential LLM calls per compile, one per `page_type` (`project`, `person`, `decision`, `rule`, `concept`, `open_question`, `index`).
- Each pass loads the FULL tagged corpus (no calendar window) and filters client-side to the slice relevant to that page type.
- Each pass sees only metadata from existing `memory_index_pages` of its type — `body_markdown` is never read back (R10, 2026-04-23 CEO call).
- The `index` pass is always last; it synthesizes a map page from the buffered metadata of passes 1–6 only (no corpus).
- Pages are buffered across all 7 passes; written in a single atomic call after pass 7. If zero pages were produced the write is aborted (avoids wiping the prior compile).

**Provider abstraction:** the entire LLM API contract lives inside one async function `callLLMForPass(systemPrompt, userPrompt, maxOutputTokens)`. Swapping providers means editing only this function. As of 2026-04-25 the compiler calls **Google Gemini 2.5 Flash** via plain `fetch` against `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` with `responseMimeType: 'application/json'`. Token counts come from `usageMetadata.promptTokenCount` / `candidatesTokenCount` on every response — there is no separate count-tokens call. Pricing constants are `GEMINI_INPUT_USD_PER_MTOK = 0.30` and `GEMINI_OUTPUT_USD_PER_MTOK = 2.50`. The `$10` cumulative spend ceiling carries over from the prior Anthropic implementation. `MAX_OUTPUT_TOKENS_PER_PASS = 8192` (raised from the prior 3000 — Gemini Flash throughput easily fits 7 × 8192 within Vercel's 300s cap, and at 3000 six of seven passes hit `finish_reason=MAX_TOKENS` with the current 700-capture corpus).

**Modes:** request body fields `validate_only` (heuristic token estimate per pass, no LLM call, no writes), `dry_run` (full LLM compile but skip the atomic write), and the default real compile.

**Auth:** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` OR `X-Compile-Secret: <MEMORY_INDEX_COMPILE_SECRET>` (timing-safe).

**Editorial Policy is embedded** as a string constant + SHA-256 hash in `app/api/compile-memory-index/policy.ts`, generated from a markdown source via `scripts/build-memory-index-policy.mjs`. Cannot be read from disk at runtime in Vercel.

**Migration 024** (`memory_index_pages`, `memory_index_compile_runs`, `compile_memory_index_pages` RPC, lease-lock RPCs, `mark_compile_pending` / `consume_compile_pending`) — see migrations table.

**Manual trigger only.** Migration 025's Postgres trigger remains unattached pending the 3-day cost pilot.

---

## Session 2026-04-26 — SS Phase 1 Task 1.3 (Thumper conversation UI polish + image input)

Polished the Task 1.1 Thumper UI (no rebuild) and added camera + gallery image input. The system prompt (Task 1.2), API route, auth, telemetry, and persistence schema are unchanged. No new Supabase tables or RLS edits.

**Auto-scroll fix.** `app/thumper/components/ChatHistory.tsx` now uses a `ResizeObserver` on the inner content node + a scroll listener that updates a `stickToBottomRef`. Each chunk during streaming triggers the observer; the scroll position only snaps to bottom when the user is within 100px of the edge. The previous `scrollKey`-on-effect path didn't fire on streaming chunks. Manual scroll-up is respected.

**Markdown rendering.** `app/thumper/components/Markdown.tsx` — pure-React, zero-dep parser handling `**bold**`, `*italic*`, `[label](url)`, bare URLs, `- ` / `* ` bullet lists, and `\d+. ` numbered lists. Single chokepoint `isSafeUrl()` allowlists `http:`, `https:`, `mailto:` only — `javascript:`, `data:`, `vbscript:`, `file:`, relative paths, and whitespace-padded variants render as inert text. Verified at `Markdown.tsx:11`. Markdown is applied only to completed assistant bubbles; streaming text stays raw to avoid mid-token flicker.

**Timestamps.** `app/thumper/components/RelativeTime.tsx` renders "just now" / "Nm ago" / "Nh ago" / locale clock with a 30s `setInterval` refresh. `lib/thumper/persistence.ts:loadCanonicalHistory` merges `created_at` into a `metadata` field on each returned UIMessage (forward-compat spread guards a possible future `metadata` column). Optimistic local timestamps are stamped at submit time via a sentinel that resolves onto the latest user message id once `messages` updates.

**Image input.** Two icon buttons left of the textarea in `InputRow.tsx`:
- Camera: `<input type=file accept=image/* capture=environment>` — opens device camera on mobile, file picker on desktop.
- Gallery: `<input type=file accept=image/* multiple>` — multi-select for bulk uploads.

Selected files run through `lib/thumper/image-compress.ts` (canvas-based resize to ≤1024px longest edge, JPEG quality 0.8, EXIF stripped via re-encode). Each compressed image becomes an `InputAttachment { id, dataUrl, mediaType: 'image/jpeg' }` rendered as a thumbnail row above the textarea with per-thumb X-remove. Hidden file inputs reset `value=''` after each selection so re-picking the same file fires `onChange`. Cap is 10 attachments per message; overflow shows an inline notice ("Kept first N — max 10 per message"). Per-file compression failures are caught individually — the failing file is dropped with a notice, the rest of the batch sends.

**Canonical wire shape — `FileUIPart` with data URL.** End-to-end the same shape: `{ type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,...' }`. Sent via `useChat.sendMessage({ text, files: FileUIPart[] })` (AI SDK v6 supports this directly — verified at `node_modules/ai/dist/index.d.ts:3805`). The existing `convertToModelMessages(messages)` in `app/api/thumper/route.ts:264` maps these to Anthropic vision content blocks with no route changes. `parts` columns store JSON, so reload round-trips the images cleanly. User bubbles render images by filtering `parts` on `type === 'file' && mediaType.startsWith('image/')` (mediaType filter is the gate, not just type).

**Inline retry on failed sends.** `_client.tsx` keeps a `failedMessages: Map<messageId, { parts }>`. When `useChat.status` flips to `'error'` the most-recent unanswered user message is captured. The inline retry button calls `sendMessage` again with the original `parts` and the same `messageId`, which the SDK treats as a replace (per `sendMessage` overload signature) — so retries don't duplicate the failed user message. Retry works for image-bearing messages because parts (not stale attachment state) are stored.

**New conversation.** Header "New" button (`ThumperHeader.tsx`) rotates the conversationId, replaces the `?c=` URL param, and explicitly clears parent-owned state (draft, attachments, attachmentNotice, failedMessages — via `key={conversationId}` re-mount on `ChatBody`). Disabled while streaming or while an HITL approval is pending — gated at both the button and the handler.

**Desktop minimize.** `desktopOpen` state in `ThumperClient`. The existing close button on the desktop column (now labeled "Minimize Thumper") collapses the column. A floating accent-pill button at bottom-right re-opens. Window keydown listener triggers minimize on Escape (skipped while typing in textarea/input or while HITL is pending). Reserved 400px right padding on the dashboard root is removed via `_shell.module.css:.rootMinimized` while collapsed.

**Empty/Loading states.**
- Empty: `EmptyGreeting.tsx` copy refreshed to "Hey, I'm Thumper. What's on your mind?" matching the Task 1.2 personality.
- Loading: existing `_shell.module.css:.loading` text is shown until conversation history loads.

**Files added (3):**
- `app/thumper/components/Markdown.tsx`
- `app/thumper/components/RelativeTime.tsx`
- `lib/thumper/image-compress.ts`

**Files modified:**
- `app/thumper/_client.tsx` — full orchestration: attachments state, optimistic timestamps, retry map, sendWithParts helper, escape-to-minimize, focus-after-streaming, new-conversation handler with state cleanup.
- `app/thumper/_shell.module.css` — `.rootMinimized` + `.desktopReopen` (floating pill button).
- `app/thumper/components/ChatHistory.tsx` — ResizeObserver path; `scrollKey` prop removed.
- `app/thumper/components/Bubble.tsx` — accepts `text`, `images`, `timestamp`, `renderMarkdown`; renders image grid + RelativeTime + Markdown.
- `app/thumper/components/Bubble.module.css` — `.timestamp`, `.imageGrid`, `.imageThumb`, `.mdRoot` selectors (using `:global(...)` to reach Markdown class names).
- `app/thumper/components/InputRow.tsx` — `forwardRef` for parent focus; new `attachments`, `onPickFiles`, `onRemoveAttachment`, `attachmentNotice`, `isStreaming` props; thumb row + camera/gallery icons; image-only submit allowed.
- `app/thumper/components/InputRow.module.css` — `.iconBtn`, `.thumbRow`, `.thumb`, `.thumbRemove`, `.hiddenFile`; mobile media query bumps tap targets to 44px.
- `app/thumper/components/StreamingBubble.tsx` + `.module.css` — `timestamp` passthrough + `.col` wrapper.
- `app/thumper/components/ErrorBlock.tsx` + `.module.css` — `variant: 'global' | 'inline'`; inline collapses to compact right-aligned form near the failed user message.
- `app/thumper/components/ThumperHeader.tsx` + `.module.css` — `onNewConversation`, `newConversationDisabled`, `closeLabel` props; `.newBtn` styles; `.actions` wrapper.
- `app/thumper/components/ThumperColumn.tsx` — forwards `onNewConversation` + `newConversationDisabled` to header; passes desktop/mobile-aware `closeLabel`.
- `app/thumper/components/EmptyGreeting.tsx` — copy refresh.
- `lib/thumper/persistence.ts` — `loadCanonicalHistory` merges `created_at` into UIMessage `metadata`.

**Files NOT touched (per task guardrails):** `lib/thumper/system-prompt.ts`, RLS policies, Supabase migrations, auth flow, `app/api/thumper/route.ts` logic.

**Verification (2026-04-26):**
- `npx tsc --noEmit` — clean for app/lib (only pre-existing `tests/thumper/attack-5-poisoned-rep-notes.test.ts` errors remain — unrelated).
- `npm test` — 4/4 abort-modes pass.
- Dev server compiles on every save; desktop column renders with both new "New conversation" + "Minimize Thumper" buttons; Escape minimizes; reopen pill restores.
- URL allowlist sanity: `javascript:`, `data:`, `vbscript:`, `file:`, relative paths, empty, and whitespace-padded `javascript:` all reject; only `http:`/`https:`/`mailto:` accept.
- Live-rep verification (auto-scroll during streaming, image upload + vision round-trip, inline retry with images, mobile keyboard behavior, reload-image-persistence) requires a signed-in test rep — local session was expired during the build, so Louis to run those steps before push approval per the task self-audit checklist.

---

## Session 2026-04-26 — SS Phase 1 Task 1.3 Follow-Up (cross-device sync + auto-scroll fix)

Two issues from Louis's live testing of the Task 1.3 build:

**1. Cross-device conversation sync.** Each device tracked its own conversationId via URL `?c=` + `localStorage`, so a conversation started on mobile didn't appear on desktop. Reps using mobile to photograph items during shows and desktop to manage the trade board need both surfaces to land on the same active conversation by default.

New init priority: `URL ?c= → GET /api/thumper/conversation/latest → fresh UUID`. localStorage drops out of the read chain (still written for cache); DB is the source of truth. Three-state error handling — 401 advances to placeholder UUID and lets the existing history-load surface the auth error; 5xx/network shows a retry UI and refuses to fabricate a fresh UUID (the silent "fork to new conversation" was exactly the cross-device drift bug being fixed). AbortController cancels the in-flight `/latest` fetch on unmount. RLS policy `thumper_conv_own_data` ([020_thumper_conversations.sql:36](supabase/migrations/020_thumper_conversations.sql#L36)) is `FOR ALL` and already covers the new SELECT — no migration needed.

Edge case (intentional): if a rep clicks "New conversation" but never sends a message, no row exists in `thumper_conversations` — the other device loads the previous conversation. Empty conversations don't sync.

**2. Hybrid auto-scroll.** First follow-up attempt used `scrollTo({ behavior: 'smooth' })` on every ResizeObserver tick. That broke streaming visually: smooth animations take ~300ms, tokens arrive every ~50-100ms, the viewport never caught up, and the chat appeared to "expand off-screen" until streaming finished and the final paint snapped into view.

Final approach uses a gap heuristic. RO fires within `STREAMING_GAP_MS` (200ms) of each other → instant scroll (`scrollTop = scrollHeight`); the viewport stays pinned to bottom every tick. Quiet-then-fire (>200ms gap) → smooth scroll, for discrete events: new user message, streaming-complete repaint, history load. `lastFireTime` is seeded with `performance.now()` at mount so the first RO fire after content populates is treated as a tight follow-up — initial load stays instant. A simple `setTimeout` guard suppresses the scroll listener during the smooth animation so mid-animation scroll events don't flip stickiness off; instant scrolls don't need the guard because they leave `scrollTop` exactly at `scrollHeight`. Manual scroll-up still disengages stickiness within 100px.

**Files added (1):**
- `app/api/thumper/conversation/latest/route.ts` — GET handler returning `{ conversationId: string | null }` for the authenticated rep's most recent message; 401 on unauthenticated.

**Files modified:**
- `lib/thumper/persistence.ts` — `getLatestConversationId(supabase, repId)` with deterministic `(created_at desc, id desc)` sort + comment explaining `thumper_conversations` is per-message despite the name.
- `app/thumper/_client.tsx` — init `useEffect` rewritten: AbortController, three-state branching (`200+id` / `200+null` / `401` / `5xx-network`), `initResolveError` + `resolveAttempt` state for retry; chatContent ternary renders the retry button when `/latest` fails.
- `app/thumper/_shell.module.css` — `.retryLink` inline-button style.
- `app/thumper/components/ChatHistory.tsx` — hybrid scroll: instant during streaming bursts, smooth on discrete events; `setTimeout` guard during smooth animations; `prefers-reduced-motion` falls back to instant.

**Files NOT touched:** system prompt, API route, persistence write paths, auth flow, RLS, migrations.

**Verification (2026-04-26):**
- `npm test` — 4/4 abort-modes pass.
- `GET /api/thumper/conversation/latest` returns `401 {"error":"unauthenticated"}` when signed out (smoke test in browser preview).
- Init effect 401 path renders "Not signed in — visit /login and come back." with a clean `/thumper` URL (no fake `?c=` written) — confirmed in browser.
- Authenticated cross-device sync, three-state retry UI, smooth-vs-instant scroll behavior during real streaming, and `prefers-reduced-motion` fallback require a signed-in session — Louis to run the live verification steps before push approval.

---

## Session 2026-04-27 — SS Phase 1 Task 1.4 (Thumper tool registry + 3-tier error handling)

Infrastructure refactor — no new tools, no behavior changes for tools that ran before. Makes adding the next ~28 tools (Tasks 1.5-1.8) mechanical.

**Tool registry pattern.** `lib/thumper/tools/index.ts` exposes `buildAllTools(ctx)` that takes `ToolContext = { repId, supabase, conversationId, runId }` and returns an AI SDK `ToolSet`. Each tool file exports a `ToolDefinition` (`name`, `readOnly`, `build(ctx) => Tool`) and is registered by pushing into a single `REGISTRY` array. Adding tool #3+ = create the file, push the def, done — no `route.ts` edits. Duplicate-name guard runs at build time and throws loudly. A post-wrap assertion confirms `needsApproval` survived both wrappers (HITL silently breaking is the worst-case bug class).

**Three-tier error handling** ([lib/thumper/tools/wrappers/with-error-handling.ts](lib/thumper/tools/wrappers/with-error-handling.ts)):
- **Tier 1 — RETRY (read-only tools only).** Transient errors (`ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed|socket hang up|408|429|502|503|504`) get one 500ms-backoff retry. **Mutation tools (`readOnly: false`) skip Tier 1 entirely** to avoid double-applying side effects (the original adversarial-review fix #2). Retry-then-fail falls into Tier 3.
- **Tier 2 — EXPLAIN (`instanceof ThumperToolError`).** Returns `{ ok: false, errorTier: 'explain', code, message }` to the SDK; the model sees a tool result and explains in plain language. No incident written. Each tool translates its own service-layer errors → `ThumperToolError` inside `execute` (services in `lib/services/*` stay untouched per repo convention). Helper pattern: `explainTradeBoardError(err)` in both tool files maps `LISTING_NOT_FOUND` / `UNAUTHORIZED` / `INVALID_INPUT` to friendly text.
- **Tier 3 — ESCALATE.** Best-effort `logIncident({ errorType: 'tool_unhandled', ... })` then returns the friendly "I've flagged this for the Neon Rabbit team" message.

**Composition order** is load-bearing: `withErrorHandling( { name, ctx, readOnly }, withTelemetry(name, ctx, raw) )`. Telemetry is the INNER wrapper so it sees the raw `execute()` outcome — if the underlying call throws, telemetry logs `success=false`, then re-throws so error-handling can decide tier. If telemetry lived OUTSIDE error-handling, Tier 2/3 friendly returns would silently look like successes in `tool_executions`. Documented in both wrapper file headers.

**Stream lifecycle behavior change** (intentional, documented in `with-error-handling.ts` header): previously, an unhandled tool throw propagated to streamText, fired `onError`, and the route's persistence path treated the assistant message as aborted. Now Tier 2/3 errors return structured values, the model continues, `onFinish` fires, the assistant message COMPLETES with the model's explanation. True fatal errors (auth wrapper crash, errors in the wrapper itself) still throw past us and trigger `onError` — abort path preserved for those.

**Failure isolation** (Codex review fixes #6 + #8): `logToolExecution`, `logIncident`, and `writeTradeActionAudit` already swallow internal errors at the helper level. Each call site adds a defensive outer try/catch — the contract is explicit at the wrapper/tool level even if today's helpers can't actually throw. **Audit failure must never reverse a successful mutation:** `remove_listing.execute` runs the audit write inside its own try/catch and returns the successful tool result regardless of audit fate. Best-effort `logIncident({ errorType: 'audit_write_failed' })` on audit failure.

**Telemetry semantics under retry** (documented in `with-telemetry.ts` header): a Tier 1 retry on a read-only tool produces TWO `tool_executions` rows — one `success=false` (initial transient failure) and one `success=true` (retry success). The table reflects what actually happened; success-rate dashboards should account for it.

**Files added (5):**
- `lib/thumper/errors.ts` — `ThumperToolError` base class (`code` + `userMessage` + `cause`).
- `lib/thumper/tools/types.ts` — `ToolContext`, `ToolDefinition`.
- `lib/thumper/tools/wrappers/with-telemetry.ts` — moved from inline route wrapper; inner-wrapper composition; defensive try/catch around `logToolExecution`.
- `lib/thumper/tools/wrappers/with-error-handling.ts` — 3-tier wrapper; readOnly-gated retry; `ThumperToolError` Tier 2 detection; defensive try/catch around `logIncident`.
- `lib/thumper/tools/index.ts` — barrel + `buildAllTools(ctx)` + duplicate-name guard + post-wrap `needsApproval` assertion.

**Files modified:**
- `lib/thumper/tools/list-my-trade-board.ts` — exports `listMyTradeBoardTool: ToolDefinition` (`readOnly: true`); execute wraps the service call to translate `TradeBoardError` → `ThumperToolError`.
- `lib/thumper/tools/remove-listing.ts` — exports `removeListingTool: ToolDefinition` (`readOnly: false`, factory accepts `conversationId` + `runId`); owns its own `trade_action_audit` write (lifted from route wrapper, behavior identical) wrapped in audit-failure isolation; translates `TradeBoardError` → `ThumperToolError`.
- `app/api/thumper/route.ts` — deleted inline `withTelemetry` (~70 lines) + `AnyTool` union + per-tool factory imports + special-case `trade_action_audit` write. Tools literal replaced with `const tools = buildAllTools({ repId, supabase, conversationId, runId })`. All other route logic untouched (auth, ownership probe, approval replay, streaming, `onError`, `onFinish`, persistence reserve/checkpoint/complete).

**Files NOT touched (per task guardrails):** system prompt, persistence, HITL/approval flow, streaming, cross-device sync, `lib/services/*` (TradeBoardError stays as-is — translation lives in the tool execute).

**Verification (2026-04-27):**
- `npx tsc --noEmit` — clean for changed files (only pre-existing `tests/thumper/attack-5-poisoned-rep-notes.test.ts` errors remain — unrelated, Supabase generated-types issue).
- `npm test` — 4/4 abort-modes pass.
- Throwaway `scripts/verify-task-1-4-wrappers.ts` (deleted post-run) — 13/13 PASS covering: `needsApproval` survives both wrappers; Tier 2 returns explain shape with code+message preserved; Tier 3 returns escalate shape with friendly message; Tier 1 retries read-only tools; Tier 1 SKIPS write tools (single attempt → escalate); duplicate-name guard accepts the real registry. Bonus: live evidence of fix #6 — wrappers continued correctly while telemetry/incident writes failed against a fake Supabase URL (ECONNREFUSED).
- `grep -nE "makeListMyTradeBoardTool|makeRemoveListingTool|withTelemetry" app/api/thumper/route.ts` → no matches (route is registry-only).
- Dev server boots clean (`Ready in 1175ms`); `POST /api/thumper` (unauthenticated) returns `401 {"error":"unauthenticated"}` — proves the registry compiles and the route loads.
- Authenticated runtime verification (UI-driven HITL approval card, real `tool_executions` / `trade_action_audit` / `thumper_incidents` rows, end-to-end Tier 2 conversational explain, end-to-end Tier 3 incident escalation + assistant-message-completes) — Louis to run the live steps (plan verification items 3-6, 8) before push approval. Failure-injection items (9-12) are documented and would each require a temporary code change + revert; recommend covering by routine review rather than one-shot synthetic injection.

---

## Session 2026-04-27 — SS Phase 1 Task 1.5A (Shared Service Layer Foundation)

The "kitchen" — both Thumper (waiter 1) and the future dashboard (waiter 2) send orders here. Neither interface owns business logic; all rules live in `lib/services/`. This task **extended** the existing `lib/services/trade-board.ts` (which had `getMyBoard` + `removeListing` + `TradeBoardError`) into a complete service layer covering trade board, trade requests, fulfillment, and the shared jewelry database — without changing any of the existing 4 callers (`lib/thumper/tools/list-my-trade-board.ts:9`, `lib/thumper/tools/remove-listing.ts:9`, `scripts/verify-trade-board.ts:65`, `scripts/red-team.ts:14`).

**Files added (5):**
- [lib/services/types.ts](lib/services/types.ts) — single source of truth for shared types: 6 Postgres-mirrored enum unions (ListingStatus, TradeRequestStatus, FulfillmentStatus, JewelryType, RemovalReason, RejectionReason) + every public function's I/O interface. `trade-board.ts` imports its legacy types (`GetMyBoardFilters`, `BoardResult`, `RemoveListingResult`, `TradeListingWithDesign`) from here and re-exports them so the existing module path is unchanged. No imports flow back into types.ts (no circular).
- [lib/services/errors.ts](lib/services/errors.ts) — `ServiceError` (canonical, `code` + `message` + `userMessage` + `statusCode`) and `TradeBoardError` as an empty subclass for backward compat (existing tool handlers' `instanceof TradeBoardError` checks still work). `errors` factory exposes 14 stable codes: MISSING_ITEM_INPUT, MISSING_PIECE_PHOTO, CLICKWRAP_REQUIRED, LISTING_NOT_FOUND, DUPLICATE_LISTING, REQUEST_NOT_PENDING, REQUEST_ALREADY_EXISTS (statusCode 409), INVALID_STATUS_TRANSITION, AMBIGUOUS_CUSTOMER, FULFILLMENT_NOT_FOUND, UNAUTHORIZED (403), INVALID_INPUT, NEEDS_COLLECTION, NEEDS_FULL_INFO. **No `LISTING_NOT_AVAILABLE`** — that case folds into `LISTING_NOT_FOUND` to keep the catalog consistent.
- [lib/services/trade-requests.ts](lib/services/trade-requests.ts) — `submitTradeRequest` (svc client, calls `rpc_submit_trade_request`), `getTradeRequests` (auth, default `statusFilter='pending'`), `approveTrade` (svc, validates request ownership via repId before RPC, calls `rpc_approve_trade`), `rejectTrade` (svc, same shape), `getTradeHistory` (**auth client** — pure rep-scoped read; cross-rep aggregation is explicitly NOT done here). RPC error mapping helper `rpcError()` translates `LISTING_NOT_FOUND`/`REQUEST_ALREADY_EXISTS`/`REQUEST_NOT_FOUND`/`REQUEST_NOT_PENDING` raises plus Postgres `23505` (partial-unique-index collision) into ServiceError instances.
- [lib/services/trade-fulfillment.ts](lib/services/trade-fulfillment.ts) — `updateFulfillmentStatus` (auth) accepts `{ requestId | customerName, nextStatus, shippingNotes?, addToBoard? }`. Status progression is **forward-only**: approved→shipped→completed (any other transition throws `INVALID_STATUS_TRANSITION`). Same-status is a no-op accepted. Customer-name lookup multi-match throws `AMBIGUOUS_CUSTOMER`. On `completed` with `addToBoard=true`, returns `shouldPromptAddToBoard: true` — no automatic re-listing in this layer. `getFulfillmentQueue` returns non-completed fulfillments ordered by `status_updated_at ASC` with derived `daysSinceLastUpdate`.
- [lib/services/jewelry-database.ts](lib/services/jewelry-database.ts) — `resolveItemNumber` (accepts either client) returns `{ found: false } | { found: true, design, hasCollection }`. `searchJewelryDatabase` (svc, attempts `.textSearch` first then ILIKE fallback against `design_name|material|main_stone|item_number`; ILIKE pattern escapes `%`/`_`) attaches `isOnMyBoard` (rep-scoped) and `activeListingsCount` (cross-rep aggregate — the reason for the service client). `createDesign` (svc) — collection lookup is **by `name` only** (the `collections` schema has no `type_prefix` column); auto-creates the collection if not found. Type prefix derived from `itemNumber.slice(0,2)` and validated against the `JewelryType` set. `updateCanonicalPhoto` (svc) — admin-only UPDATE on `jewelry_designs`.
- [lib/services/index.ts](lib/services/index.ts) — public barrel. Both Thumper tools and dashboard routes can `import { ... } from '@/lib/services'`.

**Files modified (1):**
- [lib/services/trade-board.ts](lib/services/trade-board.ts) — facade. Imports types from `./types` and `TradeBoardError` from `./errors`; re-exports them under the same names for the existing 4 callers. Adds `addListing` (svc, validates clickwrap + duplicate, increments `jewelry_designs.times_listed` via fetch-then-update, throws `NEEDS_FULL_INFO`/`NEEDS_COLLECTION` for the 2 fallback cases), `addListingBatch` (svc, single `IN(item_numbers)` query, sorts into ready/needCollection/needFullInfo buckets, batched INSERT for ready items, skips intra-rep duplicates), `updateListing` (auth, partial update; rejects edits when status not in `available|pending_trade`; `useCanonicalPhoto=true` clears `listing_photo_url` and sets `uses_canonical_photo=true`).

**Compatibility decisions documented in code:**
1. `getMyBoard.summary.pendingRequestCount` preserves current shipped behavior (counts only the collection-filtered listing set, not the rep's whole board) — divergence-from-spec accepted for Task 1.5A. Marked `// TODO(SS-spec-alignment)` in [lib/services/trade-board.ts](lib/services/trade-board.ts).
2. `removeListing(itemNumber)` selection logic (most-recent non-removed by `created_at DESC limit 1`) is intentionally ambiguous when a rep has multiple active listings for the same design — `scripts/verify-trade-board.ts:125` explicitly avoids asserting which row gets hit. Marked `// COMPAT:` in the function body so future readers don't refactor it into a "clean rule."
3. `removeListing`'s auto-cancel of the pending `trade_request` runs on the auth client because [supabase/migrations/020_thumper_conversations.sql:84](supabase/migrations/020_thumper_conversations.sql#L84) added the `requests_rep_update` policy specifically for this — named in the file-header comment so future maintainers don't generalize from older schema and unnecessarily move request writes to the service client.

**Client choice per function** (REQUIRED = current RLS or auth status forces; CHOSEN = simplicity/consistency call):
| Function | Client | Why |
|---|---|---|
| `getMyBoard`, `removeListing`, `updateListing` | auth | REQUIRED — rep-scoped RLS |
| `addListing`, `addListingBatch` | svc | REQUIRED — `jewelry_designs.times_listed` UPDATE is admin-only; both validate `repId` in body |
| `submitTradeRequest` | svc | REQUIRED — customer unauthenticated |
| `approveTrade`, `rejectTrade` | svc | CHOSEN — RPCs are SECURITY DEFINER so auth would also work; svc kept for uniform error mapping |
| `getTradeRequests`, `getFulfillmentQueue`, `updateFulfillmentStatus` | auth | REQUIRED — rep RLS via `requests_rep_read` / `fulfillment_own_data` |
| `getTradeHistory` | auth | REQUIRED, **explicitly not service** — pure rep-scoped read |
| `searchJewelryDatabase` | svc | REQUIRED for cross-rep `activeListingsCount` aggregate; validates `repId` for `isOnMyBoard` |
| `resolveItemNumber` | auth (or svc) | `designs_read_all` covers auth; svc accepted for callers that already hold one |
| `createDesign`, `updateCanonicalPhoto` | svc | REQUIRED — admin-only INSERT/UPDATE on `jewelry_designs` |

**No new migrations** — `rpc_submit_trade_request`, `rpc_approve_trade`, `rpc_reject_trade`, `idx_one_pending_request_per_listing`, and `idx_designs_fulltext` (GIN over `coalesce(design_name,'')||' '||coalesce(material,'')||' '||coalesce(main_stone,'')`) all pre-exist in migration 006.

**Files NOT touched (per task guardrails):** `app/api/thumper/route.ts`, `lib/thumper/tools/index.ts` (registry/buildAllTools), `lib/thumper/tools/wrappers/*`, `lib/thumper/auth.ts`, `lib/thumper/persistence.ts`, the system prompt, all UI, the 4 existing callers of `@/lib/services/trade-board`, all migrations.

**Verification (2026-04-27):**
- `npx tsc --noEmit` — clean across `lib/services/**`, `lib/thumper/tools/**`, `scripts/verify-trade-board.ts`. Only pre-existing `tests/thumper/attack-5-poisoned-rep-notes.test.ts` errors remain (unrelated, accepted per plan).
- `git diff --stat lib/thumper/tools/list-my-trade-board.ts lib/thumper/tools/remove-listing.ts scripts/verify-trade-board.ts scripts/red-team.ts` → empty. Existing callers unchanged.
- `npm test` — 4/4 abort-modes pass. Confirms no regression on the existing `instanceof TradeBoardError` path.
- Throwaway `scripts/check-services-barrel.ts` (deleted post-run) — referenced every named export from `@/lib/services` and compiled clean. Confirms no missing/misnamed re-exports.
- End-to-end live runtime verification (`npx tsx scripts/verify-trade-board.ts` against cloud Supabase, plus exercising the new functions through any tool that wires them up) — deferred to Task 1.5B+ which will land tool handlers that call into these new functions.

---

## Session 2026-04-28 — SS Phase 1 Task 1.5B (`add_listing` Thumper tool + system prompt update)

**Goal:** Land the third Thumper tool — `add_listing` — wrapping `addListing` / `addListingBatch` from Task 1.5A, plus `createDesign` from `lib/services/jewelry-database.ts` for the unknown-piece recovery flow. Update the system prompt to reflect three tools and remove "you cannot add listings" language.

**New file:**
- `lib/thumper/tools/add-listing.ts` — exports `addListingTool: ToolDefinition` (`readOnly: false`, no `needsApproval` — clickwrap acceptance is the rep's confirmation gate, gathered conversationally rather than via the HITL approval dialog used for `remove_listing`).

**Modified:**
- `lib/thumper/tools/index.ts` — `addListingTool` added to `REGISTRY`.
- `lib/thumper/system-prompt.ts` — full consistency sweep: "two tools" / "exactly two" / "cannot add" all replaced; new `add_listing` description bullet in tool inventory; new `add_listing` boundary bullet (clickwrap rule); voice example on line 39 swapped from a "can't add yet" decline to a successful-add example.

**Service-role client decision:** `ctx.supabase` from the route is the SSR-authenticated client (RLS-enforced), but `addListing`, `addListingBatch`, and `createDesign` all REQUIRE admin permissions to UPDATE `jewelry_designs.times_listed` and INSERT into `jewelry_designs` / `collections`. The tool obtains its own `createAdminClient()` inside `execute` and passes it to every service call. `repId` stays closure-bound from the authenticated session — the model never supplies it, and the service functions validate `repId` themselves so the admin client cannot enable cross-rep writes.

**Composite parameter schema:** Built from `AddListingInput` + `CreateDesignInput` + `mode` discriminator + batch `items` array. Field names verbatim from the service-layer types (`clickwrapAccepted`, `repNotes`, `tradePreferences`, `listingPhotoUrl`, `designName`, `piecePhotoUrl`, `material`, `mainStone`, `bpMsrp`, `collectionName`, `specialFeatures`, `lengthInfo`).

**Recovery-flow gate:** `collectionName` is REQUIRED at the tool level whenever `designName` + `piecePhotoUrl` are present (i.e. the rep is retrying after `NEEDS_FULL_INFO`). `createDesign` accepts a null collection at the service layer, but `addListing` rejects any design without one — so creating a design without a collection would dead-end on the very next call. The tool throws `ThumperToolError({ code: 'NEEDS_COLLECTION_FOR_NEW_DESIGN' })` before any DB write happens, and the system-prompt copy reflects "three required fields — design name, photo, and collection name."

**Error mapping:**
- `NEEDS_FULL_INFO` → structured success-shaped return `{ needsAction: 'create_design', itemNumber, requiredFields: ['designName','piecePhotoUrl','collectionName'], optionalFields: [...], message }` so Thumper can drive the follow-up turn without throwing.
- `NEEDS_COLLECTION` → structured limitation return `{ needsAction: 'cannot_complete', code: 'NEEDS_COLLECTION', itemNumber, message }`. Does NOT parse `designId` / `designName` out of `err.userMessage` — `ServiceError` only guarantees opaque strings, so promising structured fields from a string-parse would be brittle. The rep already supplied `itemNumber`, that's all we structurally promise back.
- `DUPLICATE_LISTING` / `CLICKWRAP_REQUIRED` / `MISSING_ITEM_INPUT` / `UNAUTHORIZED` / `INVALID_INPUT` / any other `ServiceError` → translated to `ThumperToolError` for Tier 2 explain via `instanceof ServiceError`.
- Non-`ServiceError` → propagates → Tier 3 escalate.

**Audit writes:** `'add_listing'` for every successful add (single or per-row in batch) and `'create_design'` when a new design is created during the recovery path. Same fire-and-forget isolation as `remove-listing.ts` — audit failure never reverses the rep's view of success. Note: `writeTradeActionAudit` already swallows internally, so the outer `try/catch` and `logIncident('audit_write_failed')` are effectively unreachable today; we keep them for pattern consistency.

**Files NOT touched (per task guardrails):** `lib/services/*` (used as-is), `app/api/thumper/route.ts`, `lib/thumper/tools/list-my-trade-board.ts`, `lib/thumper/tools/remove-listing.ts`, `lib/thumper/tools/wrappers/*`, `lib/thumper/auth.ts`, `lib/thumper/persistence.ts`, `lib/thumper/errors.ts`, all UI, all migrations.

**Verification (2026-04-28):**
- `npx tsc --noEmit` — clean across all touched files. Only pre-existing `tests/thumper/attack-5-poisoned-rep-notes.test.ts` errors remain (unrelated, accepted per CLAUDE.md).
- `npm test` — 4/4 abort-modes pass. No regression on the existing tool wrapper / 3-tier path.
- Registry shape — `REGISTRY.length` goes from 2 → 3; `buildAllTools(ctx)` returns `{ list_my_trade_board, remove_listing, add_listing }`; the `needsApproval`-survives-wrapping assertion at `lib/thumper/tools/index.ts:42-44` continues to pass (`add_listing` doesn't set `needsApproval`, so `built.needsApproval === undefined === outer.needsApproval`).
- `grep -niE "two tools|exactly two|cannot add|adding listings is coming|two-tool|one of two" lib/thumper/system-prompt.ts` → 0 hits. `grep -nE "add_listing|three tools" lib/thumper/system-prompt.ts` → 6+ hits.
- End-to-end conversational sanity (boot dev server, exercise single / NEEDS_FULL_INFO recovery / batch flows against cloud Supabase) — deferred to live verification before push, NOT a hard gate for this commit.

## Session 2026-04-28 — SS Phase 1 Task 1.5B follow-on (vision-first photo flow + jewelry-photos Storage bucket)

**Goal:** Close the new-design loop. Task 1.5B's staged behavior fix told Thumper to use vision instead of asking reps for photo URLs, but `createDesign()` still required `piecePhotoUrl` and Sparkle Suite had no Supabase Storage bucket. This work adds the bucket, a server-side upload utility, and rewires `add_listing` to extract the rep's chat-uploaded image from `thumper_conversations.parts`, upload it via service-role, and pass the resulting public URL into `createDesign()`. Reps never see a URL prompt.

**New files:**
- `supabase/migrations/029_ss_jewelry_photo_storage.sql` — public `jewelry-photos` bucket + two RLS policies on `storage.objects` (SELECT for `public`, INSERT for `authenticated` scoped to `{rep_id}/` folders). Idempotent via `ON CONFLICT (id) DO NOTHING` for the bucket and `DROP POLICY IF EXISTS ... ; CREATE POLICY ...` for the policies (Postgres has no `CREATE POLICY IF NOT EXISTS` — verified the hard way during planning).
- `scripts/run-migration-029.ts` — runner mirroring `028` with the same `bqhzfkgkjyuhlsozpylf` host assertion. Verifies bucket presence + both policies post-apply.
- `lib/services/storage.ts` — first storage integration in the repo. `uploadJewelryPhoto(repId, base64Data, filename?)` strips the `data:image/...;base64,` prefix, picks an extension from MIME, sanitizes any caller-supplied filename to prevent escaping the `{rep_id}/` folder convention, uploads via `createAdminClient().storage.from('jewelry-photos').upload(...)`, and returns the public URL from `getPublicUrl`. Service client bypasses INSERT RLS — RLS is defense-in-depth for any future client-side direct upload.

**Modified:**
- `lib/thumper/tools/add-listing.ts` — four changes:
  1. New `resolvePhotoFromConversation()` helper queries `thumper_conversations` via `ctx.supabase` (RLS-scoped, conversation_id was already verified at the route level by `probeConversationOwner`), filters to `role='user' AND status='complete'`, orders by `created_at DESC, id DESC` (deterministic tiebreaker mirroring `persistence.ts:60–74`), finds the first `parts[*]` element with `type='file' AND mediaType startsWith 'image/'`, extracts `url` (data-URL), and uploads via `uploadJewelryPhoto`. Returns `null` if no image found.
  2. Retry gate at the create-design branch relaxed from `if (designName && piecePhotoUrl)` to `if (designName)`. Inside the branch, `piecePhotoUrl` is honored if the model passed one (manual fallback preserved); otherwise `resolvePhotoFromConversation` is called, and a missing image surfaces `MISSING_PIECE_PHOTO`.
  3. `NEEDS_FULL_INFO` recovery payload: `requiredFields` becomes `['designName', 'collectionName']` (was `['designName', 'piecePhotoUrl', 'collectionName']`); `piecePhotoUrl` moves into `optionalFields` as a manual override. Recovery `message` rewritten — no more "blocked because no storage" / "flag to Louis"; new copy tells the model to vision-extract `designName` + optional metadata, **always confirm `collectionName` with the rep** before retrying (collections match by exact-string — vision-guess creates a junk row), and that the handler uploads photos automatically.
  4. Tool description (line ~343) rewritten in parallel with the recovery message.
- `lib/thumper/system-prompt.ts` — Case B paragraph at line 71 rewritten to remove the "blocked because no storage" language and add the explicit "always confirm `collectionName` with the rep before retrying" guidance + "handler uploads the photo from chat automatically" guidance. Lines 65–70 (Photo-first / Confirmation paragraphs) untouched.
- `tests/thumper/add-listing-recovery.test.ts` — new top-level `vi.mock('@/lib/services/storage', ...)` with shared `uploadJewelryPhotoMock` (vi.doMock inside test bodies is too late — `add-listing.ts` resolves the storage import at module load time). New chainable supabase mock helper `makeConversationLookupMock(rows)`. `makeTool()` accepts optional `supabase` override (defaults to `{} as never` for existing tests). Test 1 updated for the new `requiredFields` / `optionalFields` shape; Test 2 message-text assertions rewritten. New describe block `'add_listing — vision-first photo extraction (Task 1.5B closure)'` covers the success path (image part present → `uploadJewelryPhoto` called with rep id + data URL → `createDesign` receives the resolved public URL) and the failure path (no image part → `MISSING_PIECE_PHOTO` thrown, `createDesign` not called). The success-path test deliberately does NOT pre-queue a `NEEDS_FULL_INFO` rejection — handler enters create-design on the first call (gated on `designName`), so a queued rejection would be consumed by the post-create `addListing` and break the test for the wrong reason.

**RLS pattern:** Standard repo convention preserved. Storage INSERT scoped via `split_part(name, '/', 1) = (SELECT id::text FROM reps WHERE auth_user_id = auth.uid())` — never `auth.uid()` directly. Mirrors the trade_listings RLS pattern in `006_sparkle_suite_schema.sql:515–517`.

**Photo-part shape:** Verified from `app/thumper/_client.tsx:519,561,631` and `lib/thumper/image-compress.ts:11,49`. AI SDK v6 `FileUIPart`: `{ type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,...' }` — top-level `mediaType` and `url`, no nested `data` wrapper.

**Files NOT touched (per task guardrails):** `lib/services/jewelry-database.ts`, `lib/services/trade-board.ts`, `lib/services/trade-requests.ts`, `lib/services/trade-fulfillment.ts`, `lib/thumper/auth.ts`, `lib/thumper/persistence.ts`, `app/api/thumper/route.ts`, all wallet/Stripe code, all UI. The `AddListingInput` parameter schema kept `piecePhotoUrl` as `z.string().optional()` — already optional pre-task; nothing to change.

**Scope expansion (approved 2026-04-28):** The original brief said "DO NOT modify staged system prompt or tool description changes," but adversarial review (Codex) flagged that the staged Case B paragraph would become factually incorrect post-storage-wiring (it tells Thumper "brand-new designs are blocked because no photo storage"). Louis explicitly approved expanding scope to patch the prompt + tool description in this same change so they don't go out of sync.

**Verification (2026-04-28):**
- `supabase db push` — applied 029 successfully against cloud (`bqhzfkgkjyuhlsozpylf`). `NOTICE: policy ... does not exist, skipping` for both DROPs as expected on first apply.
- Service-role roundtrip via Supabase JS client: `listBuckets()` returns `jewelry-photos` with `public=true`; `upload` + `getPublicUrl` + `remove` cycle on `_verify-029/{ts}.txt` succeeds end-to-end.
- `npm test` — 12/12 pass (8 prior + 4 new vision-first / regression-guard cases).
- `npx tsc --noEmit` — clean. Only pre-existing `tests/thumper/attack-5-poisoned-rep-notes.test.ts` errors remain (unrelated, accepted baseline).
- Live conversational smoke test (rep uploads photo of NEW piece + "add this to my board") — deferred to live verification before push.
