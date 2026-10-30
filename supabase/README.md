# Supabase Migrations

## Applying migrations

Migration `001_initial_schema.sql` must be applied manually. You have two options:

### Option A — Supabase Dashboard SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Paste the contents of `migrations/001_initial_schema.sql` and run it

### Option B — Supabase CLI
```bash
supabase db push
```

## Prerequisites

**pgvector must be enabled before running the migration.** The migration includes `create extension if not exists vector;` which handles this, but the extension must be available on your Supabase plan (it is enabled by default on all Supabase projects).

## Security

The `service_role` key grants full database access, bypassing Row Level Security. It is **not** stored in this repository or in `.env.local`. Retrieve it from **Bitwarden** when needed for admin operations (e.g., seeding, migrations run server-side).

Never expose the `service_role` key client-side or commit it to version control.

## Migration history rules (keep repo and Live aligned)

The Live Supabase project is shared by Sparkle Suite and Louis's Ops Center (LOC).
`supabase/migrations/` must list exactly the versions recorded in Live's
`supabase_migrations.schema_migrations`, so the Supabase CLI never sees
"remote-only" or "local-only" versions.

- Pick the version in the file name first, then apply that exact file. Never apply
  Suite SQL through a tool that invents its own timestamp (the Supabase MCP / dashboard
  `apply_migration` records the time it ran as the version). If that already happened,
  rename the repo file to the version Live recorded, in the same PR or the next one.
- Migrations applied to this database from another repo (LOC, old VAC work, one-off
  reverts) get a comment-only "remote history witness" file here with Live's exact
  version and name. Never add executable SQL to a witness file.
- Do not edit a migration file after it has been applied to Live. Write a new migration.
- Do not run `supabase db push` or `supabase migration repair` against Live without
  first comparing `supabase migration list` and getting Louis's OK.
