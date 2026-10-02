# Unified Sparkle Suite Communications Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

**Date:** August 26, 2026
**Status:** Implemented and production-validated August 26, 2026
**Primary application:** Sparkle Suite
**Primary rep surface:** Workspace Message Center
**Primary operator surface:** Control Center Communications Console

## Goal

Make the Workspace Message Center the one dependable place where a Sparkle
Suite rep reads and sends product communication while keeping each workflow
clear and safely permissioned.

The completed system must support:

- team-lead and New Rep Onboarding conversations;
- controlled subscriber-to-subscriber rep messaging;
- bug, issue, help, and product-idea conversations with Sparkle Suite Support;
- official Sparkle Suite broadcasts, reports, resources, and updates;
- operator replies, triage, moderation, and deliberate promotion of an approved
  support report into the Control Center Task List.

Help remains a self-service learning and workflow library. It no longer owns a
support-report form or a separate place where a rep waits for a response.

## Relationship to the August 17 Message Center plan

This plan extends and partially supersedes
`docs/superpowers/plans/2026-08-17-sparkle-suite-message-center-and-resources.md`.

Keep these August 17 decisions:

- `workspace_message_publications` and `workspace_message_deliveries` remain
  the canonical one-to-many broadcast model;
- official publications keep frozen audiences, sender capabilities,
  idempotency, delivery state, and audit history;
- the persistent Workspace header Messages control remains the global entry;
- the Control Center remains independently authenticated;
- automated messages continue through scoped capabilities and the durable
  outbox;
- resources, monthly reports, and customer-activity messages remain
  publication categories rather than private conversations.

Supersede these August 17 boundaries:

- the rep Message Center is no longer globally receive-only;
- replies are allowed only in conversation types where the authenticated actor
  is an authorized participant;
- support intake moves from Help into Message Center;
- New Rep Onboarding replies move from Team Management into Message Center;
- rep-to-rep message requests become an approved phased feature.

Do not retrofit bidirectional chat into the publication tables. The rep sees
one communication product, but broadcasts and conversations keep separate data
models, permissions, and lifecycle rules.

## Current implementation baseline

The implementation must start from the current active repository rather than
recreating earlier work.

### Existing broadcast foundation

- `supabase/migrations/20260818010000_ss_workspace_message_center.sql`
  provides senders, publications, deliveries, audit events, outbox records,
  backfilled legacy owner messages, and receive-only rep RLS.
- `lib/services/workspace-messages.ts` provides draft, publish, schedule,
  cancel, list, delivery-state, audience, and idempotency behavior.
- `app/api/nic-nac/messages/route.ts` currently supports publication `GET` and
  delivery-state `PATCH`, and explicitly rejects sending.
- `app/nic-nac/components/DashboardPlaceholder.tsx` contains the header badge,
  Message Center filters, publication cards, and reviewer fixtures.
- `app/control-center/messages` and
  `app/control-center/_components/CommunicationsConsole.tsx` provide operator
  publication composition and delivery metrics.

### Existing support foundation

- `support_reports` stores report type, urgency, status, reporting rep, page or
  workflow, expected/actual result, audit state, notification state, and
  account snapshot.
- `lib/services/support-reports.ts` saves the report, runs Support Auditor, and
  sends the existing Google Chat alert.
- `app/control-center/_components/SupportCommandCenter.tsx` provides the
  operator Trouble Tickets view, account context, findings, and resolution
  lesson workflow.
- `sparkle_suite_bug_hunt_items` is the durable Control Center Task List.
- There is currently no durable link between a support report and a Task List
  item.

### Existing team conversation foundation

- `team_onboarding_participants`, `team_onboarding_progress`, and
  `team_onboarding_messages` support a private token-based onboarding site.
- Onboarding participants are guests and must not be converted into Sparkle
  Suite rep accounts merely to message their team lead.
- Team Management currently contains a large embedded reply composer for only
  the first active participant.

### Existing duplicate support entry points

- Help contains a one-field support form.
- Nic-Nac can call `submit_support_report` directly.
- Team Management contains its own onboarding reply composer.
- Message Center contains official publications but no conversations.

The migration must preserve existing reports and messages, maintain the public
onboarding invite flow, and avoid creating a period in which a message can be
saved in one system but invisible in the new Message Center.

## Locked product decisions

1. The Workspace header control remains labeled **Messages** and opens the
   **Message Center**.
2. Message Center is the only rep-facing inbox and reply surface.
3. Help remains the Workflow Playbook and learning library. A contextual
   **Contact Sparkle Suite Support** action may open Message Center, but Help
   does not store or display a separate support thread.
4. Support conversations are addressed to **Sparkle Suite Support**, not to
   Louis as a personal recipient. Louis and authorized future operators can
   reply from Control Center.
5. A support report does not automatically become a Task List item. An
   operator must review it and deliberately choose **Promote to Task List**.
6. Official Sparkle Suite publications are visually verified and cannot be
   impersonated by a rep.
7. Rep-to-rep messaging begins as controlled message requests between eligible
   active subscribers. It is not an unrestricted public chat network.
8. No group chat, customer messaging, email, SMS, browser push, or Sparkle
   Finder messaging is part of the first implementation.
9. Existing Google Chat support alerts may remain an operator notification
   channel, but they are not the system of record and replies never occur in
   Google Chat.
10. No real rep or customer account is used for development or reviewer smoke.

## Target rep experience

### Friendly-interface contract

