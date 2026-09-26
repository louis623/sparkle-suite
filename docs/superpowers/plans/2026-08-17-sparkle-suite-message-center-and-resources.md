# Sparkle Suite Message Center and Resource Library Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

**Status:** Proposed for implementation approval

**Date:** August 17, 2026

**Owner:** Louis / Neon Rabbit

**Rep role:** Receive only

**Delivery scope:** Sparkle Suite workspace only; no email, SMS, browser push, or customer delivery

## Goal

Build a durable Message Center at the top of the Sparkle Suite workspace where
reps receive owner broadcasts, approved agent messages, automation updates,
monthly business reports, and resource announcements. Add an internal
Communications Console to the Control Center and a database-backed blog/video
Resource Library to Workspace Tools.

## Locked product rules

- Reps are recipients only. They cannot compose, reply, forward, broadcast, or
  message one another.
- Louis, explicitly designated internal agents, and approved automations are the
  only message senders.
- The Message Center is standalone inside Sparkle Suite. Phase one has no email,
  SMS, external push notification, or customer-facing delivery.
- The Message Center is opened from a persistent workspace-header button with an
  unread badge. It is not restored as a primary bottom-navigation tab.
- Every recipient sees only messages assigned to that rep/workspace.
- Agents and automations do not write message rows directly. They call one
  application-owned publishing service with scoped capabilities, validation,
  idempotency, audience resolution, and an audit trail.
- Publishing, not saving a draft, is the event that notifies reps about a Help,
  FAQ, blog, or video change.
- Automated delivery must never block the underlying customer signup or content
  publication. Failed jobs remain retryable and visible to operators.
- Historical monthly reports are immutable snapshots. Reopening an old report
  must not silently recalculate it using newer data.

## Existing foundation to retain or replace deliberately

The repo already has a partial `rep_messages` table, a message read service,
`/api/nic-nac/messages`, and a hidden `Messages / Notifications` workspace card.
It also has customer-signup creation, birthday fields, static Help resources,
an operator-authenticated Control Center, and Vercel cron infrastructure.

The dormant message implementation is not the final contract:

- Its enum is too narrow for reports, resources, and automation events.
- It stores a full message per rep instead of separating one publication from
  its recipient delivery records.
- Its RLS policy permits rep-side `INSERT`, `UPDATE`, and `DELETE` on owned rows.
- Its API and UI currently allow a rep-to-Neon-Rabbit support request.
- Messages remain marked `Coming soon` under Tools instead of being accessible
  from the workspace header.

Implementation should preserve legitimate existing Neon-Rabbit-to-rep history,
remove the rep compose path at both UI and API layers, and migrate toward the
publication/delivery model below.

## Target architecture

### Message publications

One publication represents the content authored or generated once:

- sender kind: `owner`, `agent`, or `automation`
- sender identity and display label
- category: `business_update`, `monthly_report`, `customer_activity`,
  `platform_update`, `help_update`, `blog`, `video`, or `announcement`
- priority: `normal`, `important`, or `action_required`
- title, summary, structured body, and optional safe action link
- state: `draft`, `scheduled`, `publishing`, `published`, `cancelled`, or `failed`
- audience rule and frozen audience snapshot
- source object/event identifiers
- scheduled, published, and created timestamps
- idempotency key for automated publications

### Recipient deliveries

One delivery joins a publication to one rep and owns recipient state:

- delivered timestamp
- read timestamp
- archived timestamp
- optional first action-click timestamp
- unique constraint on publication plus rep

The publication body stays single-source while read/archive state stays
rep-specific.

### Durable event outbox

Customer signup, monthly report generation, and resource publication enqueue a
durable internal event. A bounded worker converts each event into a publication
through the same publishing service used by the Control Center.

The outbox provides:

- atomic event capture alongside the originating business change where practical
- retry count, next-attempt time, last error, and completion time
- deterministic idempotency keys
- no duplicate rep messages when a job or HTTP request retries
- an operator-visible failed-job state

### Resources

