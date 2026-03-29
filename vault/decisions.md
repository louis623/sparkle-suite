# Decision Log

All key architectural, tooling, and operational decisions — logged with date and rationale.

---

## March 29, 2026

**Open Brain confirmed as first-class Phase 2 requirement**
Supabase + pgvector confirmed as the permanent memory solution. Not optional. Must be completed before any other Phase 2 orchestration work begins.

**GitHub vault confirmed as bridge**
The `/vault/` folder in this repo is the interim memory system until Open Brain is live. All AI tools should read it at session start.

**AI tool compatibility — no proprietary lock-in**
Everything built must work equally with Claude and Gemini. No proprietary formats. Plain Markdown, standard SQL, open formats only. Rationale: race between Anthropic and Google means no safe bet on a single provider.

**NotebookLM added to confirmed stack**
NotebookLM confirmed as primary research tool. Use cases: intelligence reports, source synthesis, Bomb Party knowledge base building.

**Multitask by default**
Any task that can run via Claude Code or Co-work runs in parallel, never sequentially. This is a standing operating principle.

**Redundancy plan established**
- GitLab mirror for repo
- Supabase Pro daily backups plus weekly SQL export to Google Drive
- Make.com scenarios exported monthly
- 2FA required on all accounts
- API keys in `.env` only — never committed to repo
- Bitwarden for password management
- Key rotation every 90 days

**AI tool philosophy locked**
Claude is primary. Gemini is active backup. Both must work equally. No lock-in to either.

**Disaster recovery runbook flagged**
Flagged as a Co-work task to be completed once vault is live.

---

## Earlier Decisions (from master doc)

**Framework: Next.js 16 + TypeScript + Tailwind CSS + App Router**
Selected for Vercel-native deployment, strong ecosystem, and App Router for modern routing patterns.

**Hosting: Vercel**
Selected for seamless Next.js integration, preview deployments, and zero-config CI/CD from GitHub.

**Automation: Make.com**
Selected at $9/mo entry point. n8n identified as hot-swap if Make.com is outgrown.

**Email: Resend**
Selected for developer-friendly API. Postmark and SendGrid identified as hot-swaps.

**Scheduling: Cal.com**
Selected for open-source flexibility and clean embed experience.

**Payments: Stripe**
Standard selection for reliability and ecosystem.

**Agreements: SignWell**
Selected for e-signature workflow.

**DNS split strategy**
Cloudflare manages neonrabbit.net. Cheapnames manages client domains.

**Chrome extension — sideload first, Web Store second**
Live Reveal Queue shipped as sideload to unblock clients. Web Store rebuild is a Phase 2 parallel track.

**Obsidian as visual interface**
Obsidian layered over the same GitHub vault files for a visual knowledge graph. Does not replace the vault — it reads from it.
