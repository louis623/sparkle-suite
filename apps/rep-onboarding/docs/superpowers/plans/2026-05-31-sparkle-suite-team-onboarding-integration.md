# Sparkle Suite Team Onboarding Integration Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Historical terminology note (September 4, 2026): the product name is **Team Management**. Older “Manage My Team” wording below describes the same feature and is retained only as historical plan context.

**Goal:** Connect the Britt with Bling onboarding site questions to Sparkle Suite so Brittany can manage new-rep questions inside her Team Management workspace.

**Architecture:** Sparkle Suite becomes the source of truth for team onboarding questions, team members, and onboarding site registrations. The training site submits public questions to a guarded Sparkle Suite API, while the authenticated Sparkle Suite Team Management section reads and manages those questions for the correct team lead. The preferred long-term host model is same-origin inside Sparkle Suite; a cross-origin Vercel demo bridge is included for the current standalone training site.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase Postgres/RLS, Supabase SSR auth, Vite React demo site, Vitest, Vercel deployments.

---

## Research Findings

Sparkle Suite lives in `C:\Users\louis\neon-rabbit-core`. The current Team Management surface is a locked placeholder in `C:\Users\louis\neon-rabbit-core\app\nic-nac\components\DashboardPlaceholder.tsx`.

Relevant current files:

- `C:\Users\louis\neon-rabbit-core\app\nic-nac\components\DashboardPlaceholder.tsx`
  - `WORKSPACE_SECTIONS` includes `{ key: 'team-management', label: 'Team Management', subtitle: 'Paid add-on for team onboarding and messages', locked: true }`.
  - `TeamManagementCard()` currently renders:
    - Team member intake
    - Team directory
    - Onboarding website messages
    - Disabled reply composer
  - This is the correct UI slot for the new question inbox.
- `C:\Users\louis\neon-rabbit-core\tests\nic-nac-dashboard-placeholder.test.ts`
  - Currently verifies the locked Team Management skeleton.
  - This test should be extended rather than abandoned.
- `C:\Users\louis\neon-rabbit-core\app\api\nic-nac\messages\route.ts`
  - Shows the authenticated paid-workspace API pattern.
  - Uses `getPaidNicNacContext()`, service-layer helpers, and `ServiceError` responses.
- `C:\Users\louis\neon-rabbit-core\lib\nic-nac\auth.ts`
  - Provides `getPaidNicNacContext()`.
  - Use this for authenticated Team Management APIs.
- `C:\Users\louis\neon-rabbit-core\lib\prelaunch\request-guard.ts`
  - Has a simple honeypot and per-IP rate limit.
  - This is a good pattern for public onboarding question intake.
- `C:\Users\louis\neon-rabbit-core\lib\amethyst\request-rep-target.ts`
  - Shows how customer-facing public routes infer a rep from request context.
  - The onboarding question route should be stricter and use an onboarding site slug/token, because rep questions are private team-lead data.
- `C:\Users\louis\neon-rabbit-core\supabase\migrations\006_sparkle_suite_schema.sql`
  - Existing `rep_messages` is for Neon Rabbit/support-style workspace messages.
  - Do not overload it for onboarding questions; the status, source, team member, onboarding site, and step context are different enough to deserve first-class tables.

Current training site lives in `C:\Users\louis\britt-with-bling-start-strong`.

Relevant current files:

- `C:\Users\louis\britt-with-bling-start-strong\src\App.tsx`
  - Adds questions locally through `addQuestion()` and `addNicNacQuestion()`.
- `C:\Users\louis\britt-with-bling-start-strong\src\state.ts`
  - Stores questions in localStorage under `bwb-start-strong-state-v1`.
- `C:\Users\louis\britt-with-bling-start-strong\src\types.ts`
  - `RepQuestion` has `id`, `stepId`, `text`, `status`, `source`, and `createdAt`.
- `C:\Users\louis\britt-with-bling-start-strong\src\components\Questions.tsx`
  - Displays locally saved questions.

## Recommended Communication Model

Use this order of preference:

1. **Best long-term:** Move hosted onboarding sites into Sparkle Suite, for example `/team-training/[siteSlug]` or a mapped custom domain that serves the Sparkle Suite app. This keeps question submission same-origin, avoids CORS, and lets Sparkle Suite own data, routing, entitlement, and analytics.
2. **Best transitional demo:** Keep `britt-with-bling-start-strong.vercel.app` as a standalone Vite app, but submit questions to a Sparkle Suite public API with:
   - a per-site public token,
   - strict CORS allowlist,
   - honeypot field,
   - rate limit by site and IP,
   - no Supabase service key in the Vite app.
3. **Avoid:** Direct Supabase writes from the Vite training site. It makes validation, abuse controls, token rotation, and team-lead isolation harder than necessary.

## Data Model

Create first-class Team Onboarding tables in Sparkle Suite:

- `team_onboarding_sites`
  - One row per team lead training site.
  - Example: Britt with Bling onboarding site.
- `team_members`
  - Optional directory of the team lead's new reps.
  - Useful for future “Manage My Team” workflows.
- `team_onboarding_questions`
  - One row per saved question from an onboarding site.
  - This is the main Phase 2 bridge.
- `team_onboarding_question_events`
  - Simple audit trail for question submission, status changes, and answers.

Questions should initially land in Sparkle Suite only. Do not promise email/SMS replies to reps until there is an authenticated or consented communication channel.

## File Structure

Sparkle Suite files to create or modify:

- Create: `C:\Users\louis\neon-rabbit-core\supabase\migrations\20260531_team_onboarding.sql`
  - Tables, constraints, indexes, RLS policies.
- Create: `C:\Users\louis\neon-rabbit-core\lib\team-onboarding\request-guard.ts`
  - Public route honeypot/rate limit/CORS helpers.
- Create: `C:\Users\louis\neon-rabbit-core\lib\services\team-onboarding.ts`
  - Service functions for creating and managing questions.
- Modify: `C:\Users\louis\neon-rabbit-core\lib\services\types.ts`
  - Export Team Onboarding types used by services, routes, and UI.
- Create: `C:\Users\louis\neon-rabbit-core\app\api\team-onboarding\questions\route.ts`
  - Public route called by onboarding sites.
- Create: `C:\Users\louis\neon-rabbit-core\app\api\nic-nac\team-onboarding\questions\route.ts`
  - Authenticated Sparkle Suite route used by Team Management.
- Modify: `C:\Users\louis\neon-rabbit-core\app\nic-nac\components\DashboardPlaceholder.tsx`
  - Load Team Management data and render a real question inbox when available.
- Modify: `C:\Users\louis\neon-rabbit-core\app\nic-nac\components\DashboardPlaceholder.module.css`
  - Add inbox, status, and site cards.
- Modify: `C:\Users\louis\neon-rabbit-core\tests\nic-nac-dashboard-placeholder.test.ts`
  - Preserve locked-state coverage and add ready-state rendering coverage.
- Create: `C:\Users\louis\neon-rabbit-core\tests\team-onboarding-service.test.ts`
  - Service unit coverage.
- Create: `C:\Users\louis\neon-rabbit-core\tests\team-onboarding-routes.test.ts`
  - Route coverage for public and authenticated paths.

Training site files to create or modify:

- Create: `C:\Users\louis\britt-with-bling-start-strong\.env.example`
  - Demo integration environment variables.
- Create: `C:\Users\louis\britt-with-bling-start-strong\src\services\questions.ts`
  - Question submission client.
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\types.ts`
  - Add remote sync fields to `RepQuestion`.
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\state.ts`
  - Preserve local fallback while tracking remote submission state.
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\App.tsx`
  - Submit questions to Sparkle Suite when configured.
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\components\Questions.tsx`
  - Show clear plain-English delivery status.