The database has multiple communication streams, but the rep-facing interface
must never describe or expose them as separate systems. The product promise is:

> One inbox. Clear labels. The right actions appear when they are needed.

Treat this contract as a release gate, not optional polish.

#### One consistent inbox pattern

Every inbox row uses the same readable anatomy regardless of its source:

1. recognizable sender or conversation identity;
2. one plain-language type label;
3. one-line subject or context;
4. latest-message preview;
5. timestamp;
6. unread indicator expressed with text/semantics as well as styling.

Do not create visually unrelated card designs for Team, Rep Network, Support,
and official Sparkle Suite communication. Differences should come from a small
badge, sender treatment, and available actions rather than forcing the rep to
learn four interfaces.

#### Plain-language vocabulary

Rep-facing copy uses words reps already understand:

- **Team** rather than onboarding communication channel;
- **Other reps** or **Rep Network** rather than peer-to-peer stream;
- **Sparkle Suite Support** rather than operator queue;
- **Sparkle Suite updates** rather than publication deliveries;
- **Message request** rather than pending conversation membership;
- **Received**, **Under review**, **Planned**, and **Resolved** rather than raw
  database status values.

Terms such as stream, publication, delivery, principal, actor, outbox,
moderation event, and conversation type remain implementation language only.

#### Calm default view

- Message Center always opens to **All** unless a safe deep link names a
  specific view or conversation.
- Show active items in one chronological list; do not place four dashboards on
  the first screen.
- Use no more than the six approved primary views.
- Put Reports, Resources, and Updates in a small secondary filter within
  Sparkle Suite rather than another permanent navigation row.
- Avoid large metric cards, dense administrative controls, or technical status
  panels in the rep inbox.
- Use whitespace, readable previews, and restrained badges so urgency remains
  meaningful.

#### Predictable responsive layout

- Desktop may use a familiar inbox/thread split view when space permits.
- Phone and foldable layouts show either the inbox or one thread at a time,
  with a clear **Back to Messages** action.
- Opening a message must not unexpectedly replace the entire Workspace route or
  lose the rep's place.
- The composer remains visually anchored beneath the active thread without
  covering the newest message or phone keyboard controls.

#### Guided new-message flow

Do not begin with a blank recipient field. Start with three large, friendly
choices:

- **Message my team**;
- **Message another rep**;
- **Contact Sparkle Suite Support**.

After the choice, ask only for information required by that path. Hide
advanced or uncommon fields until the rep asks for them or selects the related
option.

Examples:

- Team shows only established team/onboarding relationships.
- Another rep explains why the rep is eligible to contact that person and
  clearly labels the first note as a message request.
- Support begins with **Ask for help**, **Report a problem**, and **Share an
  idea**, then presents the matching short form.

The rep must always know who will receive the message before Send becomes
available.

#### Context without clutter

Each thread shows a small context card only when it helps answer “What is this
about?” Examples include:

- New Rep Onboarding for a named participant;
- dancer item number and rep business name;
- Workspace area where a bug occurred;
- Support report status.

Keep the context summary compact and link back to the source workflow. Do not
repeat account profiles, audit findings, database IDs, or internal metadata in
the rep thread.

#### Clear identity and trust

- Official broadcasts display a verified **Sparkle Suite** sender treatment
  and a short **Official update** label.
- Support replies display **Sparkle Suite Support** even though the private
  audit records the actual operator.
- Rep Network messages display public business/show identity rather than email
  address.
- Onboarding guest messages clearly show the participant name and **New Rep
  Onboarding** context.
- A read-only official update never shows an inactive composer; it explains
  **This is an official Sparkle Suite update**.

#### Friendly status and feedback

- Sending shows immediate progress without removing the draft until the server
  confirms durable storage.
- Success places the sent message in the thread and moves focus predictably.
- Failure keeps the draft and attachment selection, explains what happened in
  plain language, and offers one Retry action.
- Preserve one unsent draft per active conversation during the current signed-in
  browser session; clear it after successful send or logout and never expose it
  across accounts.
- Status changes appear as quiet system messages rather than disruptive modal
  alerts.
- Empty states say what the area is for and present one useful next action.

#### Notification restraint

- The header badge represents the total unread count, capped visually at
  `99+` while retaining the real accessible label.
- Pending Rep Network requests are not styled as urgent support failures.
- Only `action_required`, live-show urgent Support, and direct safety notices
  receive high-emphasis treatment.
- Do not use sound, flashing, repeated toast notifications, or automatic thread
  opening.
- Archive and mute are easy to reverse and never delete history.

#### Error prevention

- Disable Send until a valid recipient/path and meaningful body are present.
- Confirm only high-consequence actions: block, report, close, or send an
  official multi-rep broadcast.
- Do not add confirmation friction to ordinary replies.
- Warn before abandoning an unsent draft or unfinished screenshot upload.
- Prevent duplicate sends with client request IDs while keeping the UI response
  understandable if a retry returns the already-saved message.

#### Usability acceptance standard

Before a slice is ready for release, a synthetic reviewer unfamiliar with its
implementation must be able to complete the relevant tasks without Help text
or developer guidance:

1. find and reply to an unread Team question;
2. return from the thread to the same inbox position;
3. report a Workspace problem and understand that it was received;
4. share an idea and later find its status;
5. distinguish an official update from a replyable conversation;
6. accept or decline a Rep Network request without accidentally starting a
   conversation;
