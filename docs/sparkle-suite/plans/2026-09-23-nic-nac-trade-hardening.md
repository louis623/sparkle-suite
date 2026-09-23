# Nic-Nac trade-request hardening — review plan

Status: implementation authorized by Louis on September 23, 2026, after the voice review. Louis subsequently approved publishing the universal customer FAQ today, with the same content/layout across rep sites and styling from each rep's active skin. The FAQ task owns that bounded implementation; this task owns integration and one combined, verified release. This plan records the agreed behavior; no production change is complete until the release checks below pass.

## September 23 update: screenshot and MSRP decisions

Louis approved a phone-friendly optional reveal image and retirement of MSRP from active trade surfaces. The implemented upload accepts JPEG, PNG, WebP, HEIC, HEIF, and AVIF up to 25 MiB, sends bytes directly to private storage, normalizes the rep image, and keeps the attached image for seven days. The form shows selected file, preview, upload result, and actionable failure state; the customer can remove the image and submit text only. Historical MSRP columns remain readable for compatibility, but new Nic-Nac intake, cards, public Dance Floor cards, sorting, and trade rules do not ask for or show MSRP. Item-for-item, same collection family, same jewelry type, and rep final approval remain the rule. The universal Dance Floor card no longer repeats the independent-rep disclosure below each item; the site footer retains it. Shared skin tokens and Halloween-specific corrections address small text and form contrast. The synthetic live reviewer instructions are in [trade-request-upload-reviewer-smoke.md](../testing/trade-request-upload-reviewer-smoke.md).

## Bottom line

The current customer form supplies only free text. The current Nic-Nac card always says “needs review,” and both the chat card and Dance Floor can send an approval without a collection/type match. The chat notification is a best-effort insert into the latest conversation; it is not the source of truth. Home's count comes from an eight-request preview that only refreshes while Dance Floor is open. A denial defaults to “not interested,” and the customer has no private way to see the decision. The plan below closes those gaps as one connected flow.

## Proposed behavior for Louis to approve

1. **Customer request.** The form asks what collection family and jewelry type the customer just revealed, plus the current description and optional screenshot. It shows the requested dancer's family/type beside those inputs. A known mismatch is explained with compatible, currently available alternatives from that rep's Dance Floor. The customer can choose another dancer or tap **Ask my rep to review anyway**. “I'm not sure” can also be sent for human review. No customer self-report or Nic-Nac finding can approve a trade; a request is not a promised swap.
2. **Rep notification.** Every submitted request, including a Nic-Nac-screened mismatch sent for manual review, is stored and discoverable independently of chat. Home and Dance Floor show one accurate pending count, including more than eight requests. A Nic-Nac-branded alert appears across the signed-in workspace with the customer name, requested dancer, offered details, time, and protected screenshot thumbnail when present. An exception request uses the normal pop-up but is more conspicuous, labeled **Rule exception — rep review needed**, and includes Nic-Nac's specific reason. It is not buried in a quiet lane. The alert survives chat being closed and reappears after refresh until acknowledged or decided; acknowledging is not approving.
3. **Attention cues.** New-request visual treatment includes a persistent badge and a brief, non-strobing pulse that respects reduced motion. The rep can opt in to a chime or spoken “Dancer trade requested.” Audio starts only after a browser user gesture, has a test button and mute switch, and plays once per new request rather than on every poll or tab. If audio is blocked or unsupported, the visual cue still works. No system notification permission is required for the first release.
4. **Nic-Nac screening.** Nic-Nac shows one of: likely match, mismatch (with the exact family/type reason), or information needed. This is deterministic application logic, not an LLM guess from free text or a screenshot. On mismatch it can explain and recommend eligible, available listings, but its “no” is never an irreversible dead end. The rep sees submitted exceptions, can correct mistaken item classification, and makes every approval decision.
5. **Decision.** Every Approve button and Nic-Nac approval tool opens or uses the same verification contract: rep-confirmed offered family and type, comparison to the requested dancer, and a clear final confirmation. Item number remains optional for non-catalog pieces; if entered, resolve and validate it before committing approval. The server rejects mismatch, missing verification, stale status, or wrong rep even if a client is bypassed. Deny requires a reason chosen by the rep; internal notes stay private.
6. **Customer feedback.** On submission, including an exception submitted for rep review, the customer receives a private, copyable status link/receipt. It shows pending, approved, denied, or cancelled and a short customer-safe explanation for denial. It does not expose customer name, screenshot, internal notes, other requests, or rep account data. The page says that approval is not shipment/fulfillment. No email or SMS is proposed because the form currently has no contact channel and adding one would be a separate product/privacy decision.
7. **Screenshot education.** A short live-show tip on the customer landing page prompts customers to save a screenshot before leaving their reveal. The Dance Floor repeats the tip in a compact how-to-trade strip; the request form recommends upload. Screenshot remains optional, with an explicit reminder to crop personal/order information. A missing screenshot means closer rep verification, not a blocked request.

