# 2026-10-05 — Cards & QR Smoke v1

## Follow-up: hub copy

- Business Tools ready tile title is `QR codes, QR flyers, business cards`. Body: `Build your site QR. Download a free QR code flyer, or order printed cards that match your site.` Button: `Open tool`. Ready badge stays. The Tools list and the tool page use the same title.

## Follow-up: Smoke hub unlock

- `isCardQrToolEnabled` now reads `process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT` directly so Next can inline it. The earlier `process.env` parameter stayed false in the browser, so Business Cards stayed Coming Soon on Smoke `6189be69`.
- Business Tools, when that marker is smoke, shows a ready Cards & QR tile that opens the same tool. Business Calculator stays Coming Soon. Live still sees both placeholders.


- Branch `cursor/smoke-card-qr-flyer-1376`. Smoke only. No live deploy and no live database migration.
- Workspace → Tools → Cards & QR appears only when `NEXT_PUBLIC_SPARKLE_ENVIRONMENT=smoke`. Live Tools stay as they are.
- One tool, three sections: profile QR for the current site address, free 1080×1920 flyer PNG, and business cards at $100 / 500 and $120 / 1,000 with Stripe test Checkout.
- Press PDF, Amelia/Minuteman email, and UPS sharing are stubs. Apply `supabase/migrations/20261005190000_ss_smoke_card_qr_profiles.sql` on Smoke Supabase only before profile save is durable.
- Playtest: `louis@neonrabbit.net` / Dude’s Fizzfest on `https://sparkle-suite-smoke.vercel.app`. Steps are in `docs/sparkle-suite/testing/card-qr-smoke.md`.