7. locate archived or muted communication and reverse the action.

Record confusion, wrong turns, and inaccessible interactions as release
failures. Passing automated render tests alone does not satisfy this standard.

### Message Center navigation

Replace the current filters with these primary views:

- **All** — active conversations and official messages ordered by latest
  activity;
- **Team** — New Rep Onboarding and future explicit team conversations;
- **Rep Network** — accepted rep conversations and pending message requests;
- **Support** — help questions, bugs, site issues, and product ideas;
- **Sparkle Suite** — official reports, customer activity, resources, and
  platform announcements;
- **Archived** — rep-archived publications and conversations.

The existing Reports, Updates, and Resources concepts become optional
secondary filters inside **Sparkle Suite** so the main category bar does not
become crowded.

### New-message flow

The **New message** action offers only destinations the rep is allowed to use:

1. **My team** — existing authorized team relationships and onboarding
   participants;
2. **Another Sparkle Suite rep** — eligible subscriber directory or a
   context-specific rep such as the owner of a Dance Floor dancer;
3. **Sparkle Suite Support** — Ask for help, Report a bug or issue, or Suggest
   an idea.

Do not expose raw rep IDs, personal email addresses, operator addresses, or
guest onboarding tokens.

### Thread presentation

Every conversation header shows:

- the human-readable participant or queue name;
- a clear type badge such as Team, Rep Network, or Sparkle Suite Support;
- relevant context such as an onboarding participant, Dance Floor dancer,
  item number, or Workspace area;
- current request/support status where applicable;
- a safe deep link back to the originating Workspace feature;
- block, report, mute, archive, or close controls only when that conversation
  type permits them.

Official publications keep the existing card presentation and do not gain a
reply composer.

### Team Management behavior

Keep onboarding progress in Team Management, but replace the embedded composer
with a compact conversation summary:

- latest inbound preview;
- unread count;
- last activity time;
- **Open in Messages** action;
- empty state when no question has been sent.

Selecting **Open in Messages** opens the exact Team conversation, not just the
top of the inbox.

### Help behavior

Remove the `supportReportForm` and Support Path submission workflow from Help.
Replace it with a compact callout:

> Still need help? Contact Sparkle Suite Support in Messages.

The action opens the Support composer and passes only safe context:

- source surface `help`;
- current Workspace section/resource ID;
- return route;
- suggested support type when known.

Do not put free-form report contents, access tokens, conversation IDs, or
private account values into URL query parameters.

### Support composer

Use progressive disclosure rather than one unstructured textarea.

Required:

- type: question, bug/site issue, or idea;
- short summary;
- details.

Optional:

- expected result;
- actual result;
- urgency: normal, blocking, or live-show urgent;
- up to three screenshots;
- safe automatically captured page/workflow context.

On submission, open the resulting Support thread immediately and show a
durable first system response such as **Received by Sparkle Suite Support**.
Do not claim that Louis or an operator has personally read it until an
operator action proves that.

### Rep Network request flow

For a rep who has not previously messaged the recipient:

1. Sender chooses an eligible rep from an approved context.
2. Sender sees the recipient's public business/show identity and writes one
   request message.
3. Recipient sees the request under **Rep Network > Requests**.
4. Recipient can Accept, Decline, Decline and block, or Report.
5. Only Accept opens normal two-way messaging.

Initial contextual entry points:

- an eligible rep's Workspace-visible team relationship;
- a Dance Floor dancer or trade workflow where the other rep is already part
  of the business context;
- an approved subscriber directory using public business/show identity.

Do not automatically include Sparkle Finder in this release. Finder is a
separate application and requires a separately approved product-integration
contract before it can create or display Suite conversations.

## Data architecture

### Keep publication records unchanged

Do not add replies or arbitrary rep writes to:

- `workspace_message_senders`;
- `workspace_message_publications`;
- `workspace_message_deliveries`;
- `workspace_message_outbox`.

The unified inbox service may read publications and conversations together,
but publication authorization remains receive-only for reps.

### Migration 1: canonical conversations

Create
`supabase/migrations/20260826150000_ss_workspace_conversations.sql` with these
tables.

#### `workspace_conversations`

- `id uuid primary key`;
- `conversation_type`: `team_onboarding`, `support`, or `rep_direct`;
- `state`: `pending`, `open`, `resolved`, `closed`, or `blocked`;
- `subject` with a bounded nonblank check;
- `created_by_rep_id nullable references reps`;
- `context_type nullable`: `team_onboarding_participant`, `support_report`,
  `dance_floor_dancer`, `trade_request`, `rep_profile`, or `workspace_area`;
- `context_id nullable text`;
- `context_snapshot jsonb` containing only safe display metadata;
- `last_message_at`, `created_at`, and `updated_at`;
- optional `closed_at` and `closed_by_actor` audit fields.

Indexes:

- type/state/latest activity;
- creator/latest activity;
- context type/context ID;
- open support latest activity;
- pending rep request latest activity.

#### `workspace_conversation_participants`

Represent one of three principal types without inventing guest rep accounts:

- `rep` with `rep_id`;
- `onboarding_guest` with `team_onboarding_participant_id`;
- `support_queue` with the fixed key `sparkle_suite_support`.

Fields:

- conversation ID;
- principal type and exactly one allowed identity reference/key;
- role: requester, recipient, team_lead, onboarding_guest, or support;
- membership state: pending, active, declined, left, or blocked;
- `last_read_at`, `archived_at`, `muted_at`, joined/left timestamps;
- unique identity per conversation.

