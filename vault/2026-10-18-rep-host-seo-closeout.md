# Rep-host SEO draft

- Draft only. No merge and no Live deploy. Draft pull request https://github.com/louis623/sparkle-suite/pull/133 on `cursor/rep-host-seo-fixes` targets `codex/nic-nac-trade-hardening` at `72b905148613e929f563269fad256cec0ea3f854`. Allowlisted for a Smoke preview on project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, environment `preview`.
- Britt legacy paths `/about`, `/diamonds-unicorns`, `/join-team`, and `/embed` 301 to `/#about`, `/#wibp`, `/join`, and `/` on `brittwithbling.com`.
- Rep hosts 404 `/portfolio`, `/tools`, `/prelaunch`, `/adventure`, and `/demo`. Suite domains still serve those pages.
- Each rep sitemap includes `/faq`. FAQ copy uses that rep's business name, city/state, and next show.
- Rep `llms.txt` uses Dance Floor and dancer-swap wording, states the independent Bomb Party rep line, and lists upcoming shows from the live calendar.
- Homepage and `llms.txt` drop shows whose end time has passed, including a row still marked `live`. Idle Live Lineup copy no longer says it is waiting or retrying.
- Singular rep pronouns in the touched FAQ and tools copy use "the rep".
- Live database was read only. Sparkly Butterflies still has one past calendar row marked `live`: `calendar_events.id` `eda6487a-ff4f-4756-b655-97a60be5b85b`, `rep_id` `b5404543-b90a-41cf-85f6-4e6d1d576cfa`, title `TikTok Live`, `event_time` `2026-10-05 17:47:00+00`, `time_zone` `America/Denver`, `duration_minutes` 60, `status` `live`. Suggested data fix, not applied: set `status` to `completed`.

Next session: review the draft pull request. Do not merge, deploy, or write the Live database unless Louis asks.
