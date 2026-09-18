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

The server cannot send unapproved Support replies, publish or modify
broadcasts, change report or lead status, mutate rep profiles, deploy, change
DNS or production configuration, access attachments, or read unreported Rep
Network conversations.

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
