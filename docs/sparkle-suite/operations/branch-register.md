# Sparkle Suite Branch Register

**Reviewed:** September 15, 2026

**Repository:** `louis623/sparkle-suite`

**Primary workbench:** `C:\Users\louis\sparkle-suite-repo`

## Authoritative controls

- Active and production branch: `codex/nic-nac-trade-hardening`
- GitHub default branch: `codex/nic-nac-trade-hardening`
- Local `origin/HEAD`: `origin/codex/nic-nac-trade-hardening`
- Vercel `sparkle-suite` production branch:
  `codex/nic-nac-trade-hardening`
- Production remains manual-deploy only. A Git push or branch-setting change is
  provenance/housekeeping and must not create or promote a deployment.
- Canonical live review target: `https://www.yoursparklesuite.com`

The machine-readable source is `config/active-branches.json`. The local/build
guard is `scripts/check-active-branch.mjs`. The primary workbench remains the
general-purpose Windows workspace. The isolated Google verification worktree
below is limited to its approved scope.

## September 23 isolated trade-request checkout

`C:\Users\louis\sparkle-suite-repo\.codex-worktrees\trade-request-completion`
is a clean, task-scoped checkout of the active production branch at
`b3afcf941a790a771767d89c421b7f38ed63bba0`. It exists to implement and
verify the approved trade-request upload, Dance Floor readability, and MSRP
retirement plan while preserving unrelated dirty work in the primary checkout.
It uses the same GitHub repository and active branch; it does not authorize a
new branch, extension work, or a second production lane.

## September 20 isolated Google verification worktree

Louis approved `C:\Users\louis\.codex\worktrees\blingkitchen-google-verification\sparkle-suite-repo`
as an isolated release workspace for the BlingKitchen Google Search Console
verification tag. It starts at approved source `49037082` and carries only the
tenant-scoped verification change plus its regression test. Its intended GitHub
and Vercel release branch remains `codex/nic-nac-trade-hardening`; this entry
does not create a second production branch, move an alias, change the Vercel
production branch, or authorize extension work.

## September 20 temporary SEO crawl-refresh branch

Louis approved `codex/seo-crawl-refresh` only in that isolated
Google-verification worktree. It may implement and test the public sitemap and
canonical-host repair for the four audited customer sites. It is not a
production branch: GitHub's default branch, Vercel's production branch, all
production aliases, and the protected primary workbench remain unchanged until
the exact reviewed change is merged back to `codex/nic-nac-trade-hardening`.

## September 15 consolidation evidence

The active branch tip at audit time was `69110afc`. The application code served
in production is `8f2ca269`, deployed as
`dpl_DYKVKfGw58hpeseUEgfoxPVLiJtj`. Commit `69110afc` adds documentation only.
Changing GitHub/Vercel branch metadata during this consolidation does not move
an alias, deploy code, run a migration, publish an extension, or touch customer
data.

Remote-branch comparison against `codex/nic-nac-trade-hardening` found:

| Branch/ref | Tip | Branch-only work | Classification |
|---|---:|---|---|
| `codex/nic-nac-trade-hardening` | `69110afc` | Authoritative combined history | **ACTIVE / PRODUCTION** |
| `codex/nic-nac-photo-rarity-repair` | `5a1aa7ec` | One Vault-only staged-review closeout; application history was merged through `61e592d0` | **ARCHIVED — NO RELEASES** |
| `main` | `00f8f4c7` | Twenty legacy standalone/team-onboarding commits | **ARCHIVED LEGACY**; newer integrated Team Management exists on active |
| `codex/incident-archive-2026-07-31-main` | `659f4ef8` | Legacy onboarding plus logout/build-exclusion work | **ARCHIVED LEGACY**; logout and exclusion exist on active |
| `codex/incident-archive-2026-07-31-approved-line` | `0fda2b47` | Old source guard and Collection Intake entry | **ARCHIVED LEGACY**; both were superseded on active |
| `codex/sparkle-cross-phase-hardening` | `8da7dc11` | Zero | **ARCHIVE-SAFE / CONTAINED** |
| `codex/sparkle-phase-8-prelaunch` | `4b2ea01b` | Zero | **ARCHIVE-SAFE / CONTAINED** |
| `codex/sparkle-phase-9-seo-geo` | `9b6983cf` | Zero | **ARCHIVE-SAFE / CONTAINED** |

The June `main` Team Management implementation is not blindly mergeable. The
active branch contains a later service, participant/message routes, public
token-access routes, updated standalone onboarding client, migrations, and
broader tests. The July Collection Intake and workspace logout changes are also
present in later form on the active branch. No application feature was found
that should be copied from those old branches into production.

## Preservation and dirty-worktree boundary

Existing July archive tags remain authoritative. The September 15 cleanup also
preserves:

- `archive/2026-09-15/nic-nac-photo-rarity-final` at `5a1aa7ec`
- `rescue/2026-09-15/pre-release-autostash` at `9b87c752`

The shared primary workbench was intentionally not cleaned, reset, stashed, or
mass-staged. It had 83 modified/deleted/untracked entries spanning separate
message-center, resource-library, skin, Finder, documentation, generated
artifact, and extension work.

Important quarantines:

- The primary workbench's uncommitted `chrome-extension/` state exactly matches
  the pre-2.0 source at `d77b64a2`; committed history and the Web Store remain
  on 2.0.0. Never include that local 1.0.1 overlay in a broad commit.
- `.codex\worktrees\1c27\sparkle-suite-repo` contains three uncommitted
  rep-welcome skill/template edits not present in the primary workbench.
- `.codex\worktrees\c385\sparkle-suite-repo` contains an untracked standalone
  Collection Intake prototype. The active app has the later integrated
  Collection Intake tool, but the prototype remains preserved as historical
  design material.
- Other dirty worktrees contain generated output, line-ending drift, or
  explicitly separate in-progress files. None was removed.

These files are not production omissions. They require task-by-task
reconciliation and must not be swept into the active branch merely to make
`git status` empty.

## Branch lifecycle

1. New work and releases start from `codex/nic-nac-trade-hardening` only.
2. A branch-status change requires Louis's explicit approval and a coordinated
   update of this register, `config/active-branches.json`, GitHub's default
   branch, and Vercel's production branch.
3. Before deleting a branch or worktree, verify it has no unique commits or
   uncommitted files and create a preservation tag or backup.
4. Branch/worktree deletion remains a separate explicit action. This
   consolidation changes no branch history and deletes nothing.
5. Never broadly stage the shared workbench. Ship through the Smoke-first lane
   (Core Memory `skills/sparkle-smoke-ship.md`). From a clean checkout, verify
   production aliases did not move unless Louis approved that live promote.
