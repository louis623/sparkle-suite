# Sparkle Finder Separated Auth Boundary Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Sparkle Finder its own customer auth boundary so Google signup and account login never route through Neon Rabbit HQ or another product.

**Architecture:** Sparkle Finder auth, account profile, Silver membership, consent, collection, billing, and Stripe event state move to a dedicated Sparkle Finder Supabase project. Sparkle Suite remains the source of truth for the master jewelry library and rep/live-show discovery data through the existing public Finder API boundary, so we do not duplicate the catalog or break Sparkle Suite/HQ auth. Existing Neon Rabbit HQ, Sparkle Suite, and old shared Supabase settings are not removed or repointed.

**Tech Stack:** Next.js 16, Supabase Auth/Postgres, Supabase CLI, Google OAuth, Vercel, Stripe, Vitest, Playwright smoke tests.

---

## Non-Negotiable Rules

- Do not remove any existing Supabase redirect URLs from any existing project.
- Do not change Neon Rabbit HQ Vercel env vars, aliases, Google OAuth settings, or Supabase Auth settings.
- Do not change Sparkle Suite Vercel env vars, aliases, Google OAuth settings, or Supabase Auth settings.
- Only change the Sparkle Finder Vercel project `sparkle-finder-dev` and the new dedicated Sparkle Finder Supabase project.
- Sparkle Finder customer auth must never use `https://neon-rabbit-hq.vercel.app` as a Site URL, redirect URL, OAuth callback destination, email-template destination, or fallback.
- Sparkle Finder can consume Sparkle Suite catalog data through APIs, but customer auth/session state must stay in Sparkle Finder's own auth project.

## Current State

- Active implementation repo: `C:\Users\louis\sparkle-finder-repo`
- Binder/planning folder: `C:\Users\louis\sparkle-finder`
- Active branch: `codex-sparkle-finder-v1`
- Latest pushed auth-boundary guard commit: `6f005b3 fix: keep Sparkle Finder Google auth on canonical domain`
- Current shared Supabase project observed in existing env/docs: `bqhzfkgkjyuhlsozpylf`
- Current failure: Google OAuth from Sparkle Finder still completes at `https://neon-rabbit-hq.vercel.app/login`, which proves the active Supabase Auth project has cross-product redirect/fallback behavior.
- Current local blocker: Supabase CLI is not authenticated. `supabase projects list -o json` returns `Unauthorized`.

## File And Config Map

### Sparkle Finder Repo Files

- Read-only verification:
  - `C:\Users\louis\sparkle-finder-repo\lib\supabase\client.ts`
  - `C:\Users\louis\sparkle-finder-repo\lib\supabase\server.ts`
  - `C:\Users\louis\sparkle-finder-repo\lib\sparkle-finder\account-service.ts`
  - `C:\Users\louis\sparkle-finder-repo\lib\sparkle-finder\catalog-service.ts`
  - `C:\Users\louis\sparkle-finder-repo\lib\sparkle-finder\billing.ts`
  - `C:\Users\louis\sparkle-finder-repo\app\api\auth\callback\route.ts`
  - `C:\Users\louis\sparkle-finder-repo\components\account\SignupForm.tsx`
  - `C:\Users\louis\sparkle-finder-repo\components\account\SignInForm.tsx`
- Supabase migrations to apply to the new Sparkle Finder Supabase project:
  - `C:\Users\louis\sparkle-finder-repo\supabase\migrations\*.sql`
- Deployment docs to update after implementation:
  - `C:\Users\louis\sparkle-finder-repo\docs\deployments\sparkle-finder-silver-auth-env-vars.md`
- Binder memory already updated:
  - `C:\Users\louis\sparkle-finder\AGENTS.md`

### Vercel Project

- Sparkle Finder Vercel project:
  - Project name: `sparkle-finder-dev`
  - Project ID: `prj_mk7PGhirgNotU1BtdmZrZhhJWz8w`
  - Org/team ID: `team_kvcmZ4RlZB0Hah65NE3280x5`
