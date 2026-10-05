# 2026-10-05 — Cards & QR Smoke v1

- Branch `cursor/smoke-card-qr-flyer-1376`. Smoke only. No live deploy and no live database migration.
- Workspace → Tools → Cards & QR appears only when `NEXT_PUBLIC_SPARKLE_ENVIRONMENT=smoke`. Live Tools stay as they are.
- One tool, three sections: profile QR for the current site address, free 1080×1920 flyer PNG, and business cards at $100 / 500 and $120 / 1,000 with Stripe test Checkout.
- Press PDF, Amelia/Minuteman email, and UPS sharing are stubs. Apply `supabase/migrations/20261005190000_ss_smoke_card_qr_profiles.sql` on Smoke Supabase only before profile save is durable.
- Playtest: `louis@neonrabbit.net` / Dude’s Fizzfest on `https://sparkle-suite-smoke.vercel.app`. Steps are in `docs/sparkle-suite/testing/card-qr-smoke.md`.