Move rep-facing Help/resource content from code-only constants toward durable,
versioned records:

- type: `help`, `faq`, `blog`, or `video`
- title, summary, body, category, tags, thumbnail, author, and action URL
- video provider and URL for video records
- state: `draft`, `published`, or `archived`
- version number and required plain-language change summary
- published and updated timestamps
- optional pin/featured controls

Existing workflow and feature Help resources retain their stable IDs when
seeded so current deep links and Nic-Nac resource lookup do not break.

## Authorization model

### Rep permissions

At the database and server boundary, a rep may only:

- select publications assigned to their own rep ID
- update their own delivery's `read_at` and `archived_at`

A rep may not insert, delete, edit content, change audience, change sender,
publish, schedule, or call the operator publishing API. The legacy
`create_support_request` action and its compose UI are removed; Help & Resources
keeps the existing dedicated support-report workflow.

### Owner and operator permissions

The Communications Console uses the existing independent Control Center
operator authentication. The server resolves operator identity; the browser
never supplies a trusted sender ID.

Louis can:

- create, preview, schedule, publish, cancel, and inspect publications
- target all reps, selected reps, or approved server-computed segments
- manage resources and publish revisions
- see recipient counts, read counts, failures, and automation jobs
- designate or revoke internal agent capabilities

### Agent and automation permissions

Use an explicit sender/capability registry. Examples:

- `resource_publisher`: may publish resource announcements only
- `monthly_reporter`: may publish one generated monthly report per rep/month
- `customer_signup_notifier`: may publish one new-signup message to the owning rep
- `operator_assistant`: may create drafts or publish only to approved audiences

Every capability has allowed categories, audience scope, source requirements,
and rate limits. Agent input is treated as untrusted content until the
application service validates it. Agents never receive general service-role
database access.

## Release slice 1: Receive-only Message Center and owner publishing

### Task 1.1 — Migration contract and legacy transition

Create a migration for:

- `workspace_message_publications`
- `workspace_message_deliveries`
- `workspace_message_audit_events`
- `workspace_message_outbox`
- `workspace_message_senders`

Add indexes for rep unread queries, publication status/schedule, idempotency,
failed outbox work, and operator history. Add strict RLS that proves a rep has
read/update-own-delivery access only.

Backfill legitimate existing `nr_to_rep` `rep_messages` rows as one-recipient
publications. Do not migrate `rep_to_nr` rows into the receive-only inbox.
Preserve the legacy table during a compatibility window, then stop all new
writes to it.

Expected files:

- `supabase/migrations/20260818xxxxxx_ss_workspace_message_center.sql`
- `tests/workspace-message-center-migration.test.ts`
- `tests/services/workspace-message-rls-contract.test.ts`

### Task 1.2 — Canonical message service

Create a server-only service with operations equivalent to:

- create/update draft
- preview and freeze audience
- publish now
- schedule publication
- cancel unpublished publication
- list a rep's deliveries
- mark own delivery read/unread and archive/unarchive
- list operator publications and delivery metrics
- enqueue/claim/complete/fail outbox work

Require an idempotency key for every automation call. Sanitize structured text,
reject raw executable HTML, allow only internal routes or validated `https`
links, and record all state transitions in the audit table.

Expected files:

- `lib/services/workspace-messages.ts`
- `lib/services/workspace-message-audience.ts`
- `lib/services/workspace-message-outbox.ts`
- `lib/services/workspace-message-permissions.ts`
- focused service tests under `tests/services/`

### Task 1.3 — Rep read API

Replace the mixed GET/POST route with a receive-only API:

- list with pagination, category, unread, and archive filters
- return an unread count separately or in the same response
- permit only read/archive state changes on an owned delivery
- return 403/405 for compose, reply, delete, or publication attempts

Keep the read endpoint on the normal paid-workspace auth boundary and add
cross-rep isolation tests.

Expected files:

- modify `app/api/nic-nac/messages/route.ts`
- add a narrow delivery-state route if clearer
- modify `tests/nic-nac-messages-route.test.ts`