- Sparkle Finder aliases:
  - `https://yoursparklefinder.com`
  - `https://www.yoursparklefinder.com`
  - `https://sparkle-finder-dev.vercel.app`

### Environment Boundary

Sparkle Finder Vercel env vars should point to the dedicated Sparkle Finder Supabase project:

```text
NEXT_PUBLIC_SITE_URL=https://yoursparklefinder.com
NEXT_PUBLIC_SUPABASE_URL=https://<new-sparkle-finder-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<new Sparkle Finder publishable key>
SUPABASE_SERVICE_ROLE_KEY=<new Sparkle Finder service-role key>
```

Sparkle Suite catalog access should stay separate:

```text
SPARKLE_SUITE_FINDER_API_BASE_URL=https://www.yoursparklesuite.com
```

The code already defaults catalog reads to `https://www.yoursparklesuite.com` in `lib/sparkle-finder/catalog-service.ts`, so no catalog database copy is needed for this auth split.

---

### Task 1: Authenticate Supabase Admin Access

**Files:**
- No repo file changes.
- Uses local shell environment only.

- [ ] **Step 1: Create a Supabase access token**

In Supabase dashboard, open:

```text
https://supabase.com/dashboard/account/tokens
```

Create a token named:

```text
sparkle-finder-auth-split-2026-06-09
```

Required permissions:

```text
Project read/write
Auth configuration read/write
Database/migration access
```

- [ ] **Step 2: Set the token for the current terminal session**

Run in PowerShell:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "<paste token for this terminal only>"
supabase projects list -o json
```

Expected:

```text
The command prints JSON project data instead of Unauthorized.
```

- [ ] **Step 3: Confirm current repo state**

Run:

```powershell
git -C C:\Users\louis\sparkle-finder-repo status --short --branch
```

Expected:

```text
Branch is codex-sparkle-finder-v1...origin/codex-sparkle-finder-v1.
Only supabase/.temp/ may be untracked.
```

### Task 2: Create Dedicated Sparkle Finder Supabase Project

**Files:**
- No app code changes.
- Supabase cloud project is created.

- [ ] **Step 1: Create the project**

Use Supabase dashboard or CLI. Recommended dashboard name:

```text
sparkle-finder-auth
```

Recommended region:

```text
US East
```

Recommended database password handling:

```text
Generate a strong password and store it in the approved password manager. Do not paste it into repo docs or chat.
```

- [ ] **Step 2: Capture project values locally**

After creation, get the project ref, API URL, publishable/anon key, and service-role key from Supabase dashboard.

Set them only in the current PowerShell session:

```powershell
$env:SPARKLE_FINDER_SUPABASE_REF = "<new project ref>"
$env:SPARKLE_FINDER_SUPABASE_URL = "https://$env:SPARKLE_FINDER_SUPABASE_REF.supabase.co"
$env:SPARKLE_FINDER_SUPABASE_PUBLISHABLE_KEY = "<new publishable key>"
$env:SPARKLE_FINDER_SUPABASE_SERVICE_ROLE_KEY = "<new service role key>"
```

Expected:

```text
These values exist only in the terminal environment and are not written to repo files.
```

- [ ] **Step 3: Verify this is not the old shared project**

Run:

```powershell
if ($env:SPARKLE_FINDER_SUPABASE_REF -eq "bqhzfkgkjyuhlsozpylf") {
  throw "Stop: this is the old shared project, not a dedicated Sparkle Finder auth project."
}
"Using dedicated Sparkle Finder Supabase project: $env:SPARKLE_FINDER_SUPABASE_REF"
```

Expected:

```text
The command prints the new project ref and does not throw.
```

### Task 3: Apply Sparkle Finder Schema To Dedicated Project

**Files:**
- Use migrations from `C:\Users\louis\sparkle-finder-repo\supabase\migrations\*.sql`.
- Do not edit migration history unless a migration fails.

- [ ] **Step 1: Link local repo to the new project**

Run:

```powershell
supabase link --project-ref $env:SPARKLE_FINDER_SUPABASE_REF --workdir C:\Users\louis\sparkle-finder-repo
```

Expected:

```text
Supabase reports the local project is linked to the new project ref.
```

- [ ] **Step 2: Inspect remote migration state**

Run:

```powershell
supabase migration list --linked --workdir C:\Users\louis\sparkle-finder-repo
```

Expected:

```text
The new project has no applied Sparkle Finder migrations or only baseline entries created by Supabase.
```

- [ ] **Step 3: Apply all Sparkle Finder migrations**

Run:

```powershell
supabase db push --workdir C:\Users\louis\sparkle-finder-repo
```

Expected:

```text
All local migrations apply successfully to the new dedicated Sparkle Finder project.
```

- [ ] **Step 4: Verify required tables exist**

Run this in Supabase SQL Editor for the new project or through an authenticated SQL query:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'sparkle_finder_profiles',
    'sparkle_finder_memberships',
    'sparkle_finder_communication_consents',
    'sparkle_finder_collection_items',
    'sparkle_finder_stripe_events'
  )
order by table_name;
```

