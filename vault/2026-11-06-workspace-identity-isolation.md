# Workspace identity isolation — November 6, 2026

Status: draft preventive hardening. Historical Live cause unproven. No Live changes.

Base: 0e136f56aca8d202f7ef6b23eb0fb380e7268b3d (production-branch tip; includes PR181).
Live at inspection: dpl_ByYrsxYEctXQAXQTRosGSfNF2Ar5 / 7460a63271ed781e037072da971f8bfc8eba12ab.
Disposable checkout: .codex-worktrees/workspace-identity-isolation-20261106.
Louis explicitly approved this Smoke-only branch registration.

## Confirmed source defects

- app/nic-nac/_client.tsx fabricated a complete Gracie workspace, unlocked state and fixture connection code after setup-state HTTP/auth failure, network error or timeout, provided reviewer visibility and a URL conversation ID were present. It did not establish a Supabase session.
- app/nic-nac/page.tsx enabled that behavior from a global reviewer setting or non-production status, rather than an authenticated synthetic identity.
- app/api/self-serve/setup-state/route.ts could use a conversation ID to read another rep's setup after auth failed in non-production. Returned data included setup answers and connection credentials; some pending-state reads could create a code. This was a real preview authorization defect, distinct from the client display substitution.
- Production reviewer settings were present on the incident deployment, but their values remain unknown. No production secrets were retrieved or changed.

## Developer concurrency

SupportWorkspaceClient wraps fetch only in its browser window. The gateway verifies the operator/session/capability and enters AsyncLocalStorage.run. getAuthenticatedRep uses that context only for that request; ordinary requests resolve by verified auth_user_id. No shared global selected-rep cache was found in the traced path.

Read-only Live metadata confirms a support session targeting Katelin overlapped the incident (November 5 18:52:42–20:02:53 ET). No support audit entries were returned in the narrowly queried 19:29–19:45 window; idempotent logging means absence does not establish lack of activity. Earlier auth evidence identified Katelin's password login at 19:42:46 ET and no matching Gracie incident-time login. Retained session access is not excluded. None of this proves what her browser rendered or authorized before login.

## Narrow correction

Remove the fabricated client identity and unauthenticated conversation lookup. Bind setup to the existing authenticated owner or verified request-local support context. Mark responses private/no-store. Reject reviewer entry points on production, even with old settings present; preserve explicitly configured Smoke preview and local-development reviewer access. Normal developer authorization is unchanged. PR181 and photo files are unchanged.

## Bounded validation

Two selected files: tests/reviewer-smoke-ui.test.ts and tests/self-serve-setup-state-route.test.ts; six named [identity] cases. First runner invocation failed before cases loaded: Windows sandbox EPERM while renaming Vite temporary cache files. Actual case executions: 0. No automatic retry; explicit approval requested for one unchanged startup retry.

Smoke deployments: 0. Document navigations: 0/4. Fixtures created: 0; no fixture cleanup required yet. Smoke-only database binding was verified; temporary credentials are local/ignored and will be removed at closeout.

Any eventual Smoke reproduction establishes a mechanism, not the historical Live cause. Browser validation will avoid undeletable support audit fixtures; actual request-local support concurrency is covered by the focused case. No merge or Live deployment is authorized.

Draft PR: https://github.com/louis623/sparkle-suite/pull/182. Application commit: eb857d907fea2400d04875c415ac1e449aea9737. No full suite or CI rerun is authorized. The new branch was pushed normally after the unchanged active-branch guard passed; no active Git hooks were configured in this clean clone.
Temporary Smoke credential file removed; no fixtures or sessions were created. Final diff/receipt review is limited to this draft and its recorded startup blocker.

Open Brain capture was attempted once; its MCP call did not return confirmation and was stopped. Do not assume the diary entry was saved or automatically duplicate it. Repository receipt is committed and pushed.

## Approved retry and bounded Smoke result (supersedes the startup-blocked status above)

- Louis approved exactly one unchanged test startup retry with OS permission. All six selected cases passed, zero failed, 21 unselected skipped. First attempt executed zero cases. No full suite or automatic rerun.
- Existing Smoke baseline dpl_2P6FbPEw9Ex2Qt3TEu8NnDAuBw9D / 1aa732f4: one controlled HTTP500 browser load reproduced the complete Gracie workspace and a different code while the authenticated /me identity remained this run's ordinary rep. This proves display substitution, not historical Live causation or a Gracie sign-in.
- Exactly one READY unaliased Smoke preview: dpl_7FDqx6BQ6cW271JAYMVWDkAizS8o, https://sparkle-suite-smoke-72h6k3tes-louis-2849s-projects.vercel.app, exact tested SHA46d0a02533811b4c4716de3a5b19346044fc4941. Source root was independently checked with CLI dry mode; .local secrets excluded. Deployment-only synthetic operator credentials, allowlist and generated reviewer token were passed from process environment by name; no project settings, production token or Live aliases were changed.
- Patched ordinary Workspace had correct identity/no Gracie; separate developer sign-in succeeded and simultaneous /me reads stayed separate. Negative support gateway read returned developer404 and ordinary500 instead of expected401/403. Stopped without replay after three of four total document navigations. Candidate logs and source show ordinary request denied for missing Control Center login, then mapped to the gateway's generic500 response; no workspace payload was returned by that branch. No unrelated gateway edit. Final controlled-failure browser view unexecuted; ordinary users may still see a generic server error on direct unauthorized support URLs. This prevents calling full browser acceptance or Live readiness complete.
- Two synthetic Smoke accounts were manifest-tracked and removed. Zero remaining reps, setup/site/subscription/connection/lineup/conversation rows, auth users and auth sessions confirmed. No persistent support sessions/audit fixtures created. Secret files removed after use.
- Live remains dpl_ByYrsxYEctXQAXQTRosGSfNF2Ar5 / 7460a632; stable Smoke remains dpl_2P6FbPEw9Ex2Qt3TEu8NnDAuBw9D. No merges, production writes, production browser tests or additional final diff review. PR181 and photo guardrails unchanged.
- Full sanitized receipt and deployment-only configuration: docs/sparkle-suite/qa/2026-11-06-workspace-identity-isolation/receipt.json. Next requires an explicitly approved bounded continuation for the one unexercised error-screen view; no automatic tests/deployments/review chain. No production setting deletion is required by the code gate; any later Live release remains separately approved.

Private fixture credentials and short-lived access files were deleted locally; immutable deployment-only settings reference accounts that are now deleted.

Final distinct Open Brain closeout capture confirmed successful (observation: investigation/development/quality assurance). The earlier unconfirmed capture remains unassumed; no repair or repeated capture chain was run.

## Final explicitly approved failure-screen navigation

Exactly one additional synthetic document navigation on existing candidate dpl_7FDqx6BQ6cW271JAYMVWDkAizS8o / SHA46d0a02533811b4c4716de3a5b19346044fc4941, cumulative4. Controlled setup500 produced only "Failed to load setup state": no Gracie, other rep information, connection credential or framework overlay. No Retry/sign-in link or recovery instructions appeared. Privacy check PASS; recovery UX insufficient. Recommend HOLD Live for a separately approved narrow recovery improvement; source unchanged in this continuation. Existing denied-support500 remains separately reported, not expanded into this patch. Historical incident cause still unproven.

One fresh manifest-tracked synthetic account and all owned rows deleted; independent Smoke SQL confirms0reps/0authusers/0sessions. No tests rerun, deployments, merges, Live changes or additional diff/review chain. Temporary credential files removed. Final distinct Open Brain observation confirmed. Receipt includes exact observations, screenshot path, manifest and cleanup. Stop here.
