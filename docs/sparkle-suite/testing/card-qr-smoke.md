# Cards & QR — Smoke playtest

Smoke only. Do not deploy this to `https://www.yoursparklesuite.com`.

## Where it lives

Workspace → Tools → **Cards & QR**, on the Suite Smoke app (`https://sparkle-suite-smoke.vercel.app`) after this branch is deployed there. The tool stays hidden when `NEXT_PUBLIC_SPARKLE_ENVIRONMENT` is not `smoke`.

Playtest account: `louis@neonrabbit.net` (Dude’s Fizzfest). Not `lewis@`.

## Before the click-through

1. Deploy this branch to the Suite Smoke Vercel project only.
2. Apply `supabase/migrations/20261005190000_ss_smoke_card_qr_profiles.sql` on Smoke Supabase `pukemqiwlyqmyytxkdmo` only. Do not apply it on the live database.
3. Smoke Checkout needs a Stripe **test** secret (`sk_test_...`). A live secret is refused. If the test secret is missing, the QR and free flyer still work and checkout explains that test mode is not configured.

## Click-through

1. Sign in on Smoke and open Workspace → Tools → Cards & QR.
2. QR code builder shows the current Fizzfest site address. Save to profile, copy the address, and download the QR.
3. QR flyer: switch Match my site / Halloween / Classic ivory, toggle name, email, QR, discount, and social, then download the portrait PNG (1080×1920).
4. Business cards: confirm **500 cards / $100** and **1,000 cards / $120**, Ground-only shipping, and the “up to about 2 weeks” note. Pay with Stripe test mode. The return screen says the order was received and restates the two-week expectation.
5. Download the press file stub and confirm it is labeled a stub (trim 3.5×2, 0.125 bleed, 0.125 safe, 14pt C1S UV front / uncoated back).

## Real vs stub

| Real in this version | Stub |
| --- | --- |
| Smoke tool, three sections, theme-matched preview | Live Workspace (hidden) |
| Profile QR save when the Smoke table exists | Amelia / Minuteman email and UPS account sharing |
| Portrait PNG flyer | Press-ready CMYK PDF |
| Stripe test Checkout at the locked prices | Hawaii / Alaska shipping |
| Paid-order expectation copy | Kim / Kelly art library |