Expected rows:

```text
sparkle_finder_collection_items
sparkle_finder_communication_consents
sparkle_finder_memberships
sparkle_finder_profiles
sparkle_finder_stripe_events
```

- [ ] **Step 5: Verify account trigger exists**

Run:

```sql
select trigger_name, event_object_schema, event_object_table
from information_schema.triggers
where trigger_schema = 'auth'
  and event_object_table = 'users'
  and trigger_name like '%sparkle_finder%';
```

Expected:

```text
At least one Sparkle Finder auth.users insert trigger is present.
```

If no rows return, inspect migrations for the trigger definition before continuing.

### Task 4: Configure Sparkle Finder Supabase Auth

**Files:**
- No app code changes.
- Changes only the new dedicated Sparkle Finder Supabase project.

- [ ] **Step 1: Set URL Configuration**

In the new Sparkle Finder Supabase project, open:

```text
Authentication -> URL Configuration
```

Set:

```text
Site URL:
https://yoursparklefinder.com
```

Add redirect URLs:

```text
https://yoursparklefinder.com/**
https://www.yoursparklefinder.com/**
https://sparkle-finder-dev.vercel.app/**
http://127.0.0.1:4310/**
http://localhost:4310/**
```

Expected:

```text
No Neon Rabbit HQ URL appears in this new Sparkle Finder project unless Louis explicitly approves a future reason.
No existing HQ/Suite project settings are edited.
```

- [ ] **Step 2: Configure Sparkle Finder email templates**

In the new Sparkle Finder Supabase project, set Confirm signup link target to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account
```

Set Magic link target to:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/silver?from=signup
```

Expected:

```text
Email links use yoursparklefinder.com and Sparkle Finder routes.
```

- [ ] **Step 3: Configure Google provider**

In Google Cloud Console, create a dedicated OAuth 2.0 Web Client:

```text
Name: Sparkle Finder Web Auth
Authorized JavaScript origins:
https://yoursparklefinder.com
https://www.yoursparklefinder.com
https://sparkle-finder-dev.vercel.app
Authorized redirect URIs:
https://<new-sparkle-finder-project-ref>.supabase.co/auth/v1/callback
```

In the new Supabase project's Google provider settings:

```text
Enable Google provider.
Client ID: value from Sparkle Finder Web Auth client.
Client Secret: value from Sparkle Finder Web Auth client.
```

Expected:

```text
Google consent and OAuth callback are branded/routed for Sparkle Finder, not Neon Rabbit HQ.
```

### Task 5: Point Only Sparkle Finder Vercel Env To Dedicated Auth