Use check constraints to prevent rows that combine a rep identity with a guest
or virtual queue identity.

#### `workspace_conversation_messages`

- conversation ID;
- immutable sender principal snapshot and trusted sender type;
- kind: `message`, `system_status`, or `moderation_notice`;
- plain-text body with length limit;
- `client_request_id` for idempotent retries;
- optional safe structured metadata;
- optional `moderated_at`, `moderation_reason`, and operator actor;
- created timestamp;
- no hard-delete or rep-edit behavior in v1.

Unique constraints must prevent retrying the same logical send from creating a
duplicate message.

#### `workspace_conversation_audit_events`

Record:

- creation and participant changes;
- message requests accepted/declined/blocked;
- support status transitions;
- operator replies;
- moderation actions;
- Task List promotion;
- legacy migrations and repair operations.

Audit details must not copy full private message bodies.

### Migration 2: support and Task List links

Create
`supabase/migrations/20260826151000_ss_support_conversation_links.sql`.

Add:

- `support_reports.workspace_conversation_id uuid unique` referencing the
  canonical Support conversation;
- `support_reports.submission_idempotency_key text unique`;
- `sparkle_suite_bug_hunt_items.source_support_report_id uuid unique`;
- indexes for support conversation and promoted-task lookup.

Update the existing checks without rewriting historical values:

- allow `message_center` in `support_reports.source` while retaining legacy
  `help_form` and `nic_nac` rows;
- allow `help_question` in `support_reports.report_type` while retaining
  `site_issue`, `bug`, `suggested_upgrade`, and `workflow_idea`;
- update the matching `SupportReportSource`, `SupportReportType`, route schemas,
  labels, filters, Support Auditor inputs, and tests.

Do not reuse the existing `support_reports.conversation_id` text column. That
column currently carries Nic-Nac conversation context and must retain its
meaning during compatibility.

Add a service-role transaction/RPC that creates a Support conversation, its
participants, initial message, and support report as one logical submission.
It must receive the authenticated rep identity from server code, never trust a
browser-supplied rep ID, and return the same result for a repeated idempotency
key.

### Migration 3: team onboarding conversation migration

Create
`supabase/migrations/20260826152000_ss_team_onboarding_conversations.sql`.

Add `team_onboarding_participants.workspace_conversation_id uuid unique`, then:

1. create one Team conversation per legitimate nonarchived participant;
2. create the owner rep and onboarding guest participant rows;
3. copy existing `team_onboarding_messages` in timestamp order;
4. preserve original sender type and timestamp;
5. store legacy source table/ID metadata with a unique constraint;
6. derive each participant's read cursor from the old `read_at` values where
   possible;
7. link each onboarding participant to the conversation;
8. leave the legacy table intact for rollback evidence.

After application cutover, old public and authenticated onboarding routes must
delegate to the canonical conversation service while preserving their current
response contracts. Stop new direct writes to `team_onboarding_messages`.

### Migration 4: Rep Network safeguards

Create
`supabase/migrations/20260826153000_ss_rep_network_messaging.sql`.

Add:

- `workspace_rep_message_blocks` with blocker/blocked rep uniqueness;
- `workspace_conversation_reports` for rep-submitted moderation reports;
- indexes supporting eligibility checks and recent outbound request counts;
- a uniqueness rule preventing two active direct conversations for the same
  unordered rep pair;
- database constraints preventing self-messaging.

Initial configurable limits:

- at most 5 new outbound message requests per rep per rolling day;
- at most 60 sent rep-network messages per rolling hour;
- at most 3 moderation reports for the same conversation by the same reporter;
- support and team messages are governed by their own abuse limits and are not
  blocked by Rep Network limits.

Keep these limits in a server-owned policy module so they can be adjusted with
tests after real beta evidence.

### Private support screenshots

Add a private `workspace-support-attachments` bucket and a
`workspace_conversation_attachments` table only for Support conversations in
the initial release.

Rules:

- JPEG, PNG, or WebP only;
- maximum 3 files and 8 MB each;
- validate actual decoded image type, not only browser MIME;
- process with the existing `sharp` dependency to strip metadata and cap
  dimensions;
- use opaque object paths with no customer names or email addresses;
- never expose public bucket URLs;
- create short-lived signed reads only after checking the requesting rep owns
  the thread or the requester is an authenticated Control Center operator;
- remove the uploaded object if the database attachment insert fails;
- no attachments in Rep Network or Team threads in v1.

Expected service additions:

- `lib/services/workspace-conversation-attachments.ts`;
- focused additions to `lib/services/storage.ts` only where shared private
  storage helpers are appropriate.

## Authorization and privacy contract

### Rep authorization

A signed-in rep may:

- list conversations in which their rep ID is an active or pending participant;
- read messages in those conversations;
- update only their own read/archive/mute state;
- send only when conversation type, state, membership, entitlement, block, and
  rate-limit checks allow it;
- create a Support conversation for their own rep identity;
- create a Rep Network request only to an eligible different rep;
- accept/decline/block only a request addressed to them;
- report only a conversation in which they participate.

A rep may not:

- create or impersonate an operator/system sender;
- read another rep's private thread;
- change another participant's state;
- bypass a block or declined request;
- modify or delete message history;
- promote a report to Task List;
- publish an official message;
- access onboarding guest tokens.

