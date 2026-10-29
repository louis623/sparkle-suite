# Finder public feeds: listed customer reps only

Louis approved this scoped fix on October 29, 2026. Draft PR #165 targets `codex/finder-rep-feed-fields` at `c042abb0`; feature branch `codex/finder-feeds-real-reps-only` is allowed only on the Smoke preview project. No merge or Live release is authorized.

All public live-shows, availability and catalog-count paths retain paid/trial entitlement and now require #164's shared active/listed/customer/valid-slug predicate and existing demo exclusions. The authenticated private rep-claim and linked-memory services retain their previous entitlement-only behavior through a separate helper; directory visibility must not gate private account linking.

Validation: initial focused 67/67; full suite ONCE 5,927 passed, 55 failed, 5 skipped (5,987 total), versus recorded #164 5,917/51/6. Four introduced private-link test failures were corrected; affected final set is 81 passed and two unchanged launch-build baseline failures. Three additional failure names (photo-frame newline, pantry script bytes, message RLS source contract) and the missing-migration/robots suite-load errors reproduce on an exact c042abb0 checkout on this host. No unresolved change-caused failure remains. Final TypeScript is clean. Do not describe the raw full suite as green or as rerun after the compatibility fix.

Smoke deployment/check results are recorded in PR #165's final description and task artifacts. Rollback before this task: `dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc`. Reuse the same 41 deployment-only chunk 2 overrides: only Smoke database `pukemqiwlyqmyytxkdmo`, inherited provider credentials blank, cron disabled. Empty Smoke public feeds are acceptable. Move only `sparkle-suite-smoke.vercel.app` after its requested checks pass; otherwise retain rollback.

No database migrations/writes, saved env/provider settings, Finder app, production branch, or Live sites may change. Open Brain was not written because this task explicitly prohibits database writes anywhere. No Live action is a next step without fresh explicit authorization.