---

### Task 1: Add Team Onboarding Database Schema

**Files:**
- Create: `C:\Users\louis\neon-rabbit-core\supabase\migrations\20260531_team_onboarding.sql`

- [ ] **Step 1: Create the migration file**

Create `C:\Users\louis\neon-rabbit-core\supabase\migrations\20260531_team_onboarding.sql` with:

```sql
CREATE TYPE team_onboarding_site_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE team_onboarding_question_status AS ENUM ('open', 'answered', 'archived');
CREATE TYPE team_onboarding_question_source AS ENUM ('rep_button', 'nic_nac', 'manual');

CREATE TABLE team_onboarding_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  public_origin TEXT,
  public_url TEXT,
  site_token_hash TEXT NOT NULL,
  status team_onboarding_site_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_onboarding_sites_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,80}$'),
  CONSTRAINT team_onboarding_sites_display_name_present CHECK (length(trim(display_name)) > 0)
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  onboarding_site_id UUID REFERENCES team_onboarding_sites(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  team_name TEXT,
  social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_members_name_present CHECK (length(trim(name)) > 0),
  CONSTRAINT team_members_status_valid CHECK (status IN ('active', 'paused', 'archived'))
);

CREATE TABLE team_onboarding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  onboarding_site_id UUID NOT NULL REFERENCES team_onboarding_sites(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  submitter_name TEXT,
  submitter_email TEXT,
  submitter_phone TEXT,
  step_id TEXT,
  step_title TEXT,
  question_text TEXT NOT NULL,
  source team_onboarding_question_source NOT NULL,
  status team_onboarding_question_status NOT NULL DEFAULT 'open',
  answer_text TEXT,
  answered_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_onboarding_questions_text_present CHECK (length(trim(question_text)) > 0),
  CONSTRAINT team_onboarding_questions_text_length CHECK (length(question_text) <= 2000)
);

CREATE TABLE team_onboarding_question_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES team_onboarding_questions(id) ON DELETE CASCADE,
  lead_rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_onboarding_question_events_type_present CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX team_onboarding_sites_lead_rep_idx ON team_onboarding_sites(lead_rep_id);
CREATE INDEX team_members_lead_rep_idx ON team_members(lead_rep_id);
CREATE INDEX team_onboarding_questions_lead_rep_status_idx
  ON team_onboarding_questions(lead_rep_id, status, created_at DESC);
CREATE INDEX team_onboarding_questions_site_idx ON team_onboarding_questions(onboarding_site_id);
CREATE INDEX team_onboarding_question_events_question_idx ON team_onboarding_question_events(question_id, created_at DESC);

ALTER TABLE team_onboarding_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_onboarding_question_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_onboarding_sites_own_data ON team_onboarding_sites
  FOR ALL TO authenticated
  USING (lead_rep_id IN (SELECT id FROM reps WHERE auth_user_id = auth.uid()))
  WITH CHECK (lead_rep_id IN (SELECT id FROM reps WHERE auth_user_id = auth.uid()));

CREATE POLICY team_members_own_data ON team_members
  FOR ALL TO authenticated
  USING (lead_rep_id IN (SELECT id FROM reps WHERE auth_user_id = auth.uid()))
  WITH CHECK (lead_rep_id IN (SELECT id FROM reps WHERE auth_user_id = auth.uid()));

CREATE POLICY team_onboarding_questions_own_data ON team_onboarding_questions
  FOR ALL TO authenticated
  USING (lead_rep_id IN (SELECT id FROM reps WHERE auth_user_id = auth.uid()))
  WITH CHECK (lead_rep_id IN (SELECT id FROM reps WHERE auth_user_id = auth.uid()));

CREATE POLICY team_onboarding_question_events_own_data ON team_onboarding_question_events
  FOR ALL TO authenticated
  USING (lead_rep_id IN (SELECT id FROM reps WHERE auth_user_id = auth.uid()))
  WITH CHECK (lead_rep_id IN (SELECT id FROM reps WHERE auth_user_id = auth.uid()));
```

- [ ] **Step 2: Run migration checks**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
supabase migration list
```

Expected: The new migration appears locally and no migration parse error is reported.

- [ ] **Step 3: Commit the migration**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
git add supabase/migrations/20260531_team_onboarding.sql
git commit -m "feat: add team onboarding schema"
```

Expected: A commit is created with only the schema migration.

### Task 2: Define Team Onboarding Types

**Files:**
- Modify: `C:\Users\louis\neon-rabbit-core\lib\services\types.ts`

- [ ] **Step 1: Add shared type exports**

Add these exports near the existing service types in `C:\Users\louis\neon-rabbit-core\lib\services\types.ts`:

```ts
export type TeamOnboardingSiteStatus = 'active' | 'paused' | 'archived'
export type TeamOnboardingQuestionStatus = 'open' | 'answered' | 'archived'
export type TeamOnboardingQuestionSource = 'rep_button' | 'nic_nac' | 'manual'

export type TeamOnboardingSite = {
  id: string
  leadRepId: string
  slug: string
  displayName: string
  publicOrigin: string | null
  publicUrl: string | null
  status: TeamOnboardingSiteStatus
  createdAt: string
  updatedAt: string
}

export type TeamMember = {
  id: string
  leadRepId: string
  onboardingSiteId: string | null
  name: string
  phone: string | null
  email: string | null
  teamName: string | null
  socialLinks: string[]
  status: 'active' | 'paused' | 'archived'
  createdAt: string
  updatedAt: string
}

export type TeamOnboardingQuestion = {
  id: string
  leadRepId: string
  onboardingSiteId: string
  teamMemberId: string | null
  submitterName: string | null
  submitterEmail: string | null
  submitterPhone: string | null
  stepId: string | null
  stepTitle: string | null
  questionText: string
  source: TeamOnboardingQuestionSource
  status: TeamOnboardingQuestionStatus
  answerText: string | null
  answeredAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TeamOnboardingQuestionInput = {
  siteSlug: string
  siteToken: string
  submitterName?: string
  submitterEmail?: string
  submitterPhone?: string
  stepId?: string | null
  stepTitle?: string | null
  questionText: string
  source: TeamOnboardingQuestionSource
  website?: string
}
```

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npx tsc --noEmit --pretty false
```

Expected: TypeScript still passes, or only unrelated pre-existing issues are reported and documented.

- [ ] **Step 3: Commit the types**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
git add lib/services/types.ts
git commit -m "feat: add team onboarding service types"
```

Expected: A focused commit with the type additions.

### Task 3: Build Public Request Guard Helpers

**Files:**
- Create: `C:\Users\louis\neon-rabbit-core\lib\team-onboarding\request-guard.ts`

- [ ] **Step 1: Create request guard helper**

Create `C:\Users\louis\neon-rabbit-core\lib\team-onboarding\request-guard.ts`:

```ts
import { ServiceError } from '@/lib/services/errors'

const WINDOW_MS = 60_000
const MAX_SUBMISSIONS_PER_WINDOW = 6
const buckets = new Map<string, number[]>()

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

function prune(entries: number[], now: number) {
  return entries.filter((timestamp) => now - timestamp < WINDOW_MS)
}

function readPayloadObject(payload: unknown) {
  return payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>)
    : {}
}

export function assertTeamOnboardingRequestAllowed(args: {
  payload: unknown
  request: Request
  siteSlug: string
}) {
  const payload = readPayloadObject(args.payload)
  const honeypot = readString(payload.website).trim()

  if (honeypot) {
    throw new ServiceError({
      code: 'SPAM_SUBMISSION',
      message: `team onboarding honeypot field was filled for ${args.siteSlug}`,
      userMessage: 'Question could not be saved.',
      statusCode: 400,
    })
  }

  const key = `team-onboarding:${args.siteSlug}:${getClientAddress(args.request)}`
  const now = Date.now()
  const recent = prune(buckets.get(key) ?? [], now)

  if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    buckets.set(key, recent)
    throw new ServiceError({
      code: 'RATE_LIMITED',
      message: `team onboarding question rate limit reached for ${args.siteSlug}`,
      userMessage: 'Please wait a minute and try again.',
      statusCode: 429,
    })
  }

  buckets.set(key, [...recent, now])
}

export function buildTeamOnboardingCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  const allowedOrigins = (process.env.TEAM_ONBOARDING_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (!origin || !allowedOrigins.includes(origin)) return {}

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
  }
}

export function resetTeamOnboardingRequestGuardForTests() {
  buckets.clear()
}
```

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npx tsc --noEmit --pretty false
```

Expected: TypeScript passes.

- [ ] **Step 3: Commit**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
git add lib/team-onboarding/request-guard.ts
git commit -m "feat: guard team onboarding submissions"
```

Expected: A focused commit with the guard helper.

### Task 4: Build Team Onboarding Service Layer

**Files:**
- Create: `C:\Users\louis\neon-rabbit-core\lib\services\team-onboarding.ts`
- Test: `C:\Users\louis\neon-rabbit-core\tests\team-onboarding-service.test.ts`

- [ ] **Step 1: Write service tests**

Create `C:\Users\louis\neon-rabbit-core\tests\team-onboarding-service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import {
  createTeamOnboardingQuestion,
  getTeamOnboardingQuestions,
  updateTeamOnboardingQuestionStatus,
} from '@/lib/services/team-onboarding'

function createQueryBuilder(result: { data?: unknown; error?: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

describe('team onboarding service', () => {
  it('creates a question for an active onboarding site', async () => {
    const siteBuilder = createQueryBuilder({
      data: {
        id: 'site-1',
        lead_rep_id: 'rep-1',
        slug: 'britt-with-bling',
        display_name: 'Britt with Bling',
        public_origin: 'https://britt-with-bling-start-strong.vercel.app',
        public_url: 'https://britt-with-bling-start-strong.vercel.app',
        site_token_hash: 'demo-token',
        status: 'active',
        created_at: '2026-05-31T10:00:00.000Z',
        updated_at: '2026-05-31T10:00:00.000Z',
      },
    })
    const insertBuilder = createQueryBuilder({
      data: {
        id: 'question-1',
        lead_rep_id: 'rep-1',
        onboarding_site_id: 'site-1',
        team_member_id: null,
        submitter_name: 'Sarah',
        submitter_email: null,
        submitter_phone: null,
        step_id: 'start-bpu',
        step_title: 'Start Bomb Party University',
        question_text: 'Where do I find BPU?',
        source: 'rep_button',
        status: 'open',
        answer_text: null,
        answered_at: null,
        archived_at: null,
        created_at: '2026-05-31T10:01:00.000Z',
        updated_at: '2026-05-31T10:01:00.000Z',
      },
    })
    const eventBuilder = createQueryBuilder({ data: null })
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(siteBuilder)
        .mockReturnValueOnce(insertBuilder)
        .mockReturnValueOnce(eventBuilder),
    }

    const result = await createTeamOnboardingQuestion(supabase as never, {
      siteSlug: 'britt-with-bling',
      siteToken: 'demo-token',
      submitterName: 'Sarah',
      stepId: 'start-bpu',
      stepTitle: 'Start Bomb Party University',
      questionText: 'Where do I find BPU?',
      source: 'rep_button',
    })

    expect(result.id).toBe('question-1')
    expect(result.status).toBe('open')
    expect(insertBuilder.insert).toHaveBeenCalledWith({
      lead_rep_id: 'rep-1',
      onboarding_site_id: 'site-1',
      submitter_name: 'Sarah',
      submitter_email: null,
      submitter_phone: null,
      step_id: 'start-bpu',
      step_title: 'Start Bomb Party University',
      question_text: 'Where do I find BPU?',
      source: 'rep_button',
    })
  })

  it('rejects an empty question', async () => {
    await expect(
      createTeamOnboardingQuestion({} as never, {
        siteSlug: 'britt-with-bling',
        siteToken: 'demo-token',
        questionText: ' ',
        source: 'rep_button',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })

  it('lists questions for the authenticated lead rep', async () => {
    const builder = createQueryBuilder({
      data: [
        {
          id: 'question-1',
          lead_rep_id: 'rep-1',
          onboarding_site_id: 'site-1',
          team_member_id: null,
          submitter_name: 'Sarah',
          submitter_email: null,
          submitter_phone: null,
          step_id: 'ship-orders',
          step_title: 'Ship first orders',
          question_text: 'Do I merge orders first?',
          source: 'nic_nac',
          status: 'open',
          answer_text: null,
          answered_at: null,
          archived_at: null,
          created_at: '2026-05-31T10:01:00.000Z',
          updated_at: '2026-05-31T10:01:00.000Z',
        },
      ],
    })
    const supabase = { from: vi.fn(() => builder) }

    const result = await getTeamOnboardingQuestions(supabase as never, 'rep-1', {
      status: 'open',
      limit: 20,
    })

    expect(result.questions).toHaveLength(1)
    expect(builder.eq).toHaveBeenCalledWith('lead_rep_id', 'rep-1')
    expect(builder.eq).toHaveBeenCalledWith('status', 'open')
  })

  it('updates question status for the authenticated lead rep', async () => {
    const builder = createQueryBuilder({
      data: {
        id: 'question-1',
        lead_rep_id: 'rep-1',
        onboarding_site_id: 'site-1',
        team_member_id: null,
        submitter_name: null,
        submitter_email: null,
        submitter_phone: null,
        step_id: null,
        step_title: null,
        question_text: 'Can I buy a lot of inventory?',
        source: 'rep_button',
        status: 'answered',
        answer_text: 'Ask Brittany before making a large buy.',
        answered_at: '2026-05-31T10:10:00.000Z',
        archived_at: null,
        created_at: '2026-05-31T10:01:00.000Z',
        updated_at: '2026-05-31T10:10:00.000Z',
      },
    })
    const supabase = { from: vi.fn(() => builder) }

    const result = await updateTeamOnboardingQuestionStatus(supabase as never, 'rep-1', {
      questionId: 'question-1',
      status: 'answered',
      answerText: 'Ask Brittany before making a large buy.',
    })

    expect(result.status).toBe('answered')
    expect(builder.eq).toHaveBeenCalledWith('id', 'question-1')
    expect(builder.eq).toHaveBeenCalledWith('lead_rep_id', 'rep-1')
  })
})
```

- [ ] **Step 2: Run the failing service tests**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npm exec vitest run tests/team-onboarding-service.test.ts
```

Expected: FAIL because `@/lib/services/team-onboarding` does not exist yet.

- [ ] **Step 3: Implement service layer**

Create `C:\Users\louis\neon-rabbit-core\lib\services\team-onboarding.ts`:

```ts
import crypto from 'node:crypto'

import { ServiceError } from '@/lib/services/errors'
import type {
  TeamOnboardingQuestion,
  TeamOnboardingQuestionInput,
  TeamOnboardingQuestionStatus,
} from '@/lib/services/types'

type SupabaseLike = {
  from: (table: string) => any
}

