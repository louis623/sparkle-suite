# LIVE-LINEUP-STATUS — Sources inventory

**Companion to:** `vault/LIVE-LINEUP-STATUS.md`  
**Drafted:** 2026-09-20 ~9:45pm ET  
**Method:** Deep read + synthesize. No invention of undated facts; unknowns flagged in STATUS.

This file lists every vault path and Open Brain theme used so parent/PR review can audit provenance.

---

## 1. GitHub / tip vault files (louis623/sparkle-suite @ codex/nic-nac-trade-hardening)

Read from local mirrors under `/workspace/sparkle-suite-deploy/vault/` and `/workspace/lineup-review/vault/` (content matches required tip vault names). Tip `chrome-extension/manifest.json` also confirmed via GitHub MCP `get_file_contents` on 2026-09-20 → version **2.0.3**.

### Required closeouts (all read)
| Path | Used for |
|------|----------|
| `vault/2026-09-05-live-lineup-closeout.md` | Sep 5 Brittany mitigation, 180s cutoff, polling patch, Task List id, deploys |
| `vault/2026-09-15-live-lineup-2-full-session-historical-closeout.md` | Full Live Lineup 2 architecture, why/what built, SHAs, lessons, homepage mount defect |
| `vault/2026-09-15-live-lineup-2-production-release-closeout.md` | 2.0.0 Store ZIP SHA, migrations, deploys, reviewer limitation, Stripe unrelated note |
| `vault/2026-09-15-live-lineup-ui-session-handoff.md` | Sep 15 UI trilogy summary + remaining work |
| `vault/2026-09-15-live-lineup-responsive-support-closeout.md` | Public all-entries, support proxy bug, Bri not-connected |
| `vault/2026-09-15-live-lineup-workspace-ui-simplification.md` | Compact card, plain-English connection, commit/deploy |
| `vault/2026-09-15-live-lineup-workspace-height-closeout.md` | 460px min, rail fill, commit/deploy |
| `vault/2026-09-15-mac-live-lineup-help-closeout.md` | Chrome-on-Mac Help; iPhone/iPad cannot |
| `vault/2026-09-15-britt-live-lineup-timestamp-hotfix.md` | Remove “delayed” customer copy; Updated time |

### Additional vault / review files read
| Path | Used for |
|------|----------|
| `vault/2026-09-09-live-lineup-local-hardening-checkpoint.md` | (listed/inventory; Sep 9 hardening arc also from Open Brain) |
| `vault/2026-09-09-live-lineup-post-reconcile-handoff.md` | Hardening era pointer |
| `vault/2026-09-15-lindsey-onboarding-and-mac-support-session-closeout.md` | Lindsey Mac/Chrome + MHF DNS context |
| `vault/2026-09-17-live-lineup-2.0.4-agent-owned-smoke-readiness.md` | 2.0.4 package SHA, PR tip, agent gates |
| `LIVE_EXTENSION_SAFETY.md` (repo root) | Binder rules; archive ZIP pointers; Codespace-only |

### Vault heads skimmed for Live Lineup bits only
| Path | Extract themes |
|------|----------------|
| `vault/project-state.md` | Sep 5 identity repair; Sep 8 audit; protected Lineup notes; PR #1 left open mentions |
| `vault/open-items.md` | Sep 5 mitigation pointer; Live Queue onboarding smokes; **stale** “Live Lineup 2.0.3 release” checklist |
| `vault/decisions.md` | Sep 5/8 decisions; Live Queue code durability; audience language; **2026-09-17 assigned-code + auto discovery** |
| `vault/session-log.md` | Not line-walked end-to-end (7550 lines); Live Lineup facts taken from dated closeouts + Open Brain instead |

### Tip code / package checks
| Artifact | Result |
|----------|--------|
| GitHub tip `chrome-extension/manifest.json` | version `2.0.3` (2026-09-20) |
| Local `/workspace/sparkle-suite-deploy/chrome-extension/manifest.json` | version `2.0.3` |
| `/workspace/live-lineup-2.0.4/sparkle-suite-live-lineup-2.0.4.zip` SHA-256 | `961bffd3d6b512cc8fc1e03f59976b71f7e57c8d82932b003ce1be0ab6e7e6cc` |
| `/workspace/live-lineup-2.0.4/AGENT-OWNED-SMOKE-READINESS.md` | Agent smoke receipt Sep 17 |
| `/workspace/lq204/manifest.json` | Unpacked 2.0.4 tree present |
| `lib/live-lineup/*` listing | Architecture file map confirmation |

