# Mile High Fizz DNS cutover — September 15, 2026

## Scope

Louis authorized completing Lindsey Chapman's `milehighfizz.com` migration away
from the Readdy-managed AWS Route 53 DNS authority. No application code,
workspace data, customer data, or Live Lineup data was changed.

## Pre-cutover evidence

- CheapNames is the registrar and showed the domain as active.
- The prior custom nameservers were Readdy's Route 53 set:
  `ns-1490.awsdns-58.org`, `ns-168.awsdns-21.com`,
  `ns-1711.awsdns-21.co.uk`, and `ns-608.awsdns-12.net`.
- Readdy's September 6 confirmation said the apex and `www` web records had
  been pointed at `76.76.21.21`, while non-web records were preserved.
- Public root DNS had no MX or TXT answer at cutover. The existing public
  Sparkle Suite customer homepage, Trade Board, Join page, and `www` route
  returned HTTP 200.
- Vercel already listed `milehighfizz.com` and `www.milehighfizz.com` on the
  `sparkle-suite` project. Its prepared DNS zone contains the apex alias and
  wildcard routing needed for the public site.

## Change made

CheapNames accepted the nameserver update to:

- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

The registrar displayed both new nameservers and reported the request as in
progress before the settings page refreshed.

## Verification

- Direct queries to `ns1.vercel-dns.com` resolved both apex and `www`.
- Direct HTTPS checks, pinned to Vercel's authoritative answers, returned
  HTTP 200 with `Server: Vercel` and `X-Matched-Path: /customer-site/[page]`
  for both hosts.
- Existing global resolver answers may remain on the former Route 53
  delegation until propagation completes. The old delegation had roughly a
  one-day TTL; allow up to 24–48 hours for universal visibility.

## Follow-up

After delegation propagates, verify global NS answers show the two Vercel
nameservers, then recheck `https://milehighfizz.com/`,
`https://www.milehighfizz.com/`, `/trade`, and `/join` without a forced DNS
target. If any former Readdy-only subdomain or mail/verification record is
reported missing, recreate it in Vercel DNS from its documented record value.
