# CLAUDE.md

Repo-level operating manual for Claude Code. Loaded automatically at session start.

---

## Section 1 — Universal (NR-wide conventions)

- **Branch**: `main` only. Never create worktrees, new branches, or temporary directories unless Louis explicitly requests one.
- **Commits**: Use `feat`/`fix`/`chore` prefix with descriptive subject. Examples:
  - `feat(thumper): add health check endpoint`
  - `fix(auth): correct RLS policy on rep_profiles`
  - `chore: regenerate CODEBASE_SNAPSHOT`
- **Push gate**: Confirm with Louis before `git push` to main. Do not push autonomously.
- **Plan Mode**: Default for substantial tasks (Shift+Tab twice in Desktop). Single-line fixes can skip.
- **Close session**: Type `close session` and hit enter. The `/exit` command does NOT work in Desktop.
- **CODEBASE_SNAPSHOT.md**: Hand-maintained file at repo root. Regenerate fully after major builds (new routes, new tables, significant refactors). Format: match the existing file's structure (directory tree, TypeScript types, data files, components, dependencies, configs).

---

## Section 2 — Repo-specific (neon-rabbit-core)

### Env and credentials

- `DATABASE_URL` is in `.env.local` — check there before asking Louis for credentials.
- Supabase project: `neon-rabbit-core`, ref `bqhzfkgkjyuhlsozpylf`, region `us-east-1`.
- Supabase CLI is installed, logged in, and linked to `bqhzfkgkjyuhlsozpylf`. You can use `supabase db push` for migrations.

### Migration pattern

- TypeScript migration scripts live in `scripts/` directory.
- Runner pattern: mirror `scripts/run-migration-027.ts` (tsx runner with hostname allowlist).
- Current migrations run against cloud Supabase at `bqhzfkgkjyuhlsozpylf` (same target as migrations 020-028).
- Naming convention:
  - NR-wide infrastructure migrations → `xxx_nr_description.sql`
  - SS-specific application layer migrations → `xxx_ss_description.sql`

### RLS

- `service_role` only on audit/telemetry tables: `thumper_incidents`, `tool_executions`, `auth_events`, `trade_action_audit`, `sms_email_blast_audit`.
- Rep-facing tables use `rep_id`-scoped RLS policies.

### Test commands

- `npm test` — unit tests only (vitest). No external dependencies.
- `npm run test:attack5` — live-server-dependent security test. Requires local dev server running.

### Key file locations

- **System prompt**: `lib/thumper/system-prompt.ts` — single `THUMPER_SYSTEM_PROMPT` export.
- **Shared Thumper libs**: `lib/thumper/auth.ts`, `lib/thumper/persistence.ts`, `lib/thumper/tools/*` — these are SHARED across routes. Do not modify directly. Wrap at route level if route-specific behavior is needed.
- **Service layer**: `lib/services/trade-board.ts` — verify actual function signatures before wiring. Do not modify without explicit approval.
- **Edge Functions**: `supabase/functions/` — `nr-hq-mcp` and `open-brain-mcp` are the two active MCP endpoints.

### Reference UI files

- Thumper UI reference files (mockups, design tokens): `C:\Users\louis\Downloads\Thumper_UI_Files\` — read-only reference. Do not copy into repo.

### Deployment

- Push-to-main auto-deploys via Vercel. No feature flags, no dev branches.
- Vercel project is linked. `vercel` CLI available if needed.
