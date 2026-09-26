# 2026-09-26 — Facebook VIP landing hero button

- Workspace Site Settings → Social handles → Facebook now has “Show Facebook VIP button in the landing hero.” Default off. The URL is the existing Facebook social link, not a new field.
- The flag is `social_visibility.facebookVipHero` (missing or false = hidden). A valid Facebook URL is still required before the button renders.
- The button sits in the Shop / Watch row on the standard landing hero and on Mile High Fizz, Britt With Bling, and BlingKitchen homepages. It opens in a new tab.
- Dance Floor, Join, Pantry, Unsubscribe, and Finder are unchanged. Pantry already has its own VIP Group link.
- Production deploy is not part of this branch. The live site changes only after this merges and that exact tip is deployed.