### Subscriber eligibility

Create `lib/services/workspace-conversation-eligibility.ts` as the single
policy authority.

Rep Network access requires:

- active rep status;
- active paid Sparkle Suite subscriber entitlement;
- no expired, cancelled, incomplete, or payment-required access state;
- no block in either direction;
- no operator suspension from Rep Network messaging.

Synthetic reviewer identities may participate only in isolated seeded reviewer
conversations. Internal/demo accounts must not contact live reps.

Team and Support eligibility remain available according to their established
Workspace/account contracts even when Rep Network eligibility is false.

### Onboarding guest authorization

The existing hashed invite token continues to authorize only its linked
onboarding participant and Team conversation. It never permits:

- browsing the owner rep's other messages;
- opening Support or Rep Network conversations;
- learning another participant's identity;
- changing the team lead's read state.

### Operator authorization

All operator actions use `getControlCenterAccess()` and server-resolved operator
identity. The browser never supplies a trusted operator email or sender type.

Operator-only capabilities:

- view and reply to Support conversations;
- change support status;
- promote to Task List;
- moderate a reported Rep Network message;
- suspend/reinstate Rep Network access;
- inspect conversation audit events;
- compose official publications through the existing publication service.

Internal operator notes must remain separate from rep-visible conversation
messages.

## Application service layer

Create these server-only modules:

- `lib/services/workspace-conversations.ts` — create, list, load, send, mark
  read, archive, and status-transition primitives;
- `lib/services/workspace-conversation-permissions.ts` — actor/action checks;
- `lib/services/workspace-conversation-eligibility.ts` — subscriber and
  relationship policy;
- `lib/services/workspace-inbox.ts` — merge conversation summaries with
  publication deliveries into one stable response;
- `lib/services/workspace-support-conversations.ts` — support submission,
  operator reply, status mapping, and Support Auditor linkage;
- `lib/services/workspace-team-conversations.ts` — onboarding guest/lead
  compatibility adapters;
- `lib/services/workspace-rep-network.ts` — requests, accept/decline, blocks,
  rate limits, and reports;
- `lib/services/workspace-conversation-attachments.ts` — private Support image
  lifecycle.

Use domain-specific types rather than one permissive generic payload. Every
mutation accepts an idempotency key and derives actor identity on the server.

### Unified inbox response

Evolve `GET /api/nic-nac/messages` to return a discriminated union:

- `kind: 'publication'` with the existing delivery/publication fields;
- `kind: 'conversation'` with conversation type, participants, last-message
  preview, unread count, state, and context.

Use an opaque composite cursor and stable sort by latest activity timestamp,
source kind, and ID. Do not load full message bodies for every thread in the
inbox list.

Preserve existing publication-only query behavior during one compatibility
slice so current clients and tests do not fail between releases.

### Conversation routes

Add:

- `GET /api/nic-nac/conversations/[conversationId]`;
- `POST /api/nic-nac/conversations/[conversationId]/messages`;
- `PATCH /api/nic-nac/conversations/[conversationId]/state` for own
  read/archive/mute state;
- `POST /api/nic-nac/conversations/support`;
- `POST /api/nic-nac/conversations/rep-requests`;
- `POST /api/nic-nac/conversations/[conversationId]/request-decision`;
- `POST /api/nic-nac/conversations/[conversationId]/report`;
- authenticated private attachment create/read routes.

Keep each route narrow. Do not turn `app/api/nic-nac/messages/route.ts` into one
large mutation switch.

### Control Center routes

Add or extend:

- `GET /api/control-center/conversations` with Support and moderation filters;
- `GET /api/control-center/conversations/[conversationId]`;
- `POST /api/control-center/conversations/[conversationId]/messages`;
- `PATCH /api/control-center/support-reports/[reportId]/status`;
- `POST /api/control-center/support-reports/[reportId]/promote-task`;
- `POST /api/control-center/conversations/[conversationId]/moderate`.

The promotion route must:

1. require operator authentication;
2. require an existing linked support report;
3. accept an operator-reviewed Task List title, type, owner, and notes;
4. create exactly one `sparkle_suite_bug_hunt_items` row;
5. link it to the support report;
6. add an audit event;
7. optionally move the report to `planned` only when the operator explicitly
   selects that status;
8. return the existing task on a repeated request rather than duplicate it.

## Workspace UI implementation

The existing `DashboardPlaceholder.tsx` is already very large. Extract the new
communication UI rather than expanding that file further.

Expected files:

- `app/nic-nac/components/messages/MessageCenter.tsx`;
- `app/nic-nac/components/messages/MessageCenterFilters.tsx`;
- `app/nic-nac/components/messages/InboxItem.tsx`;
- `app/nic-nac/components/messages/ConversationThread.tsx`;
- `app/nic-nac/components/messages/ConversationComposer.tsx`;
- `app/nic-nac/components/messages/NewMessageDialog.tsx`;
- `app/nic-nac/components/messages/SupportComposer.tsx`;
- `app/nic-nac/components/messages/RepMessageRequestCard.tsx`;
- `app/nic-nac/components/messages/MessageCenter.module.css`;
- a small controller hook such as
  `app/nic-nac/components/messages/useMessageCenter.ts`.

Modify `DashboardPlaceholder.tsx` only to:

- route the active Workspace section;
- provide established review-mode fixtures;
- pass account/team/workspace context;
- remove the embedded Team Management reply composer;
- remove the Help support form;
- handle contextual **Open in Messages** actions.