type QuestionFilters = {
  status?: TeamOnboardingQuestionStatus
  limit?: number
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function nullableString(value: unknown) {
  const text = readString(value)
  return text || null
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function normalizeQuestion(row: any): TeamOnboardingQuestion {
  return {
    id: row.id,
    leadRepId: row.lead_rep_id,
    onboardingSiteId: row.onboarding_site_id,
    teamMemberId: row.team_member_id,
    submitterName: row.submitter_name,
    submitterEmail: row.submitter_email,
    submitterPhone: row.submitter_phone,
    stepId: row.step_id,
    stepTitle: row.step_title,
    questionText: row.question_text,
    source: row.source,
    status: row.status,
    answerText: row.answer_text,
    answeredAt: row.answered_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function assertInput(input: TeamOnboardingQuestionInput) {
  if (!readString(input.siteSlug)) {
    throw new ServiceError({
      code: 'INVALID_INPUT',
      message: 'siteSlug is required',
      userMessage: 'Training site is not configured yet.',
      statusCode: 400,
    })
  }

  if (!readString(input.siteToken)) {
    throw new ServiceError({
      code: 'INVALID_INPUT',
      message: 'siteToken is required',
      userMessage: 'Training site is not configured yet.',
      statusCode: 400,
    })
  }

  const questionText = readString(input.questionText)
  if (!questionText) {
    throw new ServiceError({
      code: 'INVALID_INPUT',
      message: 'questionText is required',
      userMessage: 'Please write a question first.',
      statusCode: 400,
    })
  }

  if (questionText.length > 2000) {
    throw new ServiceError({
      code: 'INVALID_INPUT',
      message: 'questionText is too long',
      userMessage: 'Please shorten the question and try again.',
      statusCode: 400,
    })
  }
}

export async function createTeamOnboardingQuestion(
  supabase: SupabaseLike,
  input: TeamOnboardingQuestionInput,
) {
  assertInput(input)

  const siteSlug = readString(input.siteSlug)
  const siteTokenHash = hashToken(readString(input.siteToken))

  const { data: site, error: siteError } = await supabase
    .from('team_onboarding_sites')
    .select('id, lead_rep_id, slug, display_name, public_origin, public_url, site_token_hash, status, created_at, updated_at')
    .eq('slug', siteSlug)
    .eq('site_token_hash', siteTokenHash)
    .maybeSingle()

  if (siteError) {
    throw new ServiceError({
      code: 'DATABASE_ERROR',
      message: 'Failed to load onboarding site',
      userMessage: 'Question could not be saved.',
      statusCode: 500,
      cause: siteError,
    })
  }

  if (!site || site.status !== 'active') {
    throw new ServiceError({
      code: 'UNAUTHORIZED',
      message: `Onboarding site not found or inactive: ${siteSlug}`,
      userMessage: 'Training site is not accepting questions yet.',
      statusCode: 401,
    })
  }

  const { data: question, error: insertError } = await supabase
    .from('team_onboarding_questions')
    .insert({
      lead_rep_id: site.lead_rep_id,
      onboarding_site_id: site.id,
      submitter_name: nullableString(input.submitterName),
      submitter_email: nullableString(input.submitterEmail),
      submitter_phone: nullableString(input.submitterPhone),
      step_id: nullableString(input.stepId),
      step_title: nullableString(input.stepTitle),
      question_text: readString(input.questionText),
      source: input.source,
    })
    .select('*')
    .maybeSingle()

  if (insertError || !question) {
    throw new ServiceError({
      code: 'DATABASE_ERROR',
      message: 'Failed to insert onboarding question',
      userMessage: 'Question could not be saved.',
      statusCode: 500,
      cause: insertError,
    })
  }

  await supabase.from('team_onboarding_question_events').insert({
    question_id: question.id,
    lead_rep_id: site.lead_rep_id,
    event_type: 'submitted',
    event_note: `Submitted from ${siteSlug}`,
  })

  return normalizeQuestion(question)
}

export async function getTeamOnboardingQuestions(
  supabase: SupabaseLike,
  leadRepId: string,
  filters: QuestionFilters = {},
) {
  let query = supabase
    .from('team_onboarding_questions')
    .select('*')
    .eq('lead_rep_id', leadRepId)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)

  const limit = filters.limit && Number.isFinite(filters.limit)
    ? Math.max(1, Math.min(filters.limit, 100))
    : 50

  const { data, error } = await query.limit(limit)

  if (error) {
    throw new ServiceError({
      code: 'DATABASE_ERROR',
      message: 'Failed to load onboarding questions',
      userMessage: 'Questions could not be loaded.',
      statusCode: 500,
      cause: error,
    })
  }

  return { questions: (data ?? []).map(normalizeQuestion) }
}

export async function updateTeamOnboardingQuestionStatus(
  supabase: SupabaseLike,
  leadRepId: string,
  input: {
    questionId: string
    status: TeamOnboardingQuestionStatus
    answerText?: string
  },
) {
  const questionId = readString(input.questionId)
  if (!questionId) {
    throw new ServiceError({
      code: 'INVALID_INPUT',
      message: 'questionId is required',
      userMessage: 'Choose a question first.',
      statusCode: 400,
    })
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: now,
  }

  if (input.status === 'answered') {
    patch.answer_text = nullableString(input.answerText)
    patch.answered_at = now
    patch.archived_at = null
  }

  if (input.status === 'archived') {
    patch.archived_at = now
  }

  if (input.status === 'open') {
    patch.answer_text = null
    patch.answered_at = null
    patch.archived_at = null
  }

  const { data, error } = await supabase
    .from('team_onboarding_questions')
    .update(patch)
    .eq('id', questionId)
    .eq('lead_rep_id', leadRepId)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    throw new ServiceError({
      code: 'NOT_FOUND',
      message: `Question not found for lead rep: ${questionId}`,
      userMessage: 'Question could not be updated.',
      statusCode: 404,
      cause: error,
    })
  }

  await supabase.from('team_onboarding_question_events').insert({
    question_id: questionId,
    lead_rep_id: leadRepId,
    event_type: `status:${input.status}`,
    event_note: input.status === 'answered' ? nullableString(input.answerText) : null,
  })

  return normalizeQuestion(data)
}
```

- [ ] **Step 4: Run service tests**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npm exec vitest run tests/team-onboarding-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit service layer**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
git add lib/services/team-onboarding.ts tests/team-onboarding-service.test.ts
git commit -m "feat: add team onboarding service"
```

Expected: A focused commit with service code and tests.

### Task 5: Add Public Question Submission API

**Files:**
- Create: `C:\Users\louis\neon-rabbit-core\app\api\team-onboarding\questions\route.ts`
- Test: `C:\Users\louis\neon-rabbit-core\tests\team-onboarding-routes.test.ts`

- [ ] **Step 1: Create public API route**

Create `C:\Users\louis\neon-rabbit-core\app\api\team-onboarding\questions\route.ts`:

```ts
import { NextResponse } from 'next/server'

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { ServiceError } from '@/lib/services/errors'
import { createTeamOnboardingQuestion } from '@/lib/services/team-onboarding'
import {
  assertTeamOnboardingRequestAllowed,
  buildTeamOnboardingCorsHeaders,
} from '@/lib/team-onboarding/request-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceErrorResponse(error: ServiceError, headers: Record<string, string>) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode, headers },
  )
}

function readBodyObject(body: unknown) {
  return body && typeof body === 'object'
    ? (body as Record<string, unknown>)
    : {}
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readSource(value: unknown) {
  if (value === 'nic_nac' || value === 'manual') return value
  return 'rep_button'
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildTeamOnboardingCorsHeaders(request),
  })
}

export async function POST(request: Request) {
  const corsHeaders = buildTeamOnboardingCorsHeaders(request)

  try {
    const body = readBodyObject(await request.json())
    const siteSlug = readString(body.siteSlug)

    assertTeamOnboardingRequestAllowed({
      payload: body,
      request,
      siteSlug: siteSlug || 'unknown',
    })

    const result = await createTeamOnboardingQuestion(getSupabaseAdminClient(), {
      siteSlug,
      siteToken: readString(body.siteToken),
      submitterName: readString(body.submitterName),
      submitterEmail: readString(body.submitterEmail),
      submitterPhone: readString(body.submitterPhone),
      stepId: readString(body.stepId),
      stepTitle: readString(body.stepTitle),
      questionText: readString(body.questionText),
      source: readSource(body.source),
      website: readString(body.website),
    })

    return NextResponse.json(
      { ok: true, questionId: result.id, status: result.status },
      { headers: corsHeaders },
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request payload.' },
        { status: 400, headers: corsHeaders },
      )
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error, corsHeaders)
    throw error
  }
}
```

- [ ] **Step 2: Add route tests**

Append route tests to `C:\Users\louis\neon-rabbit-core\tests\team-onboarding-routes.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: vi.fn(() => ({ from: vi.fn() })),
}))

vi.mock('@/lib/services/team-onboarding', () => ({
  createTeamOnboardingQuestion: vi.fn(async () => ({
    id: 'question-1',
    status: 'open',
  })),
}))

import { POST } from '@/app/api/team-onboarding/questions/route'
import { createTeamOnboardingQuestion } from '@/lib/services/team-onboarding'

describe('public team onboarding questions route', () => {
  it('submits a valid onboarding question', async () => {
    const request = new Request('https://sparkle-suite.test/api/team-onboarding/questions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        siteSlug: 'britt-with-bling',
        siteToken: 'demo-token',
        submitterName: 'Sarah',
        stepId: 'start-bpu',
        stepTitle: 'Start Bomb Party University',
        questionText: 'Where do I find BPU?',
        source: 'rep_button',
        website: '',
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true, questionId: 'question-1', status: 'open' })
    expect(createTeamOnboardingQuestion).toHaveBeenCalledWith(expect.anything(), {
      siteSlug: 'britt-with-bling',
      siteToken: 'demo-token',
      submitterName: 'Sarah',
      submitterEmail: '',
      submitterPhone: '',
      stepId: 'start-bpu',
      stepTitle: 'Start Bomb Party University',
      questionText: 'Where do I find BPU?',
      source: 'rep_button',
      website: '',
    })
  })

  it('rejects invalid JSON', async () => {
    const request = new Request('https://sparkle-suite.test/api/team-onboarding/questions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Invalid request payload.')
  })
})
```

- [ ] **Step 3: Run route tests**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npm exec vitest run tests/team-onboarding-routes.test.ts
```

Expected: PASS after mocks are aligned with the project’s current route test setup.

- [ ] **Step 4: Commit public route**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
git add app/api/team-onboarding/questions/route.ts tests/team-onboarding-routes.test.ts
git commit -m "feat: add public team onboarding question intake"
```

Expected: A focused commit with public intake route and tests.

### Task 6: Add Authenticated Team Management Question API

**Files:**
- Create: `C:\Users\louis\neon-rabbit-core\app\api\nic-nac\team-onboarding\questions\route.ts`
- Modify: `C:\Users\louis\neon-rabbit-core\tests\team-onboarding-routes.test.ts`

- [ ] **Step 1: Create authenticated API route**

Create `C:\Users\louis\neon-rabbit-core\app\api\nic-nac\team-onboarding\questions\route.ts`:

```ts
import { NextResponse } from 'next/server'

import { AuthError, getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import {
  getTeamOnboardingQuestions,
  updateTeamOnboardingQuestionStatus,
} from '@/lib/services/team-onboarding'
import type { TeamOnboardingQuestionStatus } from '@/lib/services/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function serviceErrorResponse(error: ServiceError) {
  return NextResponse.json(
    { code: error.code, error: error.userMessage },
    { status: error.statusCode },
  )
}

function readLimit(url: URL) {
  const raw = url.searchParams.get('limit')
  if (!raw) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function readStatus(value: string | null): TeamOnboardingQuestionStatus | undefined | null {
  if (!value) return undefined
  if (value === 'open' || value === 'answered' || value === 'archived') return value
  return null
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = readLimit(url)
    const status = readStatus(url.searchParams.get('status'))

    if (limit === null) {
      return NextResponse.json({ error: 'limit must be a whole number.' }, { status: 400 })
    }
    if (status === null) {
      return NextResponse.json({ error: 'status is invalid.' }, { status: 400 })
    }

    const { repId, supabase } = await getPaidNicNacContext()
    const result = await getTeamOnboardingQuestions(supabase, repId, {
      status,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = typeof body?.action === 'string' ? body.action.trim() : ''

    if (action !== 'update_status') {
      return NextResponse.json(
        { error: 'action must be update_status.' },
        { status: 400 },
      )
    }

    const status = readStatus(typeof body?.status === 'string' ? body.status : null)
    if (!status) {
      return NextResponse.json({ error: 'status is invalid.' }, { status: 400 })
    }

    const { repId, supabase } = await getPaidNicNacContext()
    const result = await updateTeamOnboardingQuestionStatus(supabase, repId, {
      questionId: typeof body?.questionId === 'string' ? body.questionId : '',
      status,
      answerText: typeof body?.answerText === 'string' ? body.answerText : '',
    })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) return serviceErrorResponse(error)
    throw error
  }
}
```

- [ ] **Step 2: Add authenticated route tests**

Append to `C:\Users\louis\neon-rabbit-core\tests\team-onboarding-routes.test.ts`:

```ts
vi.mock('@/lib/nic-nac/auth', () => ({
  AuthError: class AuthError extends Error {},
  getPaidNicNacContext: vi.fn(async () => ({
    repId: 'rep-1',
    supabase: { from: vi.fn() },
  })),
}))

vi.mock('@/lib/services/team-onboarding', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/team-onboarding')>(
    '@/lib/services/team-onboarding',
  )
  return {
    ...actual,
    createTeamOnboardingQuestion: vi.fn(async () => ({ id: 'question-1', status: 'open' })),
    getTeamOnboardingQuestions: vi.fn(async () => ({ questions: [] })),
    updateTeamOnboardingQuestionStatus: vi.fn(async () => ({
      id: 'question-1',
      status: 'answered',
    })),
  }
})
```

Then add tests that import the authenticated route under unique aliases if the file already imports the public route:

```ts
import {
  GET as GET_AUTH_QUESTIONS,
  POST as POST_AUTH_QUESTIONS,
} from '@/app/api/nic-nac/team-onboarding/questions/route'
import {
  getTeamOnboardingQuestions,
  updateTeamOnboardingQuestionStatus,
} from '@/lib/services/team-onboarding'

describe('authenticated team onboarding questions route', () => {
  it('loads questions for the paid workspace rep', async () => {
    const response = await GET_AUTH_QUESTIONS(
      new Request('https://sparkle-suite.test/api/nic-nac/team-onboarding/questions?status=open&limit=20'),
    )

    expect(response.status).toBe(200)
    expect(getTeamOnboardingQuestions).toHaveBeenCalledWith(expect.anything(), 'rep-1', {
      status: 'open',
      limit: 20,
    })
  })

  it('updates a question status', async () => {
    const response = await POST_AUTH_QUESTIONS(
      new Request('https://sparkle-suite.test/api/nic-nac/team-onboarding/questions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          questionId: 'question-1',
          status: 'answered',
          answerText: 'Use BPU first, then ask Brittany.',
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(updateTeamOnboardingQuestionStatus).toHaveBeenCalledWith(expect.anything(), 'rep-1', {
      questionId: 'question-1',
      status: 'answered',
      answerText: 'Use BPU first, then ask Brittany.',
    })
  })
})
```

- [ ] **Step 3: Run route tests**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npm exec vitest run tests/team-onboarding-routes.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit authenticated route**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
git add app/api/nic-nac/team-onboarding/questions/route.ts tests/team-onboarding-routes.test.ts
git commit -m "feat: add team onboarding workspace api"
```

Expected: A focused commit with the authenticated route and tests.

### Task 7: Wire Sparkle Suite Team Management UI

**Files:**
- Modify: `C:\Users\louis\neon-rabbit-core\app\nic-nac\components\DashboardPlaceholder.tsx`
- Modify: `C:\Users\louis\neon-rabbit-core\app\nic-nac\components\DashboardPlaceholder.module.css`
- Modify: `C:\Users\louis\neon-rabbit-core\tests\nic-nac-dashboard-placeholder.test.ts`

- [ ] **Step 1: Add UI state types**

In `C:\Users\louis\neon-rabbit-core\app\nic-nac\components\DashboardPlaceholder.tsx`, near the existing state type definitions, add:

```ts
type TeamQuestion = {
  id: string
  submitterName: string | null
  stepTitle: string | null
  questionText: string
  source: 'rep_button' | 'nic_nac' | 'manual'
  status: 'open' | 'answered' | 'archived'
  answerText: string | null
  createdAt: string
}

type TeamManagementState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; questions: TeamQuestion[] }
  | { status: 'error'; message: string }
```

- [ ] **Step 2: Add loader**

Near existing loader functions like `loadMessages`, add:

```ts
async function fetchTeamOnboardingQuestions(signal?: AbortSignal): Promise<TeamQuestion[]> {
  const response = await fetch('/api/nic-nac/team-onboarding/questions?status=open&limit=25', {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error('Team questions could not be loaded.')
  }

  const body = await response.json()
  return Array.isArray(body.questions) ? body.questions : []
}
```

- [ ] **Step 3: Add component state**

Inside `DashboardPlaceholder`, next to other workspace state values, add:

```ts
const [teamManagementState, setTeamManagementState] = useState<TeamManagementState>({ status: 'idle' })
```

- [ ] **Step 4: Load Team Management with paid workspace data**

Inside the existing paid workspace loading effect/function, call:

```ts
setTeamManagementState({ status: 'loading' })
fetchTeamOnboardingQuestions(signal)
  .then((questions) => setTeamManagementState({ status: 'ready', questions }))
  .catch((error) => {
    if (signal?.aborted) return
    setTeamManagementState({
      status: 'error',
      message: error instanceof Error ? error.message : 'Team questions could not be loaded.',
    })
  })
```

- [ ] **Step 5: Pass state into TeamManagementCard**

Change the render call from:

```tsx
<TeamManagementCard />
```

to:

```tsx
<TeamManagementCard state={teamManagementState} />
```

- [ ] **Step 6: Update TeamManagementCard props and ready UI**

Replace `export function TeamManagementCard()` with:

```tsx
export function TeamManagementCard({
  state = { status: 'idle' },
}: {
  state?: TeamManagementState
}) {
  const questions = state.status === 'ready' ? state.questions : []
  const openCount = questions.filter((question) => question.status === 'open').length

  return (
    <div className={styles.workspacePanel}>
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle}>Manage My Team</div>
          <div className={styles.cardSubtitle}>
            Manage team members, onboarding site questions, and Brittany's replies from this workspace.
          </div>
        </div>
        <span className={styles.rosterTag}>
          {state.status === 'ready' ? `${openCount} open` : 'Paid add-on'}
        </span>
      </div>

      <div className={styles.teamManagementGrid}>
        <section className={styles.teamManagementPanel}>
          <div className={styles.walletSettingsTitle}>Onboarding website messages</div>
          {state.status === 'loading' && (
            <div className={styles.emptyState}>Loading team questions...</div>
          )}
          {state.status === 'error' && (
            <div className={styles.emptyState}>{state.message}</div>
          )}
          {state.status !== 'loading' && state.status !== 'error' && questions.length === 0 && (
            <div className={styles.emptyState}>
              New-rep questions from onboarding websites will land here.
            </div>
          )}
          {questions.length > 0 && (
            <div className={styles.teamQuestionList}>
              {questions.map((question) => (
                <article className={styles.teamQuestionItem} key={question.id}>
                  <div className={styles.workspaceSectionHeader}>
                    <div>
                      <div className={styles.walletSettingsTitle}>
                        {question.submitterName || 'New rep'}
                      </div>
                      <div className={styles.cardSubtitle}>
                        {question.stepTitle || 'General question'}
                      </div>
                    </div>
                    <span className={styles.rosterTag}>
                      {question.source === 'nic_nac' ? 'Nic-Nac' : 'Rep'}
                    </span>
                  </div>
                  <p>{question.questionText}</p>
                  <small>{new Date(question.createdAt).toLocaleString()}</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.teamManagementPanel}>
          <div className={styles.walletSettingsTitle}>Team directory</div>
          <div className={styles.emptyState}>
            Team members will appear here after the first directory import or manual entry.
          </div>
        </section>

        <section className={styles.teamManagementPanel}>
          <div className={styles.walletSettingsTitle}>Onboarding sites</div>
          <div className={styles.teamMessagePreview}>
            Britt with Bling training site connected. Public questions route to this inbox.
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Add CSS classes**

Add to `C:\Users\louis\neon-rabbit-core\app\nic-nac\components\DashboardPlaceholder.module.css` near the current Team Management styles:

```css
.teamQuestionList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.teamQuestionItem {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.teamQuestionItem p {
  margin: 8px 0;
  color: var(--nic-nac-text-primary);
  font-family: 'Geist', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
}

.teamQuestionItem small {
  color: var(--nic-nac-text-secondary);
  font-family: 'Geist', system-ui, sans-serif;
  font-size: 12px;
}
```

- [ ] **Step 8: Update component tests**

In `C:\Users\louis\neon-rabbit-core\tests\nic-nac-dashboard-placeholder.test.ts`, update the current `TeamManagementCard` test to preserve locked/default coverage:

```ts
it('renders the team management workspace placeholder', () => {
  const html = renderToStaticMarkup(createElement(TeamManagementCard))

  expect(html).toContain('Manage My Team')
  expect(html).toContain('Onboarding website messages')
  expect(html).toContain('Team directory')
  expect(html).toContain('Onboarding sites')
})
```

Add a ready-state test:

```ts
it('renders open onboarding questions in team management', () => {
  const html = renderToStaticMarkup(
    createElement(TeamManagementCard, {
      state: {
        status: 'ready',
        questions: [
          {
            id: 'question-1',
            submitterName: 'Sarah',
            stepTitle: 'Start Bomb Party University',
            questionText: 'Where do I find BPU?',
            source: 'nic_nac',
            status: 'open',
            answerText: null,
            createdAt: '2026-05-31T10:01:00.000Z',
          },
        ],
      },
    }),
  )

  expect(html).toContain('1 open')
  expect(html).toContain('Sarah')
  expect(html).toContain('Start Bomb Party University')
  expect(html).toContain('Where do I find BPU?')
  expect(html).toContain('Nic-Nac')
})
```

- [ ] **Step 9: Run dashboard tests**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit Team Management UI**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
git add app/nic-nac/components/DashboardPlaceholder.tsx app/nic-nac/components/DashboardPlaceholder.module.css tests/nic-nac-dashboard-placeholder.test.ts
git commit -m "feat: show onboarding questions in team management"
```

Expected: A focused UI commit.

### Task 8: Add Training Site Question Submission Client

**Files:**
- Create: `C:\Users\louis\britt-with-bling-start-strong\.env.example`
- Create: `C:\Users\louis\britt-with-bling-start-strong\src\services\questions.ts`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\types.ts`

- [ ] **Step 1: Add environment example**

Create `C:\Users\louis\britt-with-bling-start-strong\.env.example`:

```bash
VITE_SPARKLE_SUITE_API_ORIGIN=https://www.yoursparklesuite.com
VITE_ONBOARDING_SITE_SLUG=britt-with-bling
VITE_ONBOARDING_SITE_TOKEN=local-demo-token-change-before-launch
```

- [ ] **Step 2: Add remote fields to RepQuestion**

Modify `RepQuestion` in `C:\Users\louis\britt-with-bling-start-strong\src\types.ts`:

```ts
export type RepQuestion = {
  id: string;
  stepId: string | null;
  text: string;
  status: 'open' | 'answered';
  source: 'rep' | 'nic-nac';
  createdAt: string;
  remoteStatus?: 'not-configured' | 'sending' | 'sent' | 'failed';
  remoteQuestionId?: string;
  remoteError?: string;
};
```

- [ ] **Step 3: Create submission client**

Create `C:\Users\louis\britt-with-bling-start-strong\src\services\questions.ts`:

```ts
import { steps } from '../data';
import type { RepQuestion } from '../types';

type SubmitQuestionResult =
  | { ok: true; questionId: string }
  | { ok: false; reason: 'not-configured' | 'failed'; message: string };

function readEnv(name: string) {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function hasRemoteQuestionConfig() {
  return Boolean(
    readEnv('VITE_SPARKLE_SUITE_API_ORIGIN')
      && readEnv('VITE_ONBOARDING_SITE_SLUG')
      && readEnv('VITE_ONBOARDING_SITE_TOKEN'),
  );
}

export async function submitQuestionToSparkleSuite(
  question: RepQuestion,
): Promise<SubmitQuestionResult> {
  const apiOrigin = readEnv('VITE_SPARKLE_SUITE_API_ORIGIN').replace(/\/$/, '');
  const siteSlug = readEnv('VITE_ONBOARDING_SITE_SLUG');
  const siteToken = readEnv('VITE_ONBOARDING_SITE_TOKEN');

  if (!apiOrigin || !siteSlug || !siteToken) {
    return {
      ok: false,
      reason: 'not-configured',
      message: 'Saved on this device. Sparkle Suite question sync is not connected yet.',
    };
  }

  const step = question.stepId ? steps.find((item) => item.id === question.stepId) : null;

  try {
    const response = await fetch(`${apiOrigin}/api/team-onboarding/questions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        siteSlug,
        siteToken,
        submitterName: 'Demo rep',
        stepId: question.stepId,
        stepTitle: step?.title ?? null,
        questionText: question.text,
        source: question.source === 'nic-nac' ? 'nic_nac' : 'rep_button',
        website: '',
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        ok: false,
        reason: 'failed',
        message: typeof body.error === 'string'
          ? body.error
          : 'Saved on this device, but Sparkle Suite did not receive it.',
      };
    }

    const body = await response.json();
    return {
      ok: true,
      questionId: typeof body.questionId === 'string' ? body.questionId : '',
    };
  } catch {
    return {
      ok: false,
      reason: 'failed',
      message: 'Saved on this device. Sparkle Suite could not be reached.',
    };
  }
}
```

- [ ] **Step 4: Run build**

Run:

```powershell
cd C:\Users\louis\britt-with-bling-start-strong
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit training site client**

Run:

```powershell
cd C:\Users\louis\britt-with-bling-start-strong
git add .env.example src/types.ts src/services/questions.ts
git commit -m "feat: add sparkle suite question sync client"
```

Expected: A focused training site commit.

### Task 9: Wire Training Site Submission UI

**Files:**
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\App.tsx`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\state.ts`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\components\Questions.tsx`

- [ ] **Step 1: Add state helper for remote updates**

In `C:\Users\louis\britt-with-bling-start-strong\src\state.ts`, add:

```ts
export function updateQuestionRemoteStatus(
  questions: RepQuestion[],
  questionId: string,
  patch: Pick<RepQuestion, 'remoteStatus'> & Partial<Pick<RepQuestion, 'remoteQuestionId' | 'remoteError'>>,
) {
  return questions.map((question) => (
    question.id === questionId
      ? { ...question, ...patch }
      : question
  ));
}
```

Update `makeQuestion()` to include:

```ts
remoteStatus: 'not-configured',
```

- [ ] **Step 2: Update App question creation**

In `C:\Users\louis\britt-with-bling-start-strong\src\App.tsx`, import:

```ts
import { submitQuestionToSparkleSuite } from './services/questions';
import { updateQuestionRemoteStatus } from './state';
```

Then add:

```ts
async function syncQuestion(question: RepQuestion) {
  setAppState((current) => ({
    ...current,
    questions: updateQuestionRemoteStatus(current.questions, question.id, { remoteStatus: 'sending' }),
  }));

  const result = await submitQuestionToSparkleSuite(question);

  setAppState((current) => ({
    ...current,
    questions: updateQuestionRemoteStatus(current.questions, question.id, result.ok
      ? { remoteStatus: 'sent', remoteQuestionId: result.questionId, remoteError: undefined }
      : { remoteStatus: result.reason === 'not-configured' ? 'not-configured' : 'failed', remoteError: result.message }),
  }));
}
```

Replace the body of `addQuestion()` with:

```ts
function addQuestion(stepId: string | null, text: string) {
  const question = makeQuestion(text, stepId, 'rep');
  setAppState((current) => ({
    ...current,
    questions: [question, ...current.questions],
    stepStatuses: stepId && current.stepStatuses[stepId] !== 'done'
      ? { ...current.stepStatuses, [stepId]: 'needs-help' }
      : current.stepStatuses,
  }));
  void syncQuestion(question);
}
```

Replace `addNicNacQuestion()` with:

```ts
function addNicNacQuestion(question: RepQuestion) {
  setAppState((current) => ({
    ...current,
    questions: [question, ...current.questions],
    stepStatuses: question.stepId && current.stepStatuses[question.stepId] !== 'done'
      ? { ...current.stepStatuses, [question.stepId]: 'needs-help' }
      : current.stepStatuses,
  }));
  void syncQuestion(question);
}
```

- [ ] **Step 3: Update question list delivery copy**

In `C:\Users\louis\britt-with-bling-start-strong\src\components\Questions.tsx`, inside each `question-item`, after the created date, add:

```tsx
{question.remoteStatus === 'sent' && (
  <small>Sent to Brittany's Sparkle Suite workspace</small>
)}
{question.remoteStatus === 'sending' && (
  <small>Sending to Sparkle Suite...</small>
)}
{question.remoteStatus === 'failed' && (
  <small>{question.remoteError || 'Saved here, but Sparkle Suite did not receive it yet.'}</small>
)}
{question.remoteStatus === 'not-configured' && (
  <small>Saved on this device for the demo</small>
)}
```

- [ ] **Step 4: Run build**

Run:

```powershell
cd C:\Users\louis\britt-with-bling-start-strong
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit training UI**

Run:

```powershell
cd C:\Users\louis\britt-with-bling-start-strong
git add src/App.tsx src/state.ts src/components/Questions.tsx
git commit -m "feat: sync onboarding questions to sparkle suite"
```

Expected: A focused commit.

### Task 10: Seed Brittany's Onboarding Site Record

**Files:**
- Create: `C:\Users\louis\neon-rabbit-core\scripts\create-team-onboarding-site.ts`

- [ ] **Step 1: Create one-time script**

Create `C:\Users\louis\neon-rabbit-core\scripts\create-team-onboarding-site.ts`:

```ts
import crypto from 'node:crypto'

import { getSupabaseAdminClient } from '@/lib/supabase/admin'

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function main() {
  const supabase = getSupabaseAdminClient()
  const leadRepEmail = requireEnv('TEAM_ONBOARDING_LEAD_REP_EMAIL')
  const slug = requireEnv('TEAM_ONBOARDING_SITE_SLUG')
  const displayName = requireEnv('TEAM_ONBOARDING_SITE_DISPLAY_NAME')
  const publicUrl = requireEnv('TEAM_ONBOARDING_PUBLIC_URL')
  const siteToken = requireEnv('TEAM_ONBOARDING_SITE_TOKEN')
  const publicOrigin = new URL(publicUrl).origin

  const { data: rep, error: repError } = await supabase
    .from('reps')
    .select('id, email')
    .eq('email', leadRepEmail)
    .maybeSingle()

  if (repError || !rep) {
    throw new Error(`Lead rep not found for ${leadRepEmail}`)
  }

  const { error } = await supabase
    .from('team_onboarding_sites')
    .upsert({
      lead_rep_id: rep.id,
      slug,
      display_name: displayName,
      public_origin: publicOrigin,
      public_url: publicUrl,
      site_token_hash: hashToken(siteToken),
      status: 'active',
    }, {
      onConflict: 'slug',
    })

  if (error) throw error
  console.log(`Team onboarding site ready: ${slug}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 2: Run seed script for Brittany only after production env is ready**

Run with real values:

```powershell
cd C:\Users\louis\neon-rabbit-core
$env:TEAM_ONBOARDING_LEAD_REP_EMAIL = Read-Host 'Enter Brittany Sparkle Suite rep email'
$env:TEAM_ONBOARDING_SITE_SLUG='britt-with-bling'
$env:TEAM_ONBOARDING_SITE_DISPLAY_NAME='Britt with Bling'
$env:TEAM_ONBOARDING_PUBLIC_URL='https://britt-with-bling-start-strong.vercel.app'
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$env:TEAM_ONBOARDING_SITE_TOKEN = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
npx tsx scripts/create-team-onboarding-site.ts
```

Expected: Prints `Team onboarding site ready: britt-with-bling`.

- [ ] **Step 3: Commit script**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
git add scripts/create-team-onboarding-site.ts
git commit -m "chore: add team onboarding site setup script"
```

Expected: A focused script commit.

### Task 11: Environment and Deployment Wiring

**Files:**
- Vercel project settings for Sparkle Suite
- Vercel project settings for `britt-with-bling-start-strong`

- [ ] **Step 1: Configure Sparkle Suite CORS allowlist for transitional standalone site**

Set in Sparkle Suite production and preview environments:

```bash
TEAM_ONBOARDING_ALLOWED_ORIGINS=https://britt-with-bling-start-strong.vercel.app,http://127.0.0.1:5173
```

Expected: The public question route returns CORS headers only for those origins.

- [ ] **Step 2: Configure training site API variables**

Set in the training site Vercel project:

```bash
VITE_SPARKLE_SUITE_API_ORIGIN=https://www.yoursparklesuite.com
VITE_ONBOARDING_SITE_SLUG=britt-with-bling
VITE_ONBOARDING_SITE_TOKEN=use-the-same-token-generated-while-seeding-brittanys-site
```

Expected: Vite build embeds public demo config. The token is not a secret; it is a site-scoped anti-misrouting token and must still be rate-limited.

- [ ] **Step 3: Build both projects**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npm run build
cd C:\Users\louis\britt-with-bling-start-strong
npm run build
```

Expected: Both builds pass.

- [ ] **Step 4: Deploy both projects**

Run:

```powershell
cd C:\Users\louis\neon-rabbit-core
npx vercel --prod
cd C:\Users\louis\britt-with-bling-start-strong
npx vercel --prod
```

Expected: Both deployments succeed and the final URLs are recorded in the project notes.

### Task 12: End-to-End Smoke Test

**Files:**
- No source file changes expected unless smoke testing finds bugs.

- [ ] **Step 1: Submit a question from the training site**

Open:

```text
https://britt-with-bling-start-strong.vercel.app
```

Action:

```text
Click "I need help" on the BPU step or ask Nic-Nac a question it escalates to Brittany.
```

Expected:

```text
The question card says "Sent to Brittany's Sparkle Suite workspace."
```

- [ ] **Step 2: Verify question appears in Sparkle Suite**

Open:

```text
https://www.yoursparklesuite.com/nic-nac?workspace=team-management
```

Action:

```text
Sign in as Brittany's Sparkle Suite account and open Manage My Team.
```

Expected:

```text
The submitted question appears in Onboarding website messages with the submitter, step, source, and timestamp.
```

- [ ] **Step 3: Verify wrong-user isolation**

Action:

```text
Sign in as a different paid rep and open Manage My Team.
```

Expected:

```text
The Brittany onboarding question does not appear.
```

- [ ] **Step 4: Verify fallback mode**

Action:

```text
Remove VITE_SPARKLE_SUITE_API_ORIGIN from a local training site build and submit a question.
```

Expected:

```text
The question remains saved locally and says "Saved on this device for the demo."
```

---

## Open Product Decisions

- Should the workspace nav label change from `Team Management` to `Manage My Team`? The user has referenced “Manage My Team,” while current code says “Team Management.” Recommendation: use `Manage My Team` in user-facing UI and keep `team-management` as the internal route key.
- Should onboarding sites move into `neon-rabbit-core` before launch? Recommendation: yes for production. Keep standalone Vite only as a demo bridge.
- What identity should a new rep provide before asking a question? Recommendation: start with a very light prompt: first name only, optional email/phone later. Do not block question capture behind a long form.
- Should Brittany's reply go back to the rep? Recommendation: Phase 2 stores replies in Sparkle Suite only. Phase 3 can add email/SMS/rep portal replies once consent and delivery channels are designed.
- How is Team Management entitlement represented? The current card says paid add-on locked, but no specific subscription flag was confirmed in this research. Recommendation: add a real entitlement check before showing writable Team Management controls.

## Risks and Mitigations

- **Cross-origin demo posting:** Use strict `TEAM_ONBOARDING_ALLOWED_ORIGINS`, rate limits, honeypot, and site tokens.
- **PII exposure:** Do not display cross-rep data. Use authenticated APIs and RLS. Keep public route insert-only through the server.
- **Token leakage:** Treat site token as public-ish and scoped. Hash at rest. Rotate by updating `team_onboarding_sites.site_token_hash`.
- **Support-message confusion:** Do not reuse `rep_messages` for onboarding questions. Keep team onboarding separate.
- **Overbuilding replies:** Do not ship outbound replies until consent and delivery expectations are clear.

## Phase Boundaries

Phase 2A: Sparkle Suite schema, service layer, and public/authenticated APIs.

Phase 2B: Sparkle Suite Team Management renders the real question inbox.

Phase 2C: Britt with Bling training site submits questions to Sparkle Suite with local fallback.

Phase 2D: Deployment, seed record, and end-to-end smoke test.

Phase 3: Replies back to reps, team-member accounts, per-team templates, analytics, and update publishing workflow.

## Self-Review

- Spec coverage: The plan covers Sparkle Suite Team Management research, cross-site communication, database design, APIs, UI, training site sync, deployment, and smoke testing.
- Placeholder scan: No task requires undefined future work to complete Phase 2. Open decisions are explicitly separated from implementation tasks.
- Type consistency: `TeamOnboardingQuestion`, statuses, sources, route payloads, and training site sync fields use consistent names across tasks.
