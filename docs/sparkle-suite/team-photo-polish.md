# Team portraits — working draft

Shared customer-site template change, not a new skin. All current/future reps
inherit the large 8:7 photo cards and their own skin's existing colors.
No migration replaces, reorders, or generates existing rep photos.

## Rep flow

Team Management → lead or saved member → Upload/Replace photo. Use one clear
person, full head/hair and shoulders, with breathing room. JPG/PNG/WebP, at most
3 MB; minimum 400 px on each side, preferably 1000+. A small AI quality/framing
check is disclosed before upload. Unsuitable or uncheckable photos can still be
used as originals; paid polishing requires a successful check.

Review the rectangle, adjust framing or show the whole photo, then save.
Optional **Polish my photo** requires permission and likeness-review consent.
Compare before choosing **Use this photo**. AI is instructed to preserve the
person, but likeness is not guaranteed; nothing replaces the card automatically.
**Use original** resolves the exact selected result's source. **Remove photo**
clears that card's photo, not the member/details or retained source files.

Each request binds the owner, exact saved card ID and its current photo. No
name-based AI-job matching. A replacement upload or refresh does not reset
the card's allowance: initial generation plus three retries. At the last retry,
Guardian records an incident and **Need Help** opens the Workspace support
composer. The rep sends the message themselves. This feature does not create
tickets or send external messages automatically (Louis's clarified instruction).

## Cost and operational controls

- `TEAM_PHOTO_POLISH_ENABLED=true` and the existing `OPENAI_API_KEY` enable edits.
- Default image model: `gpt-image-2.5-sunburst`, medium quality, one 1024-square
  result per request. This is separate from the coding/chat model.
- Shared cap: 25 image jobs/day and 100/calendar month (monthly configurable).
  Caps count attempts, including failed/uncertain submissions, not just results.
- Framing/quality: `gpt-5.6-terra`, low effort; cached by owner and normalized
  source hash, capped at 50 new checks/rep and 500 total per rolling day.
- No automatic image-provider retry. A timeout after submission locks further
  generation for support inspection, because a charge/result may already exist.
- Private generated previews, signed read URLs, public output only on explicit
  approval. Provider request IDs and reported usage are retained. Job caps are
  not exact dollar caps; billing remains token-based.
- No automatic re-polish on skin changes. Existing approved images stay put.

Migrations: `20260920000100_team_photo_polish.sql` and
`20260920000200_team_photo_analysis.sql`. Existing lead framing column from
`20260919120000_ss_team_photo_framing.sql` is also required.

## Economical reviewer smoke

In an isolated non-production app with local reviewer mode, open
`/nic-nac?section=team-management&conversationId=team-photo-smoke`. Sample Team Management labels clearly say
no credits/live saves. On the sample member: open Polish, consent, generate,
choose/restore, exhaust four attempts, open Need Help, and reset the sample.
Do not submit a support ticket during smoke. Sample upload is disabled; framing
and removal affect component state only. Production uses real authenticated
owners; the local fallback stays behind the existing review-mode guard.

`npx tsx scripts/smoke-team-photo-fixture.ts` generates three local-only static
portrait examples using unchanged existing photos. Their generated HTML is
excluded from Git and Vercel. Use them only to check layout/contain/cover on
desktop/mobile, never as customer data or evidence of an AI result.

Focused tests: `amethyst-team-photo-identity`, `amethyst-team-photo-framing`,
`amethyst-join-template`, `amethyst-static-assets-route`,
`nic-nac-dashboard-placeholder`, `nic-nac-join-team-roster-photo-route`,
`services/team-photo-analysis`, `team-photo-polish-policy`,
`team-photo-polish-service`, `team-photo-polish-sql`, `reviewer-smoke-config`.
SQL tests execute the actual functions with PGlite; provider tests are mocked.

Draft limitations: no exhaustive provider-load testing; face assessment can
decline usable photos; no promise that AI perfectly preserves likeness; storage
retention and operator retry-reset tooling are future hardening, not automatic
cleanup or hidden attempts.
