# Sparkle Suite → Sparkle Finder Public Reps Endpoint Handoff

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

Date: 2026-08-21  
Finder consumer: `https://yoursparklefinder.com/reps`  
Required Suite route: `GET /api/public/finder/reps`

## Outcome

Sparkle Finder's Reps tab must automatically list every eligible public Sparkle Suite rep. This is shared public product data, not a second onboarding workflow.

A rep must not need any of the following to appear:

- a Sparkle Finder account;
- a Finder claim code or password;
- a Dance Floor;
- a scheduled show;
- saved Finder profile data.

Finder credentials and the private Secret Rep ID are only for a rep who wants to use Sparkle Finder personally. They are not directory eligibility fields.

## Current Production Evidence

As of 2026-08-21, this request returns `404` HTML:

```text
https://www.yoursparklesuite.com/api/public/finder/reps?limit=200
```

Finder now treats that response as `unavailable`, not as an honestly empty directory. The Finder contract checker also fails nonzero until this route is healthy.

## HTTP Contract

### Request

```http
GET /api/public/finder/reps?limit=200&query=kelli
Accept: application/json
```

Query parameters:

- `limit`: optional integer, default `50`, minimum `1`, maximum `200`.
- `query`: optional trimmed search text. Match public display name, business name, and state without case sensitivity.

Unknown query parameters may be ignored. Invalid limits should be clamped or rejected with a clear `400` JSON response; they must not cause a `500`.

### Healthy response with eligible reps

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-21T17:00:00.000Z",
  "reps": [
    {
      "repId": "stable-public-rep-id",
      "displayName": "Kelli Jo",
      "businessName": "Kelli Jo Sparkles",
      "avatarUrl": null,
      "state": "FL",
      "customerSiteUrl": "https://www.yoursparklesuite.com/reps/kelli-jo",
      "repBoardUrl": null,
      "nextShow": null
    }
  ],
  "nextCursor": null
}
```

### Healthy response with no eligible reps

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-08-21T17:00:00.000Z",
  "reps": [],
  "nextCursor": null
}
```

An empty directory is always `200` with `reps: []`. Do not return `404`, HTML, `204`, or omit the `reps` array.

### Rep record

| Field | Type | Rule |
| --- | --- | --- |
| `repId` | nonempty string | Stable public identifier. Never expose a Secret Rep ID, auth user id, or credential. |
| `displayName` | nonempty string | Customer-facing rep name. |
| `businessName` | string or null | Public business name; null is allowed. |
| `avatarUrl` | HTTPS URL or null | Public image only. CDN hosts are allowed. No credentials or non-default ports. |
| `state` | string or null | Public state abbreviation/name only. Do not expose a street address or precise location. |
| `customerSiteUrl` | HTTPS URL or null | Public Sparkle Suite rep/profile URL. |
| `repBoardUrl` | HTTPS URL or null | Public board/profile URL when one is actually available. A missing or unfinished board does not exclude the rep. |
| `nextShow` | show object or null | The next current/future public show. A missing show does not exclude the rep. |

### Next-show record

```json
{
  "showId": "stable-public-show-id",
  "showName": "Friday Night Sparkle",
  "startsAt": "2026-08-21T20:00:00-04:00",
  "status": "scheduled",
  "customerSiteUrl": "https://www.yoursparklesuite.com/shows/friday-night-sparkle",
  "durationMinutes": 60
}
```

Rules:

- `status` is only `scheduled` or `live`.
- `startsAt` is a valid ISO-8601 timestamp with an offset or `Z`.
- Completed shows and stale scheduled shows are not returned as `nextShow`.
- A `live` show should stop being returned after its configured duration/end time.
- `customerSiteUrl` is HTTPS and public; null is allowed if no public show route exists.
- `durationMinutes` is a positive finite integer or null.

## Eligibility Rules

Include a rep when all of these are true:

- the Suite rep record/account is active;
- public discovery is enabled;
- the public profile is not suspended or deleted;
- the record is not a demo, fixture, internal QA, or test account.

Do not make eligibility depend on:

- Finder account ownership;
- Finder claim status;
- a Dance Floor existing or containing dancers;
- a live show existing;
- a profile photo existing;
- favorite counts.

Exclude inactive, suspended, deleted, private/non-discoverable, demo, fixture, and internal test reps.

## Sorting And Duplicates

- Return each `repId` at most once.
- Use deterministic ordering so repeated requests do not shuffle cards.
- Recommended default: current live show first, then today's show, then next future show, then public display name.
- Finder applies its own customer-favorite ranking after receiving the records.
- Do not send `favoriteCount`; Sparkle Finder owns favorite data and privacy.

## Privacy And Security Boundary

This route is public. Return only fields already intended for public customer discovery.

Never return:

- Secret Rep ID numbers, claim codes, passwords, tokens, or hashes;
- auth user ids or internal account ids when they are not the established public `repId`;
- email addresses, phone numbers, private notes, customer identities, or precise addresses;
- Finder customer favorite rows or customer-level favorite information;
- private Dance Floor inventory or unpublished show metadata.

Normalize URLs server-side. Require HTTPS, reject embedded credentials and non-default ports, and allow only approved public Suite/customer-site hosts.

## Required Suite Tests

1. Active, discoverable, non-demo rep is included automatically.
2. Eligible rep without a Finder account is included.
3. Eligible rep without a board is included with `repBoardUrl: null`.
4. Eligible rep without a show is included with `nextShow: null`.
5. Eligible rep without an avatar, state, or business name is still included.
6. Inactive, suspended, deleted, private, demo, fixture, and test reps are excluded.
7. No qualifying reps returns `200 application/json` with `reps: []`.
8. Search matches display name, business name, and state case-insensitively.
9. Limit is bounded to `1..200` and cannot trigger unbounded reads.
10. Duplicate joins cannot return the same `repId` twice.
11. Completed/stale shows are not returned as next shows.
12. No private identifiers, credentials, contacts, or unpublished data appear in the JSON.
13. Every returned URL is safe, HTTPS, and on an approved public host.
14. Database query plans use indexes for the eligibility predicate, stable rep id, and search/order path appropriate to the Suite schema.

## Rollout Order

1. Implement and test the route in the Sparkle Suite repository.
2. Deploy Sparkle Suite first.
3. Verify the direct route returns `200 application/json`.
4. From the Sparkle Finder repository, run:

   ```powershell
   npm exec tsx scripts/check-sparkle-suite-finder-api.ts
   ```

5. Sign in to `https://yoursparklefinder.com` with the real demo account and open `/reps`.
6. Confirm the real eligible Suite rep appears even if her board/show is incomplete.
7. Add and remove the favorite, refresh, and confirm the heart state persists and the aggregate count changes without exposing any Finder customer identity.
8. Confirm an anonymous `/reps` request remains behind the Finder account gate.

## Finder Acceptance Gate

The integration is complete only when all of the following are true:

- direct Suite Reps request returns `200 application/json`;
- the Finder contract checker exits `0` and prints `REPS=<count>`;
- a real eligible Suite rep appears automatically in signed-in Finder production;
- no preview fixture rep appears in production;
- no-board and no-show reps remain visible;
- favorite add/remove persists across refresh;
- Finder production browser console and network checks contain no unexpected errors;
- `npm run lint`, `npm test`, `npm run build`, and `npm run smoke:sparkle-finder` pass in Finder.
