# Sparkle Finder Active Workspace

This directory is the active Sparkle Finder workspace inside the Sparkle Suite repository.

Use this path for future Codex sessions:

`C:\Users\louis\sparkle-suite-repo\apps\finder`

This directory contains both the Sparkle Finder implementation code and the former binder/Open Brain project files. Code, docs, vault memory, plans, handoffs, and Finder-local skills should all live under this app root.

The former standalone repository at `C:\Users\louis\sparkle-finder-repo` is retained as a rollback copy. Do not use it for new work.

Do not start Sparkle Finder implementation work from the old lightweight binder at `C:\Users\louis\sparkle-finder`.

## Startup Memory

At the start of a Sparkle Finder session, read repo-local memory from:

- `vault/project-state.md`
- `vault/session-log.md`
- `vault/decisions.md`
- `vault/open-items.md`

Use repo-local skills from:

- `.agents/skills`

## Workspace Rules

1. Build, test, and run Finder deployment commands from `C:\Users\louis\sparkle-suite-repo\apps\finder`; commit and push from `C:\Users\louis\sparkle-suite-repo`.
2. Treat `C:\Users\louis\sparkle-finder` as an archived redirect folder only.
3. Keep durable project memory in `vault/` and durable plans, handoffs, decisions, and research in `docs/`.
4. Do not copy temp files, screenshots, logs, build output, smoke artifacts, `.tmp`, or `outputs` into durable memory.
5. Standing auth rule: each customer-facing product must have its own auth boundary by default. Do not share or repoint Sparkle Finder customer auth through Neon Rabbit HQ, Sparkle Suite, or another product unless Louis explicitly approves that architecture for the specific product. Shared product data APIs are acceptable; shared login redirects, OAuth fallback URLs, Site URLs, Google OAuth branding, and customer auth user pools require explicit review.
6. **Smoke-first ship lane (locked 2026-09-26):** deploy and verify Finder on Smoke, stack small updates there, then one Louis-approved live promote. A merge or push is not `vercel --prod`. Same-day live hotfix only with Louis’s explicit say-so. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.

