# Sparkle Suite Control Center MCP

## Purpose

Grok Bot uses one Sparkle Suite connector shared by Remy, Nic-Nac, Hale, and
Sam. Agent persona instructions may narrow how each agent uses the tools, but
the enforceable boundary lives in this MCP and in the Control Center approval
workflow.

This MCP extends the existing Sparkle Comms server in place. It does not create
a connector per agent and does not depend on the broken `user-Sparkle Suite`
OAuth connector.

Existing endpoint (retained so the Sparkle Comms connect card can be updated in
place rather than duplicated):

`https://www.yoursparklesuite.com/api/remy/mcp`

The MCP server identifies itself as `sparkle-suite-control-center`.

## Enforced capability boundary

The server is read-only by default. Its only live write remains the existing
one-time approved Support reply:

1. Draft an exact reply.
2. Request approval. This creates no message and expires after 15 minutes.
3. Louis reviews the exact text in **Control Center → Messages → Remy
   approvals**.
4. Only a current approval can be claimed once to send that immutable reply as
   Sparkle Suite Support.

The server cannot send unapproved Support replies, change report or lead
status, mutate rep profiles, deploy, change DNS or production configuration,
access attachments, or read unreported Rep Network conversations.

Workspace broadcasts and Fizz approve-once are separate owner-token tools.
They run only after the request presents the Control Center bearer token.
They do not replace the one-time Support reply approval.

## Tools

### Communications Center

| Tool | Effect |
| --- | --- |
| `communications_get_inbox_summary` | Read minimized Support Inbox summaries |
| `communications_list_support_reports` | Read minimized Support report queue |
| `communications_get_support_report` | Read one minimized Support report |
| `communications_list_network_safety_queue` | Read reported Rep Network items only |
| `communications_list_broadcasts` | Read broadcast history and counts |
| `communications_draft_support_reply` | Non-persistent draft |
| `communications_request_support_reply_approval` | Create expiring approval request; no send |
| `communications_send_approved_support_reply` | One immutable, one-time approved send |
| `communications_draft_broadcast` | Non-persistent draft and audience count |
| `communications_draft_task_candidate` | Non-persistent Task List candidate |

### Waitlist and operator health

| Tool | Effect |
| --- | --- |
| `control_center_list_waitlist_leads` | Read recent leads; optional status filter |
| `control_center_get_waitlist_lead` | Read one lead by ID |
| `control_center_get_operator_health` | Read bounded Support, job, system, and reported-safety counts |

Waitlist responses contain lead ID, name, linked intake shop name when one
exists, contact, signup source, signup date, and status. `shopName` is `null`
when the lead has not supplied one through a linked intake; the MCP does not
invent it.

List and get read the same classic Control Center table the public build-queue
form writes: `sparkle_suite_waitlist`. Omit `status` on list to return every
current lead. An empty `leads` array means that table currently has no matching
rows, not that the tool failed. Get returns `{ found: false, lead: null }` when
the ID is gone; that is not “temporarily unavailable.”

Louis/Nic-Nac verification after release: submit a clearly labeled TEST from
`https://www.yoursparklesuite.com/prelaunch#waitlist` (name + email is enough),
confirm the row appears in classic Control Center waitlist, then confirm MCP
`control_center_list_waitlist_leads` includes it and
`control_center_get_waitlist_lead` returns `found: true` for that id. Do not
email the lead or change its status. Remove the TEST row from classic Control
Center when finished.

The health snapshot returns counts only. It does not return private conversation
bodies, attachments, billing information, customer profiles, error payloads,
or deployment controls. Hale may surface a finding, but Codex does not begin a
fix until Louis approves it.

## Authentication and one-connector setup

Use the same Bearer-token connect-card pattern as Sparkle Comms. Keep the token
in masked connector/server configuration only; never place it in chat, prompts,
Open Brain, Git-tracked files, or source comments.

The server accepts `SPARKLE_CONTROL_CENTER_MCP_BEARER_TOKEN` as the shared
configuration name and retains `REMY_MCP_BEARER_TOKEN` as a compatibility
fallback. This does not create per-agent API keys. Approved browser origins may
be configured with `SPARKLE_CONTROL_CENTER_MCP_ALLOWED_ORIGINS`, with the prior
Remy setting retained as a fallback.

Update the existing Sparkle Comms connect card in place and rename it **Sparkle
Suite Control Center**. Do not add a second Sparkle connector. The broken
`user-Sparkle Suite` OAuth connector is not part of this MCP and should not be
used as its authentication path.

No connector save, Support send, deployment, DNS change, or production mutation
is required to build and verify the source contract.

## Bunny and Suite use one connector

Suite and Bunny call the same Control Center MCP. Do not create a second URL,
a second bearer token, or a second connector.

| | |
| --- | --- |
| Live URL | `https://www.yoursparklesuite.com/api/remy/mcp` |
| Smoke URL | `https://sparkle-suite-smoke.vercel.app/api/remy/mcp` |
| Header | `Authorization: Bearer` the existing `SPARKLE_CONTROL_CENTER_MCP_BEARER_TOKEN` (`REMY_MCP_BEARER_TOKEN` still works as the fallback name) |

Bunny passes `agentName: "bunny"`. Suite passes `agentName: "suite"`. Fizz passes `agentName: "fizz"`. Every
preview, publish, stage, get, and approve call writes that name on the audit
row. The tools refuse to run unless that request was authenticated with the
owner token.

| Tool | Arguments |
| --- | --- |
| `communications_preview_broadcast` | `agentName`, `title`, `body`, `category`, `audience` (`{kind:"all_active"}` or `{kind:"selected", repIds}`), optional `actionUrl`, optional `emailSuiteList` |
| `communications_publish_broadcast` | the preview arguments plus required `idempotencyKey` |
| `fizz_issue_stage` | `agentName`, `issueId` such as `2026-W42`, `subject`, `preheader`, `content` (structured: `issueDate`, `weekNote` opening with Good morning, up to 5 `items`, `latest` blog/video, optional `cta`; server renders `brand-assets/email/weekly-fizz-report/weekly-fizz-report.resend-template.html`, raw HTML rejected), `workspaceTitle`, `workspaceSummary`, `workspaceBody`, optional `actionUrl` |
| `fizz_issue_get` | `agentName`, `issueId` |
| `fizz_issue_approve` | `agentName`, `issueId`, `mode` `"test"` or `"live"` |

`emailSuiteList` defaults off. When it is true, publish sends one Suite-list
Resend broadcast after the Workspace post. Publish is idempotent for the same
agent and `idempotencyKey`. Fizz test mode emails only `louis@neonrabbit.net`
and posts only to that owner rep. Fizz live mode uses the Suite list and all
active reps. One channel failing does not skip the other. Live Fizz approval
and Suite-list broadcasts stay off on Smoke.
