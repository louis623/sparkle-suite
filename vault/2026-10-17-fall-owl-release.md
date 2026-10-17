# October 17, 2026 — Fall Owl release preparation

Louis approved the polished Fall Owl and Harvest Moon concept and explicitly requested publishing it as an option available to every rep. Stable ID `fall_owl_harvest_moon`, code FO-01, Community visibility. Original approved synced-v4 video is reused unchanged; no new Higgsfield charges.

Implementation is in the clean disposable `.tmp-fall-owl-release` clone from current GitHub/live tip `39871833b6207c67a519ddd574ab93d1457e3855`, on the allowlisted branch. Historical dirty checkout and protected extension are untouched. Theme registration, full Amethyst palette, motion lifecycle/audio controls, preview, persistence validation, guarded catalog migration, and matching card/flyer compatibility are prepared. Build and 232 focused tests passed; desktop/mobile browser checks completed.

**Not live yet.** Automatic approval review rejected exporting production Vercel secrets into a local .env file; nothing was exported. Complete only through authorized database access, then manual exact-tip release, both-domain provenance and live workflow smoke. Existing production is `dpl_39Go4XC7dQY6oYaL6qHdZL7aHMxp`.

See `docs/sparkle-suite/operations/2026-10-17-fall-owl-release.md` for the concrete release and reviewer steps. Capture this state in actual Open Brain as well; update both records after publication.