## Rule definition

- One item for one item, same collection family and same jewelry type. MSRP is absent from active collection, display, and matching rules; historical values remain compatible.
- Birthday items may trade across birthday month and year, provided the jewelry type matches. OG matches OG; other families only match their own canonical family. Do not infer a family from visual similarity or MSRP.
- Normalize names and type aliases against an explicit, versioned catalog mapping. Ambiguous, missing, manual, or legacy values are “needs verification,” never an automatic match. The rep can supply verified facts, but not an unrestricted override of a mismatch.
- Keep a short audit record of what facts the rep confirmed, the computed rule result, decision, time, and actor. Do not treat customer self-report or an AI-generated sentence as verified evidence.

## Implementation workstreams

### A. Data and submission

- Add nullable offered-family/type fields and verification/audit fields to trade requests so existing rows and current traffic remain readable during rollout. Add safe denial reason codes and a private receipt token stored as a hash. Keep idempotent submission: replaying the same request returns the same receipt, does not consume another inventory slot, and can repair a missed alert view because alerts read request state directly.
- Update the public form and bounded API payload together. Validate lengths/allowed values server-side; never trust a screenshot as a structured value. Keep the seven-day screenshot expiry and protected rep-only image route. Show a visible upload result and permit a text-only request when attachment fails or is removed. Record an exception when the customer explicitly asks the rep to review a screened mismatch; do not treat passive browsing/filtering as a trade request.
- Prepare a migration that does not drop old rows or force backfill guesses. Existing pending requests are labeled “verification needed.” Previously approved/denied history remains unchanged.

### B. One approval boundary

- Put the family/type matcher in a shared domain module and make all approval entry points call one server-side decision service. Remove direct Approve/Deny mutations from stale chat cards; they should open the same review flow as the Dance Floor inbox. A rule-exception request can proceed only after the rep corrects or confirms the offered facts so the rule passes; no free-form override silently breaks eligibility.
- Enforce the match inside the atomic database approval operation as a final safety guard against races or another caller bypassing the web route. Ensure inventory quantity/status and fulfillment still change exactly once. Resolve optional revealed item data before approval, or make any later replacement step explicitly recoverable rather than reporting “failed” for an already-approved trade.
- Return actionable errors: wrong family, wrong type, missing verification, already decided, unavailable item, or technical retry. Never turn a failed rule check into an approval with notes.

### C. Reliable workspace notification

- Add a rep-authenticated request summary endpoint that returns an exact count and a bounded recent preview in one response. Scope it by rep and pending status; do not derive it from Nic-Nac conversation messages or from preview length.
- Poll while the signed-in workspace is visible, refresh on focus and after any decision, and recover from transient failures with bounded backoff. Keep the last known count with a “cannot refresh” state rather than falsely showing zero. Dedupe by request ID, including across multiple open tabs where supported.
- Render an accessible alert/review panel above the workspace navigation, including screenshot only through the existing protected route. Escalate the visual label for customer-requested manual review of a Nic-Nac mismatch, while retaining the same notification reliability. Allow acknowledgement/dismissal without changing request status. Keep the inbox and home badge consistent.

### D. Customer status and denial

