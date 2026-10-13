# 2026-10-13 Stripe subscription.updated closeout

- Branch `cursor/stripe-subscription-updated-webhook-6955`. Fix commit `c0f6058b4a71964ba0e159b9da478649bd9d0722`. PR https://github.com/louis623/sparkle-suite/pull/88 into `codex/nic-nac-trade-hardening`. Not merged. Not deployed.
- `customer.subscription.updated` now updates the existing `subscriptions` row by `stripe_subscription_id`. The previous upsert omitted NOT NULL `rep_id` and `plan_tier`, so Postgres rejected the insert side.
- A missing row is logged and skipped. An older `stripe_event_timestamp` is ignored. Period dates, `monthly_amount`, `status`, `cancel_at_period_end`, and `stripe_event_timestamp` are written on a newer event. Checkout handling is unchanged.
- Handler failures log the Supabase error `message`, `code`, `details`, and `hint`.
- `npx vitest run tests/stripe-webhook-route.test.ts` passed (20). `npx tsc --noEmit` passed.
- Next action: review PR 88. Do not deploy until Louis asks.