**Not fetched verbatim from GitHub blob API this pass (local mirrors used):** the nine required vault markdown bodies — content matched required filenames in deploy/review trees. Parent should confirm tip still contains the same filenames before vault PR.

---

## 2. Open Brain (`user-Open Brain` / `search_thoughts`) — themes used

Queries (threshold ~0.3–0.4, limits 10–25):
1. Live Lineup / Live Queue / Brittany / lease_required / consecutive collapse / Party Filter / privacy / 2.0.4
2. Consecutive collapse / Party Filter / CWS 1.0.1 / April–May 2026
3. Pairing rejected / private key / soft fallback / tip lock / not connected showing data
4. Sep 20 tip lock / readiness / Workspace
5. Early rebuild / absolute rules / CWS first publish (partial hit quality)

### Theme → STATUS sections
| Open Brain theme / date | STATUS use |
|-------------------------|------------|
| Apr 12 consecutive collapse add `07a61f3` / remove `ba1e5a6` | §F.1, §G, §H |
| May 8 PartyID filter Lindsey verify | §F.3 |
| May 18 repo≠Store Party Filter lesson + checklist | §F.3, §G |
| Jun 4 privacy policy URL + sideload crisis | §F.4 |
| Sep 5–6 Brittany continuity / Task List / terminology | §F.6 |
| Sep 7–8 Live Lineup naming; audit precedes build | §B, §F.7 |
| Sep 9 hardening / parser / publisher / concurrency / readiness | §F.8, §E |
| Sep 15 historical architecture thought + UI/responsive/support/height/timestamp thoughts | §F.9–F.10 |
| Sep 16 pairing rejection; 2.0.1 popup; 2.0.2 ZIP | §F.11 |
| Sep 17 2.0.3 no party detection; Rocky context pack; agent smoke PASS; CWS submit notes; assigned-code decision echo | §F.12, §C |
| Sep 18 CWS public 2.0.4 confirm; Live Lineup Watch agent created; intake→favorites parked idea | §C, §H |
| Sep 19 Lindsey lease_required + temp server fix `49037082` / `dpl_8w2U1zZ…` | §F.13, §I |
| Sep 20 shared Git tip lock + sticky safety rails | §A, §F.14 |

**Sensitive:** Open Brain entries may contain full sync codes. STATUS intentionally uses **patterns only** (`MHF-####`) and omits live codes.

---

## 3. Local Live Lineup Watch companions (already on disk)

| Path | Used for |
|------|----------|
| `/workspace/live-lineup-watch/EXPERT-BRIEF.md` | Architecture, file map, version awareness, parking lot, MV3 gotchas |
| `/workspace/live-lineup-watch/2026-09-19-lindsey-lease-required-incident.md` | Full Sep 19 classification + verification |
| `/workspace/live-lineup-watch/MEMORY-FACTS.md` | Durable bullets cross-check |
| `/workspace/live-lineup-watch/CHROME-EXTENSIONS-GENERAL.md` | Sparkle tie-back only (§6) |
| Prior thin `/workspace/live-lineup-watch/LIVE-LINEUP-STATUS.md` | Seed outline + Sep 20 fail-safe wording from Codex/Louis |
| `/workspace/CODEX-SESSION-START-STICKY.txt` | Tip lock / safety rails wording |

---

## 4. Explicitly not used / gaps

| Gap | Why it matters |
|-----|----------------|
| Full `vault/session-log.md` line-by-line | Too large; risk of noise. Prefer dated closeouts. |
| GitHub raw re-fetch of every vault file on tip | Local mirrors used; parent should diff tip before PR. |
| Live `chrome://extensions` on Lindsey/Brittany machines | Not available to Watch agent this session — installed version `[uncertain]` beyond CWS public 2.0.4 ops note. |
| Whether PR #1 fully merged into tip | Tip manifest still 2.0.3; treat 2.0.4 line as Store-ahead of tip. |
| Exact “first rebuild” commit date ~Mar/early Apr | Marked uncertain in §F.0. |
| docs incident/audit markdown bodies | Cited by vault; not fully re-read this pass. |
| Live CWS dashboard re-scrape on 2026-09-20 | Relied on Sep 18 ops confirmation of 2.0.4 public page. |

---

## 5. Provenance rule for future updates

When editing STATUS.md:
1. Add/change facts with date + SHA/deploy when known.
2. Append §K changelog line.
3. Append a row here if a **new** vault path or Open Brain theme was introduced.
4. Never paste live sync codes, tokens, or passwords into either file.
