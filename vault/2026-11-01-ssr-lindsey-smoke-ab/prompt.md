# Suite SSR: Lindsey (milehighfizz) Smoke A/B, one run (Chromium)

Model: GPT-6.1 Sol High. Repo louis623/sparkle-suite, branch codex/ssr-per-rep-allowlist (draft PR #169). Use your own checkout of that branch (fetch it fresh); all paths below are relative to the repo root.
APPLICATION SHA: 320951fc4e8dd08391d259630a2b8fc47f1e8305 (review-slug guard now includes milehighfizz; Rocky PASS 2026-11-01). If the branch tip is newer, verify the diff from 320951fc is vault-only, then deploy 320951fc. Otherwise STOP.
First commit this prompt to vault/2026-11-01-ssr-lindsey-smoke-ab/prompt.md.
Rocky approved the harness gates at 5eaefb1f; the route fix at c4b03c99 makes BOTH cohorts load /milehighfizz with SSR-marker checks before measuring, and 320951fc lets the ssrReviewTheme/ssrReviewLayout overrides work there. Use the committed harness scripts/qa/ssr-smoke-ab.cjs as-is; don't change gates or cases. Before measuring each row, confirm: the URL is /milehighfizz (never /dudesfizzfest), A has the SSR marker and B has none, and the rendered theme/layout matches the row (the harness theme guard must pass); if any check fails, record that row as INVALID and do not measure it. The local WebKit script ssr-local-lindsey.cjs is not part of this run.

Testing bar (Louis 2026-10-31): test only what matters to users or catches real bugs. ONE pass of the rows below. No repeated matrices, no reruns to chase small differences, no sub-pixel work. Record misses and finish; stop only for a safety problem.

## Safety gates (unchanged from earlier Smoke runs)
- DB binding: save the script in the appendix below to a temp file OUTSIDE the repo, run it exactly as written with bash (needs a signed-in Vercel CLI), and proceed ONLY if it prints "RESULT: SMOKE BINDING OK" and exits 0. Don't do your own decrypt/compare. On anything else, STOP before deploying and report its (value-free) lines.
- Secret filtering: never print secrets, tokens, bypass values, share links or cookies. No raw get_alias/get_project JSON; strip *bypass*/*token*/*secret*/share-link fields before printing. Keep the bypass only in variables or temp files outside the repo, deleted afterwards. Report env NAMES only.
- NOTHING on Live: no access to Live project prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3 or Live DB bqhzfkgkjyuhlsozpylf. No Vercel env/settings/protection changes, no new bypass tokens, no merge (PR stays draft), no sends, checkouts or provider actions.

## Step 1: two Smoke deployments of 320951fc
Smoke project prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ only, with the 39 deployment-only overrides listed in vault/2026-10-29-release-ssr-finder/planned-deployment-env-names.json, passed for both runtime and build env exactly as for dpl_2tsBNUCP3cFyvf9Au155cMTX3s51:
- 3 Smoke DB bindings from the Smoke project's own values (temp file outside the repo, deleted afterwards). Never a Live value.
- NEXT_PUBLIC_SPARKLE_ENVIRONMENT=smoke, SPARKLE_ENVIRONMENT=smoke, SPARKLE_RELEASE_REPOSITORY=louis623/sparkle-suite, SPARKLE_RELEASE_BRANCH=codex/ssr-per-rep-allowlist.
- Every other inherited credential/flag in the list set EMPTY.
- A (SSR): REP_RENDER_V2_SLUGS=dudesfizzfest,milehighfizz. B (legacy): REP_RENDER_V2_SLUGS=dudesfizzfest, unaliased, reached only via the existing automation bypass.
- Don't set SSR_PREVIEW_PAGE_DATA_DELAY_MS or SSR_PREVIEW_THEME_OVERRIDE.
One attempt per deployment; on a build failure report the error and stop.
Record ALIAS_BEFORE (expected dpl_2tsBNUCP3cFyvf9Au155cMTX3s51; if different, record and STOP). Rollback target = ALIAS_BEFORE.

12 GET controls on A's URL and B's URL (HTTP 200 and `data-server-rendered`): milehighfizz home/trade/join = SSR yes on A, no on B; dudesfizzfest home/trade/join = yes on both; blingkitchen and smokecodex home/trade/join = no on both. Only if A passes 12/12, move sparkle-suite-smoke.vercel.app to A and rerun the 12 on the Smoke domain (must match A). Save A-candidate-controls.json, A-alias-controls.json, B-candidate-controls.json.

## Step 2: one A/B pass with the committed harness
milehighfizz (rep a0683f86-a19b-4ee5-a8d1-16dd015371ee) appearance_preset may be changed temporarily in the Smoke DB pukemqiwlyqmyytxkdmo only, guarded and read back after each change. Leave template amethyst and motion zoom unchanged.
Rows (desktop and phone, method as the harness defines it):
- Lindsey's own, mile_high_fizz layout: gilded_autumn and alpine_opal, home/join/trade. alpine_opal last.
- Her saved preset, standard layout: halloween_pumpkin_witch home/join/trade.
- Fixed in this PR: fall_owl_harvest_moon, midnight_rose and rose_gold home on the mile_high_fizz layout; amethyst home on the standard layout.
(Exactly the cases committed in the harness at c4b03c99; the removed rows halloween_pumpkin_cat/homepage, pearl_rose/join and midnight_rose/join stay out.)
Gates are the harness's: SSR LCP/FCP no slower than legacy (same theme), CLS exactly 0, no page or #418/#423/#425 hydration errors on the candidate, loading taps warn >200 / fail >300 ms, idle taps fail >200 ms, absolute targets with the five hard-coded phone waivers. Also confirm per theme: hero animation autoplays with no click and Pause/Play works.
Then restore milehighfizz appearance_preset to ORIGINAL halloween_pumpkin_witch and read it back independently. Confirm the alias is on A and B has zero aliases.

Commit the report and evidence (CSV/JSON, a few compressed screenshots, control receipts) under vault/2026-11-01-ssr-lindsey-smoke-ab/ and push.

## Report (plain, pass/fail with numbers)
- Binding-check result; A and B deployment IDs; alias before and after.
- 12 controls on A, alias and B.
- One table: row, device, SSR vs legacy LCP median, CLS, errors, worst tap loading/idle, autoplay yes/no, PASS/FAIL/WAIVED.
- Overall count of passing rows; every FAIL listed with its number.
- preset restore read-back; confirmation nothing on Live changed.

Shipping bar (Louis): decent and working. Only fix or block on real problems a person would notice or get stuck on (broken pages, errors, things not working, clearly slow pages, security/data risk). Skip rare edge cases and tiny visual or pixel differences; those get fixed when real users report them. Testing: focused tests for what you change plus one full pass at the end; no repeated full runs.

## Appendix: Smoke DB binding check script (save outside the repo; do not edit)
```bash
#!/usr/bin/env bash
# Value-free check that the Smoke Vercel project (prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ) points at the Smoke Supabase DB.
# Prints only KEY: SMOKE|LIVE|OTHER exact/ref=yes|no. Never prints values. Exit 0 only if all three pass.
set -uo pipefail
P=prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ
declare -A IDS=([NEXT_PUBLIC_SUPABASE_URL]=2AklKDwjpo9s6JsW [NEXT_PUBLIC_SUPABASE_ANON_KEY]=8Vdonm2jl0iY282e [SUPABASE_SERVICE_ROLE_KEY]=U4WjSFniZFqerKI3)
fail=0
for k in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  out=$(vercel api "/v1/projects/$P/env/${IDS[$k]}" 2>/dev/null | K="$k" python3 -c '
import sys,json,os,base64
k=os.environ["K"]; t=sys.stdin.read()
try: d=json.loads(t[t.find("{"):t.rfind("}")+1])
except Exception: print("UNREADABLE"); sys.exit(1)
v=str(d.get("value","")).strip().strip("\"").strip()
if not d.get("decrypted"): print("NOT_DECRYPTED"); sys.exit(1)
tg=",".join(sorted(d.get("target") or []))
if k.endswith("URL"):
  c="SMOKE" if "pukemqiwlyqmyytxkdmo" in v else "LIVE" if "bqhzfkgkjyuhlsozpylf" in v else "OTHER"
  ok=v=="https://pukemqiwlyqmyytxkdmo.supabase.co"; yn="yes" if ok else "no"; print(f"{c} exact={yn} targets={tg}")
else:
  try:
    p=v.split(".")[1]; p+="="*(-len(p)%4); ref=json.loads(base64.urlsafe_b64decode(p)).get("ref","")
  except Exception: ref=""
  c="SMOKE" if ref=="pukemqiwlyqmyytxkdmo" else "LIVE" if ref=="bqhzfkgkjyuhlsozpylf" else "OTHER"
  ok=c=="SMOKE"; yn="yes" if ok else "no"; print(f"{c} ref={yn} targets={tg}")
sys.exit(0 if ok else 1)'); rc=$?
  echo "$k: $out"; [ $rc -eq 0 ] || fail=1
done
[ $fail -eq 0 ] && echo "RESULT: SMOKE BINDING OK" || echo "RESULT: FAIL (stop)"
exit $fail
```