**Files:**
- No app code changes.
- Change only Vercel project `sparkle-finder-dev`.

- [ ] **Step 1: Snapshot current Sparkle Finder Vercel env names**

Run:

```powershell
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env ls --cwd C:\Users\louis\sparkle-finder-repo
```

Expected:

```text
Only the Sparkle Finder Vercel project env list is displayed.
```

- [ ] **Step 2: Update Production env values**

Run:

```powershell
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env add NEXT_PUBLIC_SITE_URL production --value https://yoursparklefinder.com --force --yes --no-sensitive --cwd C:\Users\louis\sparkle-finder-repo
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env add NEXT_PUBLIC_SUPABASE_URL production --value $env:SPARKLE_FINDER_SUPABASE_URL --force --yes --no-sensitive --cwd C:\Users\louis\sparkle-finder-repo
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production --value $env:SPARKLE_FINDER_SUPABASE_PUBLISHABLE_KEY --force --yes --no-sensitive --cwd C:\Users\louis\sparkle-finder-repo
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env add SUPABASE_SERVICE_ROLE_KEY production --value $env:SPARKLE_FINDER_SUPABASE_SERVICE_ROLE_KEY --force --yes --cwd C:\Users\louis\sparkle-finder-repo
```

Expected:

```text
Sparkle Finder production env points to the new Sparkle Finder Supabase project.
No HQ/Suite Vercel project is touched.
```

- [ ] **Step 3: Update Preview env values**

If the normal Vercel env command asks for a branch because the project is not Git-connected, use the Vercel API path already proven in prior work. Otherwise run:

```powershell
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env add NEXT_PUBLIC_SITE_URL preview --value https://yoursparklefinder.com --force --yes --no-sensitive --cwd C:\Users\louis\sparkle-finder-repo
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env add NEXT_PUBLIC_SUPABASE_URL preview --value $env:SPARKLE_FINDER_SUPABASE_URL --force --yes --no-sensitive --cwd C:\Users\louis\sparkle-finder-repo
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview --value $env:SPARKLE_FINDER_SUPABASE_PUBLISHABLE_KEY --force --yes --no-sensitive --cwd C:\Users\louis\sparkle-finder-repo
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' env add SUPABASE_SERVICE_ROLE_KEY preview --value $env:SPARKLE_FINDER_SUPABASE_SERVICE_ROLE_KEY --force --yes --cwd C:\Users\louis\sparkle-finder-repo
```

Expected:

```text
Sparkle Finder dev alias can start Google OAuth but uses the dedicated Sparkle Finder Supabase project.
```

- [ ] **Step 4: Update local `.env.local` manually if local OAuth testing is needed**

Create or update `C:\Users\louis\sparkle-finder-repo\.env.local` locally only:

```text
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4310
NEXT_PUBLIC_SUPABASE_URL=<new Sparkle Finder Supabase URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<new Sparkle Finder publishable key>
SUPABASE_SERVICE_ROLE_KEY=<new Sparkle Finder service-role key>
SPARKLE_SUITE_FINDER_API_BASE_URL=https://www.yoursparklesuite.com
```

Expected:

```text
.env.local remains ignored by git.
```

### Task 6: Deploy Sparkle Finder Only

**Files:**
- No app code changes expected.

- [ ] **Step 1: Run verification before deploy**

Run:

```powershell
npm run test
npm run build
```

Expected:

```text
All tests pass.
Build passes.
```

- [ ] **Step 2: Deploy Sparkle Finder preview**

Run:

```powershell
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' --cwd C:\Users\louis\sparkle-finder-repo --yes
```

Expected:

```text
Preview deployment succeeds.
```

- [ ] **Step 3: Point dev alias at preview deployment**

Run with the deployment URL printed by Step 2:

```powershell
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' alias set <preview-deployment-host> sparkle-finder-dev.vercel.app --cwd C:\Users\louis\sparkle-finder-repo
```