### URL and navigation behavior

Support these safe routes:

- `/nic-nac?section=messages`;
- `/nic-nac?section=messages&view=team&conversationId=<uuid>`;
- `/nic-nac?section=messages&view=support&conversationId=<uuid>`;
- `/nic-nac?section=messages&compose=support&source=help`.

Validate the conversation ID against the authenticated user's memberships
before rendering. A copied URL must never reveal a thread to a different rep.

### Accessibility requirements

- Inbox categories use a real labeled tab pattern or a semantically correct
  group of pressed buttons with keyboard support.
- Opening a thread or composer moves focus to the new heading, not directly
  into an unexpected text field.
- New-message and attachment dialogs trap and restore focus.
- Unread state is communicated in text/semantics, not color alone.
- Sending, failed sending, retry, status changes, and upload progress use
  appropriate polite/assertive live regions.
- Touch targets remain at least 44 by 44 CSS pixels.
- The thread/composer remains usable at phone width, 200% zoom, and keyboard
  only.
- Timestamps use `<time dateTime>` and do not rely only on relative wording.

## Control Center UI implementation

Turn `/control-center/messages` into the unified operator communication area
with three views:

1. **Support Inbox** — rep support threads, report/audit context, replies,
   status, attachments, resolution lesson, and Task List promotion;
2. **Broadcasts** — the existing Communications Console behavior;
3. **Network Safety** — reported Rep Network conversations, moderation actions,
   and messaging suspensions.

Expected extraction:

- preserve and narrow `CommunicationsConsole.tsx` into the Broadcasts view;
- add `ControlCenterConversationInbox.tsx`;
- add `SupportConversationDetail.tsx`;
- add `SupportStatusControls.tsx`;
- add `PromoteToTaskListDialog.tsx`;
- add `RepNetworkModerationPanel.tsx`.

Modify the main `SupportCommandCenter` page after feature parity:

- replace the duplicate interactive Support Inbox with summary counts and a
  link to `/control-center/messages?view=support`;
- keep account overview and Support Auditor information accessible from the
  conversation detail;
- keep the Task List on the Control Center and show linked-report provenance on
  promoted tasks.

## Support workflow behavior

### Submission and acknowledgement

1. Save the report, conversation, initial message, and idempotency key.
2. Return the thread immediately after durable storage.
3. Run Support Auditor and Google Chat notification through a retry-safe
   follow-up operation. Failure must not delete or hide the rep's thread.
4. Add a rep-visible system message only for truthful milestones.

### Status mapping

Internal status to rep-visible language:

- `open` -> Received;
- `reviewing` -> Under review;
- `planned` -> Planned;
- `resolved` -> Resolved;
- `closed` -> Closed.

Changing status creates one system-status message and one audit event. Repeating
the same transition is a no-op.

### Replies

- Operator replies appear as **Sparkle Suite Support**.
- The audit records the actual operator identity privately.
- A rep reply reopens a resolved conversation only when the workflow explicitly
  permits it; a closed conversation requires **Start a new support message**.
- Internal notes, Support Auditor findings, and reusable lessons never appear
  in the rep thread unless an operator deliberately writes a safe reply.

### Task List promotion

- Promotion is available from the linked Support conversation detail.
- The dialog previews the Task List title, type, owner, notes, and report link.
- Bug/site issue defaults to Task List type `bug`.
- Suggested upgrade/workflow idea defaults to `update`.
- The operator can change the default before confirmation.
- Promotion does not expose private Task List notes to the rep.
- Completing a Task List item does not automatically claim the rep's issue is
  resolved. The operator sends a resolution/status update separately.

## Nic-Nac transition

Retire direct rep-facing support submission through
`submit_support_report` after the Message Center Support composer is live.

Replace it with a non-mutating, UI-directed capability that can:

- recognize bug/idea/help intent;
- summarize the current issue into an editable Support draft;
- open or direct the rep to Message Center;
- never submit until the rep reviews and deliberately sends the message.

Update:

- `lib/nic-nac/tools/submit-support-report.ts`;
- `lib/nic-nac/system-prompt.ts`;
- `lib/nic-nac/prompt-builder.ts`;
- relevant tool routing and workspace knowledge tests.

Keep the old support-report API as a temporary compatibility adapter during
cutover, but remove active UI/tool calls and add telemetry for unexpected legacy
use. Remove the adapter only after a full release cycle with no legitimate
calls.

If Nic-Nac is malfunctioning, the header Messages control remains independent
and usable.

## Phased implementation

### Slice 0 — Contract tests and component boundary

1. Read the installed Next.js 16.2.1 guides for route handlers, server/client
   components, data security, forms, and Vitest before code changes.
2. Add contract tests that lock publication tables as receive-only for reps.
3. Add failing tests for conversation schema, RLS, idempotency, and exact actor
   constraints.
4. Extract the existing publication Message Center into the new component
   folder without changing behavior.
5. Verify current publication fixtures, filters, unread badge, and Control
   Center Broadcasts behavior still pass.

Acceptance:

- no visual or API behavior changes;
- publication security remains unchanged;
- `DashboardPlaceholder.tsx` no longer owns all Message Center presentation.

### Slice 1 — Team conversations in Message Center

