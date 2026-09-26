# 2026-09-26 — Social hero buttons for every platform

- Site Settings → Social handles is one card per platform: icon, the existing URL, Show on site, and Show in hero.
- Show on site still defaults on when that platform key is missing. Show in hero defaults off. `facebookVipHero: true` still turns on Facebook VIP.
- A real platform URL is required. Hero on with an empty or off-domain link does not render a button. Hero only stays out of the footer strip.
- Hero labels, in order after Shop / Watch Now: Facebook VIP, TikTok, Instagram, Whatnot, YouTube. Same landing heroes as the Facebook VIP button: standard Amethyst, Mile High Fizz, Britt With Bling, BlingKitchen.
- Dance Floor, Join, Pantry’s own VIP link, Finder, and the Nic-Nac chat toggle are unchanged.
- Production deploy is not part of this branch. The live site changes only after this merges and that exact tip is deployed.