### Task 1.4 — Workspace header and inbox experience

Add a persistent Message Center button to `WorkspaceAppHeader`, immediately
before the account/profile menu. It must show an unread dot/count and remain
reachable on mobile. Opening it sets the workspace section to `messages`.

Replace `Messages / Notifications` with `Message Center` and remove:

- `Coming soon`
- the backup support request composer
- every reply/send affordance

Add:

- All, Unread, Reports, Updates, and Resources filters
- clear unread/read treatment
- category and priority labels
- safe deep-link actions
- empty, loading, error, and archived states
- mark-one and mark-all-read controls
- accessible keyboard/focus behavior

Do not add Messages to the primary bottom navigation; the persistent header
entry satisfies the requested top-of-workspace placement.

Expected files:

- modify `app/nic-nac/components/DashboardPlaceholder.tsx`
- preferably extract `MessageCenterCard.tsx` and its CSS module
- modify workspace shell/header CSS and reviewer UI tests

### Task 1.5 — Control Center Communications Console

Add a dedicated `Messages` Control Center section instead of adding another
large block to the existing Support Inbox panel.

The first owner console includes:

- draft list and publication history
- recipient selector: all active reps or selected reps
- title, summary, body, category, priority, and optional action link
- rendered desktop/mobile preview
- frozen recipient count and named-recipient sample before send
- `Save draft`, `Send test`, `Publish now`, and optional `Schedule` actions
- explicit final confirmation for multi-rep publication
- read/delivery counts and exact sender/source audit details

`Send test` targets only the synthetic reviewer rep. It must never silently use
Louis's personal workspace or a customer account.

Expected files:

- `app/control-center/messages/page.tsx` or a dedicated routed section
- `app/control-center/_components/CommunicationsConsole.tsx`
- `app/api/control-center/messages/route.ts`
- operator route/component tests

### Slice 1 acceptance

- A rep can open Message Center from the workspace header on desktop and mobile.
- A rep can read/archive only their own messages and cannot send or reply by UI,
  API, or direct RLS-authorized writes.
- Louis can preview and publish one message to a selected synthetic rep and one
  message to an approved test audience.
- A repeated publish request cannot create duplicate deliveries.
- Legacy Neon-Rabbit-to-rep message history remains readable where valid.

## Release slice 2: New customer signup automation

### Task 2.1 — Define the exact trigger

Create this message only for a successful public customer-site signup handled by
`createCustomerAudienceSignup` when a genuinely new `customer_audience` row is
created.

Do not fire for:

- rep-created manual contacts
- Nic-Nac-created contacts
- CSV/Excel imports
- edits to an existing contact
- duplicate/retried form submissions that resolve to the same signup

The event contains the owning rep ID, new audience ID, safe display name,
signup timestamp, and captured preference-field names. It must not copy address,
private notes, full phone, or full email into the message body.

### Task 2.2 — Transactional event and template

Update the signup write so the new contact and `customer_signup_created` outbox
event are committed together. If the worker is unavailable, the signup remains
saved and the event retries later.

Suggested message:

- Category: Customer activity
- Title: `New customer joined your list`
- Summary: `[First name] signed up through your customer site.`
- Action: open Customer List focused on the new record
- Idempotency: `customer-signup:{audience_id}`

### Task 2.3 — Verification

Tests must prove:

- exactly one notification for one new public signup
- retry produces no duplicate publication or delivery
- correct rep isolation
- no notification for manual/import/Nic-Nac creation
- signup succeeds when worker delivery is delayed
- the action link opens the correct rep-scoped customer record
- synthetic signup and message data can be reset cleanly

## Release slice 3: Beginning-of-month business report

### Task 3.1 — Metric registry and time contract

Before writing report copy, inventory every rep-meaningful metric Sparkle Suite
reliably tracks and define each in one registry:

- display label and plain-language definition
- source table/service
- previous-calendar-month boundary behavior
- rep/workspace scope
- aggregation type
- whether zero is meaningful or the metric is unavailable
- privacy classification

