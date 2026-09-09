# Individual social visibility — September 9, 2026

Louis requested per-platform On/Off switches wherever a rep has a saved social
link. Implemented next to Instagram, Facebook, TikTok, YouTube, and Whatnot in
Workspace Site Settings. Switches default On, show explicit On/Off state, use
the existing keyboard-accessible switch styling, and save through the existing
authenticated settings API. Off preserves the URL and hides platform links
through the common customer-page presentation layer, including custom sites,
headers, hero links, calendar links, footers and subpages. This is publication
visibility, not deletion, account deactivation, or a privacy restriction.

Migration 20260909210000 adds site_settings.social_visibility, a NOT NULL JSONB
map defaulting to an empty object. Applied alone and recorded/verified in
migration history. Pending Lineup migrations were not run.

45 focused service, route, validation and browser tests pass. Browser proof
includes independent Off/On for all five platforms, preserved unrelated links,
and regression checks for all four public-site variants and existing switches.
Application TypeScript check passed. Shared-file social hunks were staged alone;
the existing paused Lineup changes remain uncommitted and unreleased.

Application commit: 876510b34eb1348441ba6c936c3deb8b322b4d3c, pushed to the
approved codex/nic-nac-trade-hardening branch. Git-source production build:
dpl_ABMYTEcJtCSNnnfhkkUZoZZuSAmc. Prior served deployment retained:
dpl_5GJTuM6sPVfjz27RQoMNjLcX1Xh2. Full hosted build passed and the new deployment
was promoted. Suite www/apex and Bri custom-domain alias IDs were individually
verified against the new deployment.

Live synthetic save/reload/public-page Off and On checks passed on Home and
Trade, covering all five configured platforms and exact preservation of URLs.
Original synthetic preferences and links were restored and read back exactly.
Anonymous Suite www/apex, Bri Home/Trade and Brittany Home checks passed.
Desktop and mobile screenshots are in artifacts/social-visibility-live-*.png;
mobile was visually inspected and has no horizontal overflow. The smoke used
an isolated headless browser and the existing synthetic reviewer, not Louis's
personal account or a customer login. No billing, queue, DNS, or email changed.

Reviewer procedure: /nic-nac?section=site-settings, Social handles, fill a link,
toggle its Show platform switch, Save site settings, reload, then open the
synthetic customer Home and Trade pages. Repeat Off/On and restore the original
synthetic social links and preferences. The guarded smoke runner is local
artifacts/smoke-social-visibility.mjs; it only uses the existing active synthetic
demo with a verified non-live smoke entitlement and restores its exact original
data in a finally block. It never sends an email or creates a charge.
