# LOC live integration checkpoint — September 9, 2026

This supersedes the earlier LOC reviewer-link blocker. Louis instructed Codex to keep working and own the test setup. The rebuild remains in progress; the original control center stays available and has not been decommissioned.

## Released and verified

### September 9 continuation: expanded live workflow proof

The old protected-link question is resolved; Louis needs to supply nothing for reviewer access. LOC retains its cream/sage style and the original operator center remains available.

- Full Finder review now passes through live LOC at 882/344px: private submission images render, an exact existing variant is selected, review completion is read back from the source ledger, and same-ID replay does not repeat the write. The existing catalog design is unchanged. All temporary submissions, images, user and review ledger fixture were removed.
- Waitlist create/read/update/delete and same-ID replay pass; an outdated edit is rejected with 409. Temporary lead removed.
- Dedicated reviewer onboarding checkbox readback passes. Finder appearance same-current-preset save/read/replay passes without changing the public preset.
- Synthetic onboarding contact/progress/scheduling, conversation completion, setup drafting, work readiness, build draft and profile save pass. Contact/scheduling used the official Resend delivery-simulation recipient; actual provider delivery was not independently verified. A separate no-email tail test passed launch checks, readiness flags and linking the existing synthetic reviewer. All temporary leads/builds removed; no real checkout, contract, domain or customer launch changed.
- Agreement drafting has a real missing SignWell configuration. Commit `ac74ce91` adds a known-failure preflight before any handler effect. Seventeen focused tests passed; live request `7a111bc1-3efd-4139-9cf7-beee05e168da` returned the clear 409 with no document created/sent. Earlier uncertain request `65951d0d-be9b-468c-b006-656e1d748f8b` remains unchanged.
- LOC browser announcement draft/preview/publish targeted only the synthetic reviewer. Publication `468d579d-1103-4257-8e64-7b51db3a936c` has exactly one delivery; same-ID replay and actual recipient inbox visibility pass. It remains as a clearly labeled synthetic message. The reviewer starts on the Support inbox filter; selecting All exposes the announcement.
- Source configuration advanced to 37 reads/25 writes on ready release `dpl_7otfGjA9LNhk5HLrYeUhKLYMMtti` (`7f1a720a`). Agreement clarity is ready on `dpl_AtGGKppjvQHVjXKubtR57GkYPft8` (`ac74ce91`). A further 29-write rollout is currently building as `dpl_9A66KZK1GQMSosDdPJvNJK1gsAGX`; do not treat that rollout as verified until its final follow-up below.

Evidence: LOC ignored `.local/review-flow-proof.json`, `live-waitlist-proof.json`, `appearance-proof.json`, `onboarding-flow-proof.json`, `onboarding-preparation-proof.json`, `announcement-flow-proof.json`, `agreement-precondition-proof.json`. The first onboarding proof correctly records failure only at the missing agreement configuration; do not present the whole provider pipeline as passed.

The historical six-write and pending-Finder-review notes below are superseded. Native runtime, existing support-session lifecycle, remaining write rollout and acceptance still remain.

Follow-up: 29-write release `dpl_9A66KZK1GQMSosDdPJvNJK1gsAGX` is Ready. Live synthetic support report status/reply/same-ID replay/promotion-to-task/close and messaging suspension/restoration all pass. Task, report and conversation fixtures are removed; reviewer access is restored. Evidence: `.local/support-controls-proof.json`. The four not-yet-enabled source writes are `approvals.decide`, `moderation.conversation`, `resources.publish`, and `lab.run`. Five focused resource/Remy/Lab files passed 22 tests; this does not establish live publication/provider execution.

SignWell recovery: the May runbook and Vercel metadata identified the existing reusable template/API configuration in Suite Development, absent from Production. Those three existing values were copied privately to Production for internal draft tracking. Live sending and provider-draft call flags are explicitly false. No SignWell provider was contacted. Configuration release `dpl_DQFRduC9q9dTWRy6HdQRdcbxG88x` is building from `ac74ce91`; draft-tracker verification is pending that release. Credentials remain only in private environment storage. Louis need not recover or supply these settings.

Final release verification for this pass: `dpl_DQFRduC9q9dTWRy6HdQRdcbxG88x` is READY from `ac74ce91ceeb3cfc2af3ac60864b14c7daa7b4bc`; direct Vercel alias lookups confirm both www and apex point to it. It enables 37 reads and 29 writes. Live LOC internal agreement draft tracking, same-ID replay and source readback now pass, with `test_mode=true`, `draft=true`, `send_email=false`, and no provider document. Temporary tracker, build and lead are removed. Evidence: `.local/agreement-tracker-proof.json`, `.local/suite-final-alias-proof.json`. The earlier missing-configuration constraint is resolved for internal drafts; real provider sending remains deliberately disabled and is not claimed verified.

Next work remains the four individually gated writes listed above, native Codex/Grok runtime proof, support access lifecycle without disrupting the existing operator session, and final acceptance. No link/password/configuration question is pending for Louis. Separate Live Lineup work remains excluded from every release in this pass.

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
- Reviewer workspace and required setup now both pass post-release browser verification, including visible Help & Resources and reviewer labeling. The fixture was restored to `dashboard_unlocked`. Initial fixed-delay checks raced loading; final checks waited for rendered content. Normal synthetic setup allocated a reviewer-only queue code; no customer queue or extension was changed.

Finder release is `6e9f708e7bf2e385f166b0eff21edf963722ec3b` / `dpl_4RShdV6kTVsD9NjDuYiAFVsf1er9`. Direct alias lookup confirms `yoursparklefinder.com` points to that Ready release; the public landing page renders normally. Suite remains on the verified `53118967` application; subsequent commit changes are Finder migration and documentation only.

## Worktree and release notes

Concurrent Live Lineup source/vault changes remain local-only under their separate release hold. Do not stage them or apply `20260910000100_live_lineup_v2.sql` as part of LOC. Finder CLI auto-discovers the parent Suite config; use the dedicated ignored Finder CLI workdir for Finder database commands. Parent Suite link was restored to core after discovery, and no Suite database was repointed.

Private test scripts and sanitized results are under LOC `.local/`; tokens, auth sessions, pulled environments and API keys in that ignored folder must never be copied into Git or memory. Screenshots taken immediately after saving can show a loading state; they are not proof of the final rendered record.
