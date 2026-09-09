# LOC live integration checkpoint — September 9, 2026

This supersedes the earlier LOC reviewer-link blocker. Louis instructed Codex to keep working and own the test setup. The rebuild remains in progress; the original control center stays available and has not been decommissioned.

## Released and verified

- Dedicated, clearly labeled reviewer at `https://www.yoursparklesuite.com/start/loc`; no legacy reviewer token reset or Louis account replacement. Separate server credential, immutable synthetic identity guard, normal auth cookies, zero-dollar non-live entitlement, hidden Finder presence, no customer audience. Access credentials remain private, never in this vault.
- Core database migrations `202609080008`, `20260909000100`, `20260909000200` applied to `bqhzfkgkjyuhlsozpylf`; eight new operations tables retain RLS and deny anonymous/authenticated direct SELECT.
- LOC edge service and native frontend are live. Current LOC application `9e957a0`, deployment `dpl_EEne9NFj9nYQ92DhNobxmM8KKJ6H` at `https://louis-ops-center.vercel.app`.
- Suite application `531189670fb59d7eb2ddffda3622121d4fb7a018`, deployment `dpl_CzQBPd6eCcUvBhWc292teVmQDNZL`. Direct alias inspection confirms Suite www and apex target this deployment. Suite project customer aliases remain attached. Exact committed Git source was deployed, excluding concurrent dirty Live Lineup changes.
- Signed Suite overview, Task List and Finder appearance reads pass against production. LOC browser checks at 882/344 pixels exercised all main areas with no overflow or API/page errors on the earlier release. Form retry fix passed local build and full synthetic flows at 690/344 pixels for both uncertain and definite failures.
- Synthetic task `c7f9b8f3-bd85-4c0f-9c71-246b49afa3b0` was created, read, replayed without duplication, and completed. Retained as an explicitly labeled completed verification task.
- Live browser selection saved a non-customer verification note to Library `dd830301-9ae2-4add-8e54-b48bd515864c`, Wiki `b1cfe495-3bc3-4d4a-824f-a803046d8a0f`, Open Brain `f2034447-d9f4-4bd4-9253-6799fe5bc427`, and Codex inbox `64453b6a-b999-4845-a224-cc2e2cd44191`. Reads and same-request retry preserve all IDs; actual Open Brain search finds the note.
- Actual HTTPS/MCP service initialization, scoped discovery, connection proof, denied operations, memory separation, pause/resume/revoke pass. A temporary read-only agent completed assigned job `46452457-6049-4d56-9044-d0df2075af56` through claim, source read, receipt and durable completion. Temporary credentials revoked and agents removed. This proves the service, not a native Codex/Grok runtime.
- Public Suite root stays on root; prelaunch, Brittany page, legacy control-center login and reviewer entry load without browser errors.
- Finder evidence initially returned 502 because `service_role` lacked SELECT on both intake tables. Finder-only migration `20260909123000` grants exactly those two reads. Applied to separate project `pzksocboqauqjdtsgpdp`; RLS remains enabled and anonymous SELECT remains denied. Live synthetic signed image succeeds; wrong asset/submission, anonymous endpoint and public storage URL are denied. The temporary synthetic account, submission and uploaded image were removed.

## Support-session constraint and corrected behavior

An existing legacy support session `66246605-7e5e-58e4-b4cd-5cec2e3f5934` is active for another account with no expiry. It was left untouched. A new pure preflight now reports a clear 409 before any notice or activation. Known failures are recorded as failed; unknown outcomes remain reconciliation-required. Twenty-one focused tests pass, including no business effect for an existing session.

Live verification request `e56f91ee-6fd1-43b6-b21f-175e82c5aa9a` receives the clear 409. Earlier request `752b2a86-46e3-453e-ae76-6f55017bd1b3` remains uncertain and must not be replayed under a fresh ID or manually relabeled without reconciliation. No existing customer session was ended.

## Remaining gates

- Suite bridge currently enables 37 read operations and six individually staged writes: task create/update, onboarding checklist, support start/end, and support site-settings update. Other writes are not yet enabled. Do not call all functionality operational.
- Complete native support start/edit/end verification when the existing session is properly closed by its operator; do not close it just for testing or reuse its protected credential.
- Verify actual Codex and Grok runtime connections and assignments. Native Codex helper hit account usage limits; no reset credit was consumed. Synthetic HTTP/MCP proof is not native runtime proof.
- Finish remaining safe workflow rollout, real parallel-use acceptance and physical Galaxy Z Fold 6 review. Preserve LOC cream/sage styling and current customer-facing Sparkle branding.
- Finder evidence service is live and proven; full LOC-to-Suite review-queue/variant mutation with a synthetic queued review remains a separate test.
- Reviewer workspace succeeded initially; one post-release browser recheck timed out waiting for POST, while subsequent direct supported bootstrap returned 200. Continue browser validation rather than claiming that later check passed.

## Worktree and release notes

Concurrent Live Lineup source/vault changes remain local-only under their separate release hold. Do not stage them or apply `20260910000100_live_lineup_v2.sql` as part of LOC. Finder CLI auto-discovers the parent Suite config; use the dedicated ignored Finder CLI workdir for Finder database commands. Parent Suite link was restored to core after discovery, and no Suite database was repointed.

Private test scripts and sanitized results are under LOC `.local/`; tokens, auth sessions, pulled environments and API keys in that ignored folder must never be copied into Git or memory. Screenshots taken immediately after saving can show a loading state; they are not proof of the final rendered record.