Expected:

```text
https://sparkle-finder-dev.vercel.app points to the new Sparkle Finder deployment.
```

- [ ] **Step 4: Deploy Sparkle Finder production**

Run:

```powershell
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' --cwd C:\Users\louis\sparkle-finder-repo --prod --yes
```

Expected:

```text
Production deployment succeeds and aliases to https://yoursparklefinder.com.
```

### Task 7: Verify Sparkle Finder Auth End To End

**Files:**
- No repo file changes.

- [ ] **Step 1: Verify public signup page**

Open:

```text
https://yoursparklefinder.com/auth/sign-up
```

Expected:

```text
Page title is Sparkle Finder.
Page shows Continue with Google.
No Neon Rabbit HQ text appears.
```

- [ ] **Step 2: Start Google signup**

Click:

```text
Continue with Google
```

Expected:

```text
Browser goes to Google account selection or Google consent.
The URL contains the new Sparkle Finder Supabase project callback:
https://<new-sparkle-finder-project-ref>.supabase.co/auth/v1/callback
No URL contains neon-rabbit-hq.vercel.app.
```

- [ ] **Step 3: Complete signup with a test Gmail account**

Use a test Gmail account that is safe to create as a Sparkle Finder customer.

Expected:

```text
After Google completes, browser lands on:
https://yoursparklefinder.com/account?setup=required
or
https://yoursparklefinder.com/account
```

- [ ] **Step 4: Verify database rows were created**

In the new Sparkle Finder Supabase project, run:

```sql
select
  profile.user_id,
  profile.email,
  membership.access_state,
  membership.silver_source,
  membership.trial_started_at,
  membership.trial_ends_at,
  consent.privacy_acknowledged_at
from public.sparkle_finder_profiles profile
left join public.sparkle_finder_memberships membership on membership.user_id = profile.user_id
left join public.sparkle_finder_communication_consents consent on consent.user_id = profile.user_id
order by profile.email;
```

Expected:

```text
The test Gmail user exists.
Membership access_state is silver_trial.
silver_source is trial.
trial_ends_at is approximately 45 days after signup.
```

- [ ] **Step 5: Verify Sparkle Finder app session**

Open:

```text
https://yoursparklefinder.com/account
https://yoursparklefinder.com/library
https://yoursparklefinder.com/silver
```

Expected:

```text
The user stays in Sparkle Finder.
No route redirects to Neon Rabbit HQ.
Library still loads catalog data through Sparkle Suite Finder API or fixture fallback.
```

### Task 8: Verify Other Products Were Not Affected

**Files:**
- No repo file changes.

- [ ] **Step 1: Verify Vercel aliases**

Run:

```powershell
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' alias list --cwd C:\Users\louis\sparkle-finder-repo | Select-String -Pattern 'sparkle-finder-dev.vercel.app|yoursparklefinder.com|www.yoursparklefinder.com|neon-rabbit-hq|sparkle-suite'
```

Expected:

```text
Sparkle Finder aliases point to Sparkle Finder deployments.
Neon Rabbit HQ aliases still point to Neon Rabbit HQ deployments.
Sparkle Suite aliases still point to Sparkle Suite deployments.
```

- [ ] **Step 2: Verify HQ still loads**

Open:

```text
https://neon-rabbit-hq.vercel.app/login
```

Expected:

```text
Neon Rabbit HQ login page loads as before.
No Sparkle Finder branding appears.
```

- [ ] **Step 3: Verify Sparkle Suite still loads**

Open the current Sparkle Suite customer-facing domain used by the project.

Expected:

```text
Sparkle Suite loads as before.
No Sparkle Finder customer auth redirects appear.
```

- [ ] **Step 4: Verify old shared Supabase project was not modified**

If Supabase admin access is available, inspect old project `bqhzfkgkjyuhlsozpylf`.

Expected:

```text
Existing redirect URLs are unchanged.
Existing HQ/Suite auth settings are unchanged.
No URL was removed.
```

### Task 9: Update Documentation And Handoff

**Files:**
- Modify: `C:\Users\louis\sparkle-finder-repo\docs\deployments\sparkle-finder-silver-auth-env-vars.md`
- Create: `C:\Users\louis\sparkle-finder\docs\handoffs\2026-06-09-sparkle-finder-separated-auth-boundary.md`

- [ ] **Step 1: Update deployment doc**

Update the deployment doc so it says:

```text
Sparkle Finder has a dedicated Supabase Auth/account project.
Do not point Sparkle Finder customer auth at Neon Rabbit HQ or Sparkle Suite.
Sparkle Suite catalog data remains consumed through the Finder API boundary.
The old shared Supabase project bqhzfkgkjyuhlsozpylf must not be treated as Sparkle Finder's long-term customer auth project.
```

- [ ] **Step 2: Add handoff summary**

Create a handoff with:

```text
Date: 2026-06-09
Decision: Each customer-facing product gets a dedicated auth boundary.
Sparkle Finder Supabase project ref: <new project ref>
Sparkle Finder Site URL: https://yoursparklefinder.com
Sparkle Finder dev URL: https://sparkle-finder-dev.vercel.app
Catalog source: https://www.yoursparklesuite.com public Finder APIs
Verification performed: signup, account rows, alias checks, HQ load check, Suite load check
Open items: Stripe live env/service-role, Supabase migration history reconciliation if any, paid billing rollout
```

- [ ] **Step 3: Commit docs**

Run:

```powershell
git -C C:\Users\louis\sparkle-finder-repo status --short
git -C C:\Users\louis\sparkle-finder-repo add docs/deployments/sparkle-finder-silver-auth-env-vars.md
git -C C:\Users\louis\sparkle-finder-repo commit -m "docs: record Sparkle Finder separated auth boundary"
git -C C:\Users\louis\sparkle-finder-repo push origin codex-sparkle-finder-v1
```

Expected:

```text
Only documentation changes are committed.
```

---

## Rollback Plan

Rollback must not delete URLs or alter HQ/Suite.

If Sparkle Finder signup breaks after the split:

1. Pause customer testing.
2. Do not change HQ/Suite config.
3. Inspect Sparkle Finder Vercel env values for `sparkle-finder-dev`.
4. Inspect the new Sparkle Finder Supabase Auth URL Configuration.
5. Restore Sparkle Finder Vercel aliases to the previous known-good Sparkle Finder deployment if needed:

```powershell
& 'C:\Users\louis\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\.bin\vercel.cmd' alias set <previous-sparkle-finder-deployment-host> sparkle-finder-dev.vercel.app --cwd C:\Users\louis\sparkle-finder-repo
```

6. Do not repoint Sparkle Finder auth back to Neon Rabbit HQ as a rollback unless Louis explicitly approves a temporary emergency bridge.

---

## Self-Review

Spec coverage:

- Separate Sparkle Finder auth boundary: covered by Tasks 2, 4, 5, and 7.
- Do not affect other products: covered by Non-Negotiable Rules and Task 8.
- Google signup should create/login a Sparkle Finder customer: covered by Tasks 4 and 7.
- Shared jewelry library should not be duplicated: covered by Architecture, Environment Boundary, and Task 7.
- Supabase migration/account rows: covered by Task 3 and Task 7.
- Vercel deployment: covered by Tasks 5 and 6.
- Documentation/handoff: covered by Task 9.

Placeholder scan:

- Secrets and project refs intentionally use terminal environment variables because they must not be committed or pasted into docs. The plan requires capturing exact values at execution time and verifying the new ref is not the old shared project.

Type consistency:

- Existing env names remain consistent with current code: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Catalog API boundary stays consistent with `SPARKLE_SUITE_FINDER_API_BASE_URL` and the default in `catalog-service.ts`.