Initial registry candidates include:

- Customer List: starting/ending total, new contacts, public signups, manual
  additions, reachable/consented counts, and opt-outs where applicable
- customer birthdays occurring in the new current month
- Trade Board: listings added, active listings at month end, requests received,
  approved/rejected requests, and fulfillment status changes
- Calendar: shows scheduled, completed, cancelled, and upcoming shows
- customer-site analytics already exposed in Account: page views, unique visitors,
  top source/device, and operational snapshot values
- referrals, support activity, recipes, Team Management, or other features only
  when the source is durable, rep-relevant, and available for that account

Do not manufacture metrics from incomplete event history. The report should say
`Not tracked for this month` rather than show a misleading zero.

Use the rep's stored timezone when available; otherwise use Sparkle Suite's
documented default of `America/New_York`. The previous month and current birthday
month are calculated from that timezone.

### Task 3.2 — Immutable monthly snapshot

Create `workspace_monthly_report_snapshots` keyed by rep plus report month. Store:

- previous-month start/end timestamps and timezone
- generated metric values and unavailable reasons
- current-month birthday entries (name, month/day, customer ID)
- generator version
- generated timestamp
- linked publication ID

Idempotency key:

`monthly-report:{rep_id}:{YYYY-MM}`

The rendered message can contain summary cards and sections while the snapshot
preserves the exact data used.

### Task 3.3 — Monthly scheduler and recovery

Add a Vercel cron that enqueues reports at the beginning of each month. Prefer a
small recurring scheduler that evaluates each rep's local timezone and claims
one due report, rather than assuming every rep shares one UTC boundary.

The job must support:

- safe dry-run with recipient count and proposed report month
- bounded batch size and continuation
- retry without duplicates
- per-rep failure isolation
- operator rerun for one rep/month
- late generation when the first scheduled run was missed

### Task 3.4 — Report presentation

Render monthly reports as a structured Message Center report, not a long plain
paragraph:

- `Last month at a glance`
- metric groups with zero/unavailable clarity
- `Birthdays this month`
- direct links to the Customer List birthday filter and relevant tools
- generated date and reporting period

Avoid placing customer addresses, contact details, private notes, or cross-rep
comparisons in the report.

### Task 3.5 — Verification

Cover:

- month/year rollover and leap-year boundaries
- timezone boundaries
- zero activity and unavailable metrics
- no birthdays and multiple birthdays
- inactive/cancelled account handling
- one immutable report per rep/month
- rerun/retry idempotency
- exact database snapshot-to-rendered-message agreement
- safe reviewer seed and reset

## Release slice 4: Blog, video, FAQ, and Help publication

### Task 4.1 — Resource schema and migration

Create:

- `workspace_resources`
- `workspace_resource_revisions`
- resource publication/audience fields where needed

Seed current Help/workflow resources using their existing stable IDs. Preserve
current search, grouping, Nic-Nac lookup, and deep links during the transition
from `lib/services/help-resources.ts`.

### Task 4.2 — Control Center Resource Publisher

Add a `Resources` Control Center section that can create and manage:

- blog posts
- video resources
- FAQ entries
- rep Help/workflow guides

Publishing requires a title, summary, category, content/type-specific fields,
and a plain-language `What changed` summary for revisions. Draft saves do not
notify anyone.

For blog/video publication, create a Resource announcement automatically.
For FAQ/Help revision publication, create a Help update automatically. Both use
the message outbox in the same publication transaction.

Suggested idempotency keys:

- `resource-published:{resource_id}:{version}`
- `help-updated:{resource_id}:{version}`

### Task 4.3 — Workspace Tools Resource Library

Add a top-level Resource Library card within Tools with:

- Blog and Videos sections
- category filters and search
- New and Featured labels
- thumbnail, summary, published date, and author
- internal detail view or validated external video action
- persistent links back from Message Center announcements

Keep Help & Resources as the workflow playbook. The new Blog/Video library is a
learning/news surface, not a replacement for operational Help.

