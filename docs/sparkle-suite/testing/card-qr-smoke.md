# Cards & QR — Smoke playtest

Smoke only. Do not deploy this to `https://www.yoursparklesuite.com`.

## Where it lives

Workspace → Tools → **QR codes, QR flyers, business cards**, on the Suite Smoke app (`https://sparkle-suite-smoke.vercel.app`) after this branch is deployed there. The same tool opens from Business Tools with the button **Open tool**. It stays hidden when `NEXT_PUBLIC_SPARKLE_ENVIRONMENT` is not `smoke`.

Playtest account: `louis@neonrabbit.net` (Dude’s Fizzfest). Not `lewis@`.

## Before the click-through

1. Deploy this branch to the Suite Smoke Vercel project only.
2. Apply `supabase/migrations/20261005190000_ss_smoke_card_qr_profiles.sql` on Smoke Supabase `pukemqiwlyqmyytxkdmo` only. Do not apply it on the live database.
3. Smoke Checkout needs a Stripe **test** secret (`sk_test_...`). A live secret is refused. If the test secret is missing, the QR and free flyer still work and checkout explains that test mode is not configured.

## Click-through

1. Sign in on Smoke and open Workspace → Tools → QR codes, QR flyers, business cards. Business Tools shows the same name, with **Open tool**.
2. The QR code section shows the current Fizzfest site address, a real QR image, **Download QR**, and **Copy QR**. The center mark choices are **None**, **Diamond**, and **Unicorn**. None is the default. The QR is a short link (`/q/` plus a 6-character code) to that site, colored for the current theme. There is no Save button, no Copy site address button, and no field toggles. The QR works even when Smoke has no Stripe secrets. Scanning the code while logged out opens the public site.
3. QR flyer: there are no style buttons (no Match my site, Halloween, or Classic ivory). The flyer follows the site's current theme. The preview is the server's file, scaled to the width of the section on a phone. **JPG** is the default. **PNG** is the full-quality choice. Download uses that same preview file, including the same center mark. The server checks that the QR scans to the short link before the file is returned, for both JPG and PNG. If that check fails, there is no download and the page says it couldn't make a flyer that scans right. The flyer shows the show title, the tagline (not the ticker), SCAN TO SHOP, the QR, the screenshot steps, a website line only when the site has a custom domain, and "Shop with {first name} anytime." Email and social links are not on the flyer. A custom theme (Kelly, Kim, Lindsey, Brittany) with no hand-made flyer registered says "Your custom flyer is being built" and does not offer a download. There are no field toggles and no discount line.
4. Business cards: confirm **500 cards / $100** and **1,000 cards / $120**, Ground-only shipping, and the “up to about 2 weeks” note. Pay with Stripe test mode. The return screen says the order was received and restates the two-week expectation.
5. Download the press file stub and confirm it is labeled a stub (trim 3.5×2, 0.125 bleed, 0.125 safe, 14pt C1S UV front / uncoated back).

## Real vs stub

| Real in this version | Stub |
| --- | --- |
| Smoke tool, three sections, theme-matched preview | Live Workspace (hidden) |
| QR short link to the current Suite site, in the site color | Profile save UI (the table can stay unused; a missing center-mark column stays None) |
| Portrait flyer preview that is the downloaded PNG or JPG | Amelia / Minuteman email, UPS sharing, and press-ready CMYK PDF |
| Stripe test Checkout at the locked prices | Hawaii / Alaska shipping |
| Paid-order expectation copy | Kim / Kelly art library |
