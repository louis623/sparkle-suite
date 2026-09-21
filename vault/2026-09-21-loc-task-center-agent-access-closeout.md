# LOC Task Center agent-access closeout — September 21, 2026

## Outcome

- Codex and Grokbot have persistent, narrowly scoped access to the live LOC
  Sparkle Suite Task Center through MCP.
- Approved agent operations are `suite.tasks.list`, `suite.tasks.create`, and
  `suite.tasks.update`. Louis remains the only actor who closes, reopens, or
  deletes tasks.
- New connector credentials remain valid until explicitly revoked by default.
  Time-limited credentials remain available when intentionally requested.
- No browser or computer control is required for routine task reads, creates,
  or updates. Credentials and bearer tokens are excluded from this record.

## LOC source and release provenance

- Repository: `louis623/louis-ops-center`
- Branch: `codex/loc-foundation`
- Permission repair: `c3848f71da6302611cd2101e5875afde9402fc8a`
- Persistent-connector policy:
  `eaf1a2178e73897b81311629791d05cb60484c27`
- Verified deployments: `dpl_Gh5xqhsM6237JuZoQ8fDaFi4b6Bz` and
  `dpl_GxgSawjrxskTRiXc6snKMmu25u4k`
- Verification: 128 full tests, 27 focused tests, TypeScript, production build,
  live MCP initialize/tool discovery/list/create/readback, and live asset/error
  checks passed.

## Brittany follow-up tasks

The eight check-marked September 21 meeting follow-ups were duplicate-checked,
created through LOC MCP, and read back as open, medium-priority records:

1. Fix incoming trade-request notifications.
2. Fix missing onboarding/team messages in the Message Center.
3. Add a Bug Report button to the Workspace dashboard.
4. Add printable onboarding/training materials.
5. Improve Nic-Nac trade verification, denials, and customer feedback.
6. Migrate customer data from Brittany's previous website.
7. Add customer and team birthday reporting/advance reminders.
8. Collect team-member birthdays.

## Classic Control Center parity

The classic Control Center Task List and LOC Task Center both use the production
`sparkle_suite_bug_hunt_items` table. An independent live query of the classic
table was compared with the LOC MCP result:

- Classic count: 60
- LOC count: 60
- Missing from LOC: 0
- Extra in LOC: 0
- ID/title/status/priority mismatches: 0

No migration write was required. A task created through LOC is already visible
in the classic Control Center, and copying it would create a duplicate.

## Decisions and lessons

- GitHub is the application source of truth. Use Git, authenticated APIs, MCP,
  and CLI tools by default.
- Never take over Louis's browser or computer unless he explicitly requests or
  specifically approves that use.
- Do not invent agent identity classes, permission restrictions, or workflow
  distinctions that Louis did not request. Connector-assigned permissions are
  authoritative.
- Interactive checklists must persist the exact selected labels, not only the
  number selected. If the labels are missing, request the list or screenshot;
  do not guess or spend prolonged usage reconstructing hidden UI state.
- Before moving records between an old and replacement interface, compare
  stable IDs and confirm whether the two interfaces share one backing service.
- Open Brain received four confirmed captures for the connector/release
  milestone, the eight tasks, the shared-backlog decision, and these workflow
  lessons. No secrets were captured.