### Task 4.4 — Nic-Nac resource compatibility

Update resource lookup so Nic-Nac can search published resources but cannot
publish, edit, or announce them unless its sender capability explicitly permits
that action. App code owns publication truth and message creation.

### Task 4.5 — Verification

Prove:

- draft save creates no message
- first publish creates one Resource announcement
- published revision creates one update with the required change summary
- retry creates no duplicate
- archived/unpublished resources disappear from rep browsing without deleting
  historical message records
- deep links open the correct published resource
- unsafe video/action URLs are rejected
- mobile and desktop layouts are readable and keyboard accessible

## Cross-cutting quality and safety gates

### Automated tests

- migration contract and RLS isolation
- service validation, audience freezing, and audit events
- receive-only rep API negative tests
- owner/operator auth and agent capability tests
- outbox claim/retry/idempotency/concurrency tests
- customer-signup automation tests
- monthly metric/snapshot/timezone tests
- resource publish/revision tests
- workspace header, badge, filters, and responsive rendering tests
- Control Center preview and mass-publish confirmation tests

### Reviewer smoke mode

Add a synthetic Message Center review fixture with reset/reseed support:

- one owner announcement
- one new-customer event
- one monthly report with birthdays
- one blog and one video resource announcement
- read and unread deliveries

The smoke path must not send to real reps, change a customer account, or use
Louis's personal workspace. If the existing too-short reviewer-token issue still
blocks authenticated verification, record it rather than bypassing it.

### Observability

Log and expose:

- publication ID, sender, category, and source
- audience rule and frozen recipient count
- delivery/read counts
- idempotency key
- outbox attempts and last error
- monthly generator version and metric availability
- resource/version linked to an announcement

Never log full customer contact details or private notes in automation telemetry.

## Recommended implementation order

1. Land migration/RLS and service tests.
2. Remove the rep-to-owner compose path and launch the receive-only header inbox.
3. Launch owner-only manual publishing to synthetic/selected recipients.
4. Add customer-signup outbox automation.
5. Build the metric registry and launch monthly snapshots/reports.
6. Migrate Help resources and launch the Control Center Resource Publisher.
7. Add Blog/Video browsing to Workspace Tools and automatic announcements.
8. Run focused tests, production build, Supabase migration verification, reviewer
   smoke, and live-domain smoke for each release slice.

## Release requirements for each application slice

For every approved implementation slice:

1. Verify the allowlisted repo, branch, remote, exact HEAD, Vercel project, and
   intended domains.
2. Run focused tests and `npm run build`.
3. Apply and verify any additive Supabase migration.
4. Commit and push the exact verified branch tip.
5. Run one manual Vercel production deployment of that exact tip; a Git push is
   provenance only because automatic Git deployment creation is disabled.
6. Confirm `www.yoursparklesuite.com` and `yoursparklesuite.com` resolve to that
   deployment.
7. Smoke the exact live workflow with synthetic reviewer data and verify reset.

## Definition of done

- The Message Center is visibly available at the top of every rep workspace.
- Rep sending/replying is impossible at UI, API, service, and RLS layers.
- Louis can safely preview and publish mass messages from the Control Center.
- Designated agents/automations can publish only through scoped capabilities.
- A genuinely new public Customer List signup creates exactly one rep message.
- Each eligible rep receives one immutable beginning-of-month report containing
  all reliable rep-relevant tracked metrics plus current-month birthdays.
- Publishing a new blog/video or Help/FAQ revision creates exactly one linked
  Message Center update.
- Blog and Video resources are usable from Workspace Tools.
- Every flow has synthetic reviewer data, reset/reseed, audit evidence, focused
  tests, and live-domain verification.

## Explicit non-goals for this plan

- email, SMS, browser push, or mobile push delivery
- rep replies, direct messages, group chats, or rep-to-rep communication
- customer-facing Message Center access
- automated marketing campaigns to Customer List contacts
- free-form agent database writes or unrestricted service-role credentials
- deleting historical publications merely because a resource is later archived
