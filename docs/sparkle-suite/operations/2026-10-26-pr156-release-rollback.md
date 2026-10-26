# PR #156 release and rollback boundary

This task stops at an immutable preview for Suite, Beacon and Rocky. No Smoke or Live alias may move. Live remains pinned to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`.

## Demo-only Live gate

Pass 4 implements the server-side `REP_RENDER_V2_SLUGS` allowlist. Empty/unset enables nobody; comma/whitespace-separated exact slugs enable only those reps; `*` enables everyone. The verified Fizz Festival demo slug is **`dudesfizzfest`**, confirmed by its public canonical URL and homepage bootstrap target on October 26, 2026. No environment variable was changed in this task.

The gate selects both the renderer and its assets. Non-listed reps use the frozen renderer/bootstrap and asset bytes from Live source `3f175871674e42dbc62d18419318941ea6a49935`, served through `/amethyst/render-v1/`. Shared binary files are byte-checked against the pinned manifest. This intentionally preserves the legacy client-only rendering and saved-Still behavior, including its older browser dependencies, for reps outside the canary. Merely skipping SSR while sending new controllers/styles would not preserve their existing output.

Before any Live request, prove the exact demo-only allowlist and non-listed legacy behavior on the intended deployment. Rocky review and Louis's named Live approval remain required, followed by Louis's demo test and separate approval for all reps. Preview currently has this variable unset, so its default rep routes exercise legacy; test-process V2 activation is not a deployed environment change or proof that V2 is enabled on Preview.

## First-line renderer rollback

After a **future authorized** canary, clear/remove `REP_RENDER_V2_SLUGS` in the verified Live project's production environment and redeploy the same approved code with the empty allowlist. This returns every rep to the preserved legacy renderer and assets without a database change. Existing deployment environment snapshots do not change when a project variable is removed; the redeploy is required. Verify the exact served deployment and the demo plus non-listed routes immediately. No environment change or redeploy is performed by this document.

If that rollback is insufficient, use the preserved full deployment promotion below. Do not use `*` as a demo-only rollout value.

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
