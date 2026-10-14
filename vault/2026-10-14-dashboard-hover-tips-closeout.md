# 2026-10-14 dashboard hover tips

- Shipped delayed tips on the six Tools dashboard subject cards (Shows, Customers including birthdays, Dance Floor, Messages, Website visitors, Last month).
- Copy lives in `app/nic-nac/components/rep-dashboard-tips.ts`. A tip appears after a 2 second rest, on focus, or after a touch long-press. It does not sit on the card at rest and does not block Manage.
- Branch `cursor/dashboard-hover-tips-a45f`, tip `e4aa38fe`. Allowlisted for Smoke preview only.
- Smoke preview: `dpl_62gb9UoHsLuWvR95MLviKrP35j4v` at `https://sparkle-suite-smoke-dlaqdh7b5-louis-2849s-projects.vercel.app` (preview target, project `sparkle-suite-smoke`).
- `sparkle-suite-smoke.vercel.app` stayed on `dpl_4CwkKgDxoyfxAA7tsKgHMcexhEep`. No Live deploy, no domain move, no Live DB write.
- Next: Louis reviews the draft PR. Do not merge until he says so.
- Audit only, same day: `docs/hover-tips-audit.md` lists other Workspace and Nic-Nac spots for a later delayed tip. No tips were built from that list.
- Tools list now starts with Dashboard. It is selected while the dashboard is showing and returns there after a tool replaces it. Smoke preview redeployed as `dpl_GMpACkwuEAA2qwPpRdDQTjQuvw9P` at `https://sparkle-suite-smoke-8mnt5i1zt-louis-2849s-projects.vercel.app`, commit `127bd1c7`, target preview. `sparkle-suite-smoke.vercel.app` stayed on `dpl_4CwkKgDxoyfxAA7tsKgHMcexhEep`. No Live deploy, no domain move, no Live DB write.
