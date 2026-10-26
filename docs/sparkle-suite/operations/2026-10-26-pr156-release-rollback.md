# PR #156 release and rollback boundary

This task stops at an immutable preview for Suite, Beacon and Rocky. No Smoke or Live alias may move. Live remains pinned to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`.

## Demo-only Live gate

**There is no implemented demo-only Live gate for this change.** The shared rep renderer and static assets would change for every rep if this branch were promoted. Opening Louis's demo after a global promotion is not a demo-only release. Before any Live release, implement and verify a rep-scoped gate that serves the new renderer/assets only to the exact owner demo identity while other reps retain the known-good release. That is additional release work, not authorization granted by this preview task. Rocky review and Louis's explicit Live approval remain required, followed by Louis's demo test and separate approval for all reps.

## Preview rollback

Stop reviewing the candidate preview and return to the previous immutable preview. No production rollback command is needed for a preview. The pass-3 starting checkpoint is `8fbc84520f673c1a553bd2b3f39ba7b4f0dc7bfd`. Each correction has its own commit, so selected changes can be reverted in reverse dependency order on the existing PR branch; do not reset the shared production branch. Preview QA records are isolated in `pukemqiwlyqmyytxkdmo`, labeled QA Preview, and have synthetic non-live $0 entitlements. Never copy them to Live.

## Exact Live rollback, only after an authorized Live release

From the verified Sparkle Suite repository, with the verified `louis-2849s-projects` team and `sparkle-suite` Live project context, restore the preserved deployment rather than rebuilding old code:

```powershell
vercel promote dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P
```

This command is documented, **not executed** in pass 3. Before a future authorized release, save the full alias inventory and deployment IDs; after rollback verify every alias below resolves to the preserved deployment. Do not assume a successful command means all aliases or workflows are restored.

## Recheck within 15 minutes

Start the clock at the authorized Live alias change. Within 15 minutes:

1. Read back all 15 customer-facing Live aliases listed below, plus the Vercel project alias. Check their exact deployment IDs, apex/www redirect behavior and HTTP status.
2. Obtain a fresh read-only inventory of every active Live rep with a public slug or custom domain. Check **every rep**, including slug-only reps, on its actual public route. Do not substitute the 23 preview fixtures or a sample of themes for this inventory.
3. Verify retained server hero nodes, no React #418/#423, correct business H1/rep sentence/public location, show dates, autoplay, sound fallback, pause/resume/mute, loaded art and links. Check desktop and slow-phone screenshots against the reviewed candidate; inspect first paint and layout stability.
4. Verify the Suite landing preview and theme pictures, sign-in and owner demo workspace destination, and safe reviewer paths for signup/checkout, QR and email rendering. Never submit real charges or messages as a release check.
5. If any alias or workflow is wrong, roll back first using the preserved deployment, then explain and record the evidence. Repeat alias and affected-route checks after rollback.

Verified alias inventory, October 26, 2026:

- `yoursparklesuite.com`
- `www.yoursparklesuite.com`
- `sparklybutterflies.com`
- `www.sparklybutterflies.com`
- `brisglowtique.com`
- `www.brisglowtique.com`
- `milehighfizz.com`
- `www.milehighfizz.com`
- `blingwithkrissig.com`
- `www.blingwithkrissig.com`
- `goforthebling.com`
- `theblingkitchen.com`
- `www.theblingkitchen.com`
- `brittwithbling.com`
- `www.brittwithbling.com`

Also verify `sparkle-suite.vercel.app` (the sixteenth alias, not one of the 15 customer-facing aliases). Refresh this list at release time so newly added domains are not missed.