- Require a reason with plain-language choices such as collection mismatch, jewelry-type mismatch, item unavailable, or other. If “other,” require a short customer-safe explanation; keep separate private rep notes. Never reuse the obsolete MSRP-mismatch reason for new denials.
- Provide a high-entropy private receipt token, no-store/no-referrer responses, rate limiting, and deliberately minimal fields. The receipt must not be enumerable by request ID. Surface the link immediately on success with a copy control and a clear reminder to save it.
- Be explicit that this is pull-based feedback: customers will see updates when they open the receipt. Proactive messaging would need an approved contact/consent design.

## Verification matrix

- Matching: Birthday July ring ↔ Birthday December ring passes; Birthday ring ↔ OG ring fails; Birthday ring ↔ Birthday necklace fails; unknown/legacy facts require rep verification; MSRP never changes the result. An apparent mismatch offers available alternatives and a manual-review escape; neither path approves automatically.
- Submission: valid request, known mismatch, uncertain offer, oversized payload, invalid screenshot, retry after timeout, repeated submission ID, and concurrent requests for the last available copy.
- Rep decisions: Dance Floor, alert panel, chat card, and Nic-Nac tool all hit the same guard; two reps cannot decide each other's request; concurrent approval/denial has one winner; no double inventory decrement; optional item lookup failure never yields an ambiguous approved/error response.
- Alerts: chat closed, home open, Dance Floor open, tab focus return, reload, 9+ pending requests, transient API failure, screenshot present/expired, two tabs, audio muted/blocked, reduced motion, and an exception request receiving the conspicuous normal pop-up.
- Customer receipt: each status, safe denial text, invalid/guessed token, cache/referrer behavior, no PII leakage, and no screenshot access.
- Regression gate: record baseline behavior before edits; run targeted tests and manual replay of every trade entry point plus non-trade Nic-Nac tools, Home, Dance Floor inventory, customer-site routes, and the Live Queue integration. Compare before/after behavior and explicitly resolve unintended differences. A new alert passing alone is not evidence that the release is safe.
- Use isolated reviewer data for a complete live click-through, with reset/reseed instructions and no real customer or payment/provider effects. Keep review mode visibly labeled and prove its controls are disabled for ordinary production users.

## Rollout and rollback

1. Confirm the approved GitHub branch, exact HEAD, intended Vercel project, both customer domains, and migration status. Do not use the stale persistent checkout or the user's browser/account.
2. Run migration first, then deploy the exact tested branch tip once by the approved manual process. Keep old clients compatible during rollout; if the app is rolled back, the additive columns and new enum values can remain without losing customer requests.
3. Verify www and apex resolve to that deployment. Run the synthetic reviewer request → notification → match/mismatch → decision → customer receipt smoke on the actual www domain. Check errors/latency and count behavior before calling it done. If migration or smoke fails, stop and report; do not silently declare production ready.
4. After the complete release verifies, update the two existing live Task List items with concise results and record verified decisions/closeout in the repository vault and Open Brain.

## Universal customer FAQ addition

- Publish one shared FAQ page and one footer link for all customer-facing rep sites, replacing the existing “FAQ coming soon” placeholder. Preserve the same information and page structure while applying each rep's active skin/theme. This is not a separate app or deployment.
- The FAQ's Dance Floor section explains eligibility, screenshot timing, optional upload, Nic-Nac screening, the customer-requested rep-review exception, and the rep's final approval role in plain language. Do not imply that a confirmed rule mismatch may be approved.
- Keep FAQ changes scoped to shared customer routing/content/styling and footer-link hunks. Integrate with the trade changes in this clone, then run rendered desktop/mobile and synthetic live-domain checks before Louis's post-release personal smoke test.

## Decisions and boundaries from Louis's review

- Confirmed: Nic-Nac may screen an objective mismatch and suggest compatible dancers, but the customer may ask the rep to review anyway. That request gets the normal pop-up with heightened exception labeling. All trade approvals belong to the rep.
- Confirmed: screenshot education begins before the reveal screen is left, repeats on Dance Floor and request form, and upload remains recommended rather than mandatory.
- Confirmed: missed or misclassified requests must remain visible to the rep; regression testing across connected workflows is a release gate.
- Proposed defaults in the approved implementation plan: private status link before any new email/SMS collection; audio opt-in and reduced-motion-safe visual cue. If either would materially change customer or rep expectations during implementation review, bring it back to Louis before release.
