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
