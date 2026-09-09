# Customer-site visibility switches — September 9, 2026

## Implementation and evidence

- Approved plan: `docs/sparkle-suite/2026-09-09-public-site-visibility-plan.md`.
- Site Settings groups Announcements, Join Team, Dance Floor and Live Lineup
  into accessible switches with individual descriptions and explicit On/Off.
  Save uses the existing settings flow. Join Team remains entitlement-gated.
- New preferences default on for current and future accounts. Announcement and
  recruiting choices are preserved. Shared display rules cover the standard
  homepage and custom variants plus Trade, Join and Pantry bootstraps. Dance
  Floor direct links remain usable; hidden publication is not a privacy gate.
- Migration `20260909190000` applied alone and verified as two NOT NULL boolean
  columns defaulting true. History entry independently verified/recorded through
  a guarded management query after CLI repair encountered HTTP 502 errors.
  No pending Lineup migrations applied.
- 157 focused tests passed, including headless browser switching, mobile layout,
  keyboard interaction, and save validation. Later browser coverage exercised
  on/off/on on all four customer-site variants and custom recruiting buttons.
- Local full build encountered separate Sites TypeScript contamination. An
  application-only TypeScript check passed after two narrow type corrections.
  Git-source Vercel builds isolated the release from the paused working tree.
- Initial live release `e65be65d` / `dpl_2TXtJB84U8giJGy9HsmJFDhswCGA`
  passed full hosted build and was promoted. Synthetic reviewer UI saved Off,
  reloaded, verified hidden public sections, then saved On and verified restored
  sections. Original four preferences were restored and read back exactly.
  Existing reviewer identity/auth match and non-live smoke entitlement were
  checked first; no account reset, password change, email or payment occurred.
- Suite www/apex and Bri custom alias IDs matched that deployment. Anonymous
  browser checks confirmed stable Suite landing pages, sign-in form, Bri slug
  and custom-domain renderer, and Brittany renderer.
- Screenshot: `artifacts/public-site-visibility-live.png`. Synthetic check scripts
  and screenshots are local evidence under artifacts; they contain no tokens.

## Release isolation

Only this task's files and explicitly selected visibility hunks were staged.
Paused Live Lineup source, runtime, generated bundle, migrations and tests remain
uncommitted and unreleased. No stash, checkout replacement, extension operation,
queue write, listing change, customer billing change or customer preference
toggle was used. The only preference toggles were on the existing synthetic
reviewer, and were restored.

## Final correction

Commit `b20fe0f3f7b202e1aecc4e8df6534fdaf3d42519` also hides custom recruiting
placeholder buttons when Join Team is off. All-four-variant browser proof passed.
Its isolated deployment `dpl_5GJTuM6sPVfjz27RQoMNjLcX1Xh2` passed the full hosted
build and was promoted to the same Suite and customer domains. The exact final
deployment passed the live synthetic Off/On save/reload/public-display check;
original preferences were restored and verified. Suite www/apex, Bri and Brittany
alias IDs were individually confirmed against the final deployment.
Heather, Mile High Fizz, and Go for the Bling apex aliases were also individually
confirmed against the final deployment.

Reviewer click path: `/nic-nac?section=site-settings` → “Show on your website” →
change a switch → “Save site settings” → reload → open the synthetic public
homepage. Reset means restoring the saved original four visibility preferences;
no reviewer account or queue reset is needed. A headless isolated browser used
the existing verified synthetic reviewer; Louis's Chrome/account was not used.