1. Apply canonical conversation and onboarding migration.
2. Implement conversation service and team adapter.
3. Backfill existing onboarding messages and prove idempotency.
4. Update onboarding guest and team-lead routes to canonical writes.
5. Add Team inbox/thread UI and unread aggregation.
6. Replace Team Management composer with summary/deep link.
7. Preserve the public onboarding site's current message response shape.

Acceptance:

- an onboarding guest message appears in the owning rep's Message Center;
- the rep replies in Message Center and the guest sees it on the onboarding
  site;
- Team Management shows preview/unread/Open in Messages but no composer;
- another rep cannot read or reply to the thread;
- archived invitations cannot send new messages;
- legacy messages appear once and in correct order.

### Slice 2 — Support and ideas in Message Center

1. Apply support-conversation link migration.
2. Add Support composer, thread, status, and optional private screenshot flow.
3. Refactor support creation around the canonical Support conversation.
4. Add operator Support Inbox and reply surface under Control Center Messages.
5. Preserve Support Auditor, account snapshot, lessons, and Google Chat alert.
6. Add Help contextual link and remove Help's submission form.
7. Replace direct Nic-Nac submission with editable Support draft handoff.
8. Add operator-only promotion into Task List.
9. Replace the duplicate Control Center Trouble Tickets editor with a summary
   link after parity is verified.

Acceptance:

- question, bug/site issue, and idea submissions create a durable Support
  thread;
- the rep receives truthful status and operator replies in Message Center;
- Support Auditor/Google Chat failure does not lose the report;
- Help has no independent support form;
- Nic-Nac does not silently submit a report;
- promotion creates exactly one linked Task List item after confirmation;
- internal notes/findings never leak into the rep-visible thread.

### Slice 3 — Rep Network message requests

1. Apply block/report/rate-limit migration.
2. Implement subscriber eligibility and unordered-pair uniqueness.
3. Add approved directory/context entry points.
4. Implement request, accept, decline, block, mute, archive, and report.
5. Add Rep Network inbox and Requests state.
6. Add Control Center Network Safety queue and moderation audit.
7. Seed isolated synthetic two-rep review data.

Acceptance:

- only eligible active subscribers can initiate requests;
- the first message stays a request until accepted;
- decline/block prevents further contact;
- neither rep sees private account/contact information;
- rate limits work under concurrent attempts;
- support/team/system messages remain unaffected by Rep Network blocks;
- reported content is reviewable by an authorized operator only.

### Slice 4 — Unified inbox polish and legacy retirement

1. Complete stable merged pagination and global unread counts.
2. Add empty, loading, failure, offline/retry, archive, and no-permission states.
3. Add secondary Sparkle Suite filters for reports, resources, and updates.
4. Verify mobile/foldable/desktop layouts and accessibility behavior.
5. Add legacy-use telemetry and reconciliation scripts.
6. After one clean release cycle, remove dead Help composer code, old direct
   onboarding writes, and deprecated direct Nic-Nac support submission.
7. Keep legacy database tables/read evidence until a separate approved cleanup
   proves they can be retired safely.

## Test plan

### Migration and RLS tests

Add:

- `tests/workspace-conversations-migration.test.ts`;
- `tests/services/workspace-conversation-rls-contract.test.ts`;
- `tests/team-onboarding-conversation-migration.test.ts`;
- `tests/support-conversation-links-migration.test.ts`;
- `tests/rep-network-messaging-migration.test.ts`.

Prove:

- exactly one principal identity shape per participant row;
- cross-rep reads/writes fail;
- guest tokens are scoped to one Team conversation;
- publications remain receive-only;
- support queue identity cannot be forged;
- blocks and unordered rep-pair uniqueness hold under concurrency;
- legacy backfills are repeatable without duplicates.

### Service and route tests

Add focused suites for:

- conversation create/list/send/read/archive;
- actor authorization per conversation type and state;
- idempotent sends and support submissions;
- composite inbox ordering and pagination;
- unread totals across publications and conversations;
- Support Auditor/Google Chat success and failure;
- safe support status transitions;
- private attachment validation and cleanup;
- operator reply identity and internal-note isolation;
- Task List promotion and duplicate prevention;
- Rep Network eligibility, request decisions, blocks, reports, and limits;
- onboarding guest compatibility and archived invite rejection.

### Component tests

Cover:

- Message Center primary views;
- publication card vs conversation card behavior;
- no composer on official publications;
- Team Management Open in Messages summary;
- Help support-link replacement;
- support progressive disclosure and upload errors;
- Rep Network request controls;
- keyboard/focus/live-region contracts;
- Control Center Support Inbox, reply, status, promotion, and moderation;
- mobile layout contracts.

Add interaction-level usability contracts for:

- a consistent inbox-row hierarchy across all communication sources;
- no rep-facing technical architecture vocabulary;
- correct focus restoration between inbox, thread, and composer;
- draft preservation on failed send and safe clearing after success/logout;
- no inactive composer on official publications;
- clear destination identity before Send is enabled;
- no more than six primary Message Center views;
- phone/foldable one-surface-at-a-time navigation;
- header unread cap with an accurate accessible count;
- reduced-motion behavior and no notification behavior based on animation,
  color, or sound alone.

Modify/remove outdated expectations in:

