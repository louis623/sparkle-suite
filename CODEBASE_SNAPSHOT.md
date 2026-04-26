# Codebase Snapshot — Neon Rabbit Core
_Generated: 2026-04-26 (HEAD: feat(thumper): Task 1.1 — promote spike to production route + Guardian/Enforcer hooks)_

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
│   │       ├── health/route.ts             ← public health probe (api/db reachable, recent_error_rate)
│   │       └── me/route.ts
│   ├── login/{page.tsx, _client.tsx}       ← Supabase Auth email/password login (redirects to /thumper)
│   ├── thumper/                           ← Production Thumper UI (Task 1.1 port of Claude Design handoff)
│   │   ├── page.tsx                        ← server wrapper (Suspense)
│   │   ├── _client.tsx                     ← useChat client + matchMedia desktop/mobile switch
│   │   ├── _shell.module.css               ← root layout (reserves 400px right column on desktop)
│   │   ├── thumper-tokens.css              ← global :root tokens (Section A of handoff bundle)
│   │   └── components/                    ← 14 atoms × {.tsx, .module.css}
│   │       ├── ThumperGlyph, ThumperHeader, Bubble, ListingPreview, HITLBlock,
│   │       ├── ErrorBlock, Chips, InputRow, StreamingBubble, ChatHistory,
│   │       └── EmptyGreeting, ThumperColumn, ThumperMobileShell, DashboardPlaceholder
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
│   │   ├── wallet.ts             ← ensureWallet, deductSmsCharge, auto-recharge trigger
│   │   └── trade-board.ts        ← getMyBoard + removeListing (used by Thumper tools)
│   ├── thumper/                  ← Phase 1 Task 1.1 Thumper assistant (production)
│   │   ├── auth.ts               ← getAuthenticatedThumperContext()
│   │   ├── persistence.ts        ← thumper_conversations + approval_events I/O
│   │   ├── system-prompt.ts      ← THUMPER_SYSTEM_PROMPT (~3600 tokens, real prompt; TEST_PAD removed)
│   │   ├── probe-conversation-owner.ts ← admin-client cross-tenant ownership probe
│   │   ├── guardian-telemetry.ts ← logIncident, logToolExecution (writes thumper_incidents, tool_executions)
│   │   ├── audit.ts              ← hashState (SHA-256 of sorted-key JSON), writeTradeActionAudit
│   │   └── tools/{list-my-trade-board.ts, remove-listing.ts}
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

