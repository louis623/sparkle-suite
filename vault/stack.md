# Confirmed Tech Stack

---

## Infrastructure

| Tool | Role | Notes |
|------|------|-------|
| Vercel | Hosting | Zero-config CI/CD from GitHub |
| Next.js 16 | Framework | TypeScript + Tailwind CSS + App Router |
| Supabase | Database | Postgres + pgvector for Open Brain (Phase 2) |
| GitHub | Repo | louis623/neon-rabbit-core |
| GitLab | Mirror | To be set up |
| Cloudflare | DNS | neonrabbit.net |
| Cheapnames | DNS | Client domains |
| Windows / VS Code | Local dev | C:\Users\louis\neon-rabbit-core — Node.js v24.14.1 — Command Prompt |

---

## Automation and Agents

| Tool | Role | Notes |
|------|------|-------|
| Make.com | Automation | $9/mo entry — n8n is hot-swap if outgrown |
| Claude Code | Agent (build) | Primary tool for build work |
| Co-work | Agent (background) | Vault updates and background tasks |
| Claude (Anthropic) | AI primary | Main intelligence layer |
| Gemini (Google) | AI secondary | Equal compatibility required — active backup |
| NotebookLM | Research | Intelligence reports, source synthesis, knowledge base building |

---

## Memory

| Layer | Status | Description |
|-------|--------|-------------|
| GitHub vault (`/vault/`) | Active (bridge) | Plain Markdown — readable by any AI tool |
| Supabase context store | Phase 2 | Postgres-backed structured context |
| Open Brain (pgvector) | Phase 2 | Semantic search over stored context |
| Discord capture bot | Phase 2 | Pipes Discord messages into Open Brain |
| Obsidian | Phase 2 | Visual interface over the same vault files |

---

## Communications and Payments

| Tool | Role | Notes |
|------|------|-------|
| Resend | Email | Postmark / SendGrid as hot-swaps |
| Stripe | Payments | Standard |
| SignWell | Agreements | E-signature workflow |
| Cal.com | Scheduling | Open-source, clean embed |

---

## Security

| Practice | Detail |
|----------|--------|
| Password manager | Bitwarden |
| 2FA | Required on GitHub, Vercel, Supabase, Stripe, and all critical accounts |
| API keys | `.env` files only — never committed to repo |
| Key rotation | Every 90 days |
| Repo mirror | GitLab (to be set up) |
| DB backups | Supabase Pro daily backups + weekly SQL export to Google Drive |
| Automation backups | Make.com scenarios exported monthly |