- `tests/nic-nac-messages-route.test.ts`;
- `tests/nic-nac-dashboard-placeholder.test.ts`;
- `tests/nic-nac-help-resources-feedback-form.test.ts`;
- `tests/team-onboarding-service.test.ts`;
- `tests/team-onboarding-public-route.test.ts`;
- `tests/nic-nac-team-onboarding-route.test.ts`;
- `tests/nic-nac-support-reports-route.test.ts`;
- `tests/nic-nac/submit-support-report-tool.test.ts`;
- `tests/control-center-support-reports-route.test.ts`;
- `tests/control-center-communications-console.test.tsx`;
- `tests/control-center-messages-route.test.ts`;
- `tests/bug-hunt.test.ts`.

### Synthetic reviewer fixtures

Extend review mode with isolated fixtures:

- one unread official announcement;
- one Team onboarding thread with guest reply;
- one open Support bug with a safe screenshot;
- one Support idea in Planned state;
- one pending Rep Network request;
- one accepted two-rep conversation;
- one archived item.

Provide deterministic reset/reseed. Synthetic reps may communicate only with
other synthetic fixtures and must never resolve into Louis's or a customer's
identity.

### Smoke scripts

Extend or add:

- `scripts/smoke-workspace-conversations.ts`;
- `scripts/smoke-support-conversation.ts`;
- `scripts/smoke-rep-network-messaging.ts`;
- update `scripts/smoke-workspace-message-center.ts`;
- update `scripts/smoke-support-report.ts` for linked conversation and Task
  List promotion cleanup.

Each script must print created IDs and clean them in reverse dependency order.
Cleanup failure is a smoke failure.

## Release and verification gates

Release each slice separately. Before every application release:

1. verify absolute repo path
   `C:\Users\louis\sparkle-suite-repo`;
2. verify GitHub remote `louis623/sparkle-suite`;
3. verify allowlisted branch `codex/nic-nac-trade-hardening`;
4. record exact HEAD and intended Vercel project/domains;
5. run focused migration, service, route, and UI tests;
6. run `npm run build`;
7. apply and verify additive Supabase migrations;
8. run database-backed synthetic smoke with reset;
9. commit and push the exact verified tip;
10. manually deploy the exact tip to Vercel production;
11. confirm both `https://www.yoursparklesuite.com` and
    `https://yoursparklesuite.com` resolve to that deployment;
12. use the production-smoke skill and synthetic reviewer session to verify the
    exact live routes;
13. scan production errors and verify no real rep, customer, charge, email,
    SMS, or provider-side mutation occurred.

Do not use Louis's personal Workspace as acceptance evidence. If authenticated
synthetic browser acceptance is still blocked, report the exact blocker and do
not substitute a real account.

## Rollback and reconciliation

- All schema changes are additive during the first release cycle.
- Preserve legacy `team_onboarding_messages` and old support provenance.
- Provide a reconciliation command that identifies onboarding participants or
  support reports missing canonical conversation links and repairs them
  idempotently.
- Feature-flag conversation composing by type so Team, Support, and Rep Network
  can be disabled independently without removing publication access.
- If Rep Network is disabled, existing messages remain readable and blocks stay
  enforced.
- Never roll back by deleting messages, reports, audit records, or Task List
  provenance.

## Observability

Log only identifiers and state transitions:

- conversation ID/type/state;
- actor type and trusted internal actor ID;
- message ID and idempotency key, not body;
- support report ID/status/audit state;
- Task List promotion ID;
- Rep Network request decision and moderation event;
- attachment ID/type/size, not signed URL;
- retry/failure category.

Add operator metrics for:

- unread/open Support conversations;
- first operator response time;
- support status counts;
- reports promoted to Task List;
- pending Rep Network requests;
- blocks/reports/rate-limit denials;
- failed audits/Google Chat notifications;
- legacy records missing conversation links.

Never log raw message bodies, screenshots, onboarding tokens, personal contact
details, or signed storage URLs.

## Definition of done

- The header Messages control is the only rep inbox entry and accurately counts
  unread official messages and conversations.
- Team onboarding questions and replies occur in Message Center while the guest
  onboarding site continues to work without a rep account.
- Team Management contains context and an Open in Messages action, not a second
  composer.
- Help remains useful but contains no independent report form or response
  location.
- Reps can start and continue Support conversations for questions, bugs/issues,
  and ideas.
- Operators reply as Sparkle Suite Support from Control Center and can update
  truthful rep-visible status.
- Support Auditor, Google Chat notification, client snapshot, resolution lesson,
  and historical support data remain intact.
- A reviewed support report can be promoted exactly once to the durable Control
  Center Task List; unreviewed reports never become tasks automatically.
- Eligible subscribers can exchange controlled Rep Network message requests,
  and block/report/rate-limit rules work at UI, API, service, and database
  boundaries.
- Official Sparkle Suite broadcasts remain non-replyable and cannot be
  impersonated.
- Every slice has focused tests, synthetic reviewer fixtures, reset/reseed,
  database smoke, production build, exact-tip release provenance, and live-domain
  verification.
- A new reviewer can complete the seven friendly-interface acceptance tasks
  without coaching, and any observed confusion is resolved before release.

## Explicit non-goals

- customer-to-rep messaging;
- email or SMS delivery;
- browser/mobile push notifications;
- group chats, public channels, or community feeds;
- audio/video calls;
- file attachments outside private Support screenshots;
- searchable historical message bodies in the first release;
- automatic AI replies to reps;
- automatic conversion of every report/idea into a Task List item;
- exposing internal Task List notes, Support Auditor findings, or operator notes
  to reps;
- Sparkle Finder messaging or cross-product account unification;
- deleting legacy communication data during initial rollout.
