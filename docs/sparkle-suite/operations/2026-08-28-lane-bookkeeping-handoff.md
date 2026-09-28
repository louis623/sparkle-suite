# Cheese handoff — bookkeeping, finance, and budgeting

Cheese is the bookkeeper. This file name still contains the older label so existing notes keep their link.

**Prepared:** August 28, 2026  
**Business:** Neon Rabbit LLC / Neon Rabbit Digital Services LLC (confirm the exact legal name and EIN with Louis before filing, banking, or tax work)  
**Scope of this handoff:** Sparkle Suite and Sparkle Finder. It names other Neon Rabbit business lines only to prevent mixed bookkeeping.

## Read this first

Cheese is the bookkeeper and financial organizer, not a money mover. Do not initiate transfers, payments, refunds, bank-account changes, Stripe changes, tax filings, or account closures without Louis's explicit approval at the time of action.

There is **not yet a reliable completed set of books**. The immediate job is to establish a source-backed ledger and reconciliation process. Do not turn product database fields, old planning notes, or historical MRR statements into accounting entries without matching them to Stripe and bank evidence.

Do not put bank credentials, Stripe secret keys, tax IDs, card numbers, API keys, or passwords in Open Brain, GitHub, chat, or repository files. Grant any read-only access separately through the relevant provider.

## Business map and boundaries

Neon Rabbit has several distinct business lines. Keep their revenue, expenses, and cash movements separately tagged even if they pass through a shared provider account.

| Business line | What it is | Bookkeeping treatment |
| --- | --- | --- |
| **Sparkle Suite** | SaaS and customer-site/workspace product for independent jewelry reps | In scope. Separate profit center/class/project. |
| **Sparkle Finder** | Separate consumer/collector discovery product for finding reps and their offerings | In scope. Separate profit center/class/project. It has its own app, auth, Supabase project, Vercel project, domain, and release lifecycle. Do not merge it financially with Suite merely because both live in one Git repository. |
| Some Dude's Coffee | Separate coffee/dropship business | Out of scope here; do not mix its Shopify funds or expenses into Suite/Finder. |
| Some Dude and AI | Separate media/content business | Out of scope here. |
| Digital-services side work | Client service/invoice work | Out of scope here, but label it separately in the existing Stripe account. |

**Naming correction:** The canonical product name is **Sparkle Suite**. “Sparkle Sweet” is commonly a dictation/transcription error. A Bluevine account has been referred to as “Sparkle Sweet”; treat it as the Suite bank account only after confirming the official bank label with Louis.

## Systems, money rails, and source-of-truth order

1. **Stripe — one existing Neon Rabbit Stripe account.** Do not create a duplicate account. It is the payment processor and customer billing-management surface for Sparkle Suite, and Finder’s billing code is designed to use Stripe as well. Stripe reports are the source for charges, invoices, refunds, disputes, fees, payouts, and subscription status.
2. **Bluevine — two business checking accounts.** Louis described one as Sparkle Suite/Sparkle Sweet and one as Some Dude's Coffee. Obtain the official names, statement periods, and read-only export method. Bluevine statements are the source for actual cash receipt, operating spend, transfers, and ending cash.
3. **Shopify — Some Dude's Coffee only.** Keep it out of the Suite/Finder ledger except for clearly documented inter-account transfers.
4. **Product databases — operational supporting evidence only.** Suite contains subscriptions/webhook records; Finder contains memberships/webhook records. They can help identify access state, but are not a general ledger and are not proof of cash.
5. **Open Brain — historical context only.** It is the company diary, useful for decisions and handoffs. It is not the accounting ledger or a financial source of truth.

Recommended evidence hierarchy for every entry: provider document/report or bank statement → reconciled accounting ledger → product operational record → Open Brain/history. If the first two do not agree, flag the item rather than forcing a match.

## Verified current product and billing facts

### Sparkle Suite

- The public production offer currently displayed by the application is **$49.99 one-time build fee plus $74.99/month**. The first displayed checkout total is $124.98 before tax. Treat this as the current advertised offer; use Stripe price/invoice data for actual charged amounts.
- The checkout system supports a founder tier for the first 20 paid subscription starts, with a 12-month founder-rate period. The amount is stored in Stripe price configuration; do not infer it from old planning prices.
- Legacy/grandfathered arrangements exist. Historical records verify active $39/month Stripe subscriptions for Brittany and Heather. Brianna/Bri has an historical $39/month/no-build-fee arrangement, but its current billable status must be confirmed in Stripe before recognizing revenue. Kara appears in historical grandfathered notes but also requires live reconciliation.
- Louis's internal demo account and internal/beta/test/smoke accounts are **not revenue**. They may have $0 or non-live entitlements and must never be counted as paid customers merely because an application subscription row is active.
- The production product database currently has four live-mode active Suite subscription rows, but their `monthly_amount` fields are zero/unclassified. It also has non-live internal/beta/smoke rows. This database mirror is not enough to calculate current MRR.
- The newest five internal `financial_snapshots` are dated August 24–28, 2026 and each reports $78 MRR across two subscriptions, but their `sync_status` is `failed`, with null P&L fields. Do **not** use this as a finalized MRR, revenue, expense, or cash figure.
- The webhook table shows processed events through August 27, 2026 plus six failed records. Treat failed webhooks as a reconciliation exception: inspect Stripe directly and make sure access/subscription state and cash records align.
- An open-only live checkout smoke has been performed historically; no real card payment was submitted for that test. The first real paid self-serve signup should be monitored and reconciled promptly.

### Sparkle Finder

- Finder is a separate application and should receive its own class/project in the books, its own budget, and a separate revenue/cost rollup.
- The product has Silver membership code, a 45-day trial flow, Stripe Checkout/portal support, and idempotent webhooks. Paid access is meant to be Stripe-backed when enabled.
- Current production aggregate evidence: **11 Finder memberships are Silver trials; zero have a Stripe subscription ID.** There is no current evidence of paid Finder subscription revenue. Book Finder subscription revenue as zero/unverified until Stripe charges and payouts prove otherwise.
- Historical planning discussed **$4.99/month** Silver pricing and free included Silver for paid Sparkle Suite reps. This is a product-plan reference, not evidence of current revenue or a confirmed live price. Verify actual Stripe price, enabled state, and transactions before using it in a forecast.
- Finder does not currently establish any trade-commission, marketplace, affiliate, or customer-payment revenue. Do not assume those revenue streams exist.

## Revenue recognition and classification rules

Use the accounting basis selected with Louis/CPA consistently. Track both cash movement and recurring-revenue metrics, but do not confuse them.

Suggested revenue classes:

- Sparkle Suite — recurring subscriptions
- Sparkle Suite — one-time build/setup fees
- Sparkle Suite — approved add-ons or service work, if actually invoiced
- Sparkle Finder — recurring Silver subscriptions, only after verified Stripe billing is live
- Sparkle Finder — other revenue, only when a real approved revenue model exists

Suggested contra-revenue and exception classes:

- Refunds and credits
- Chargebacks/disputes
- Failed or reversed charges (not revenue)
- Sales tax payable, if Stripe or another provider collects/remits it; do not treat tax as revenue

Required distinction for Stripe reconciliation:

`gross customer charge - refunds/chargebacks - Stripe processing fees = net Stripe payout`.

Match each payout to the Bluevine deposit date and amount. Timing differences between charge date, payout date, refund date, and bank settlement date belong in a reconciliation schedule, not unexplained income/expense entries.

## Expense map and budget categories

These are known or likely operating categories, not proof that each is currently incurring cost. Validate each with invoices, receipts, bank statements, or provider billing reports before posting.

| Category | Sparkle Suite | Sparkle Finder | Notes |
| --- | --- | --- | --- |
| Payment processing | Yes | Potentially yes | Stripe fees, refunds, and disputes; allocate by product/charge. |
| Hosting | Yes | Yes, separate | Separate Vercel projects; capture invoices and allocate directly. |
| Database/storage | Yes | Yes, separate | Separate Supabase projects; include storage/backups where billed. |
| AI/model usage | Yes | Yes | Nic-Nac current product policy is OpenAI-first. Record actual invoices/usage, not estimates. |
| Email | Potentially yes | Potentially yes | Resend is part of the stack; distinguish provider cost from feature availability. |
| SMS/telecom | Potentially yes | No current Finder evidence | Telnyx/10DLC operating costs only when invoiced/used. |
| Domains/DNS | Yes | Yes | Suite domains, Finder domain, and customer-domain expenses need direct project/client tags. Cheapnames manages client domains; do not book client pass-throughs as Suite expense without the related invoice/reimbursement record. |
| E-signature | Potentially yes | No current Finder evidence | SignWell is currently described as free/current; verify invoices before booking spend. |
| Contractors/professional services | Possible | Possible | Require invoice, scope, and product allocation. |

For shared costs, use a documented allocation rule (for example direct attribution first; otherwise consistent usage, customer count, or revenue allocation). Do not change the rule month-to-month just to make a result look better.

## Recommended chart-of-accounts structure

This is a working organization recommendation, not tax or legal advice. Have the selected accountant/CPA approve the final chart and tax treatment.

| Account group | Suggested accounts |
| --- | --- |
| Income | Suite subscriptions; Suite build/setup fees; Suite add-ons/services; Finder subscriptions; Finder other approved revenue |
| Contra income | Refunds/credits; chargebacks/disputes |
| Cost of revenue | Stripe processing fees; directly attributable AI/model usage; SMS/message delivery; image/media processing |
| Operating expenses | Vercel/hosting; Supabase/database; software subscriptions; domains/DNS; marketing; contractors; legal/accounting; office/admin |
| Assets | Bluevine checking by official account; Stripe clearing/payouts in transit; prepaid software, if material |
| Liabilities | Sales tax payable; customer credits; unresolved Stripe payout/reconciliation items |
| Equity | Owner contributions, owner draws/distributions, retained earnings—never bury these in operating expense |

Use **Class/Project = Sparkle Suite or Sparkle Finder** on every applicable transaction. Include a third tag for vendor, customer/invoice, and payment-processor payout where the platform supports it.

## Monthly close checklist

1. Collect Bluevine statements/CSV exports for the exact month, every Stripe balance transaction/payout/fee/refund/dispute report, and every vendor invoice/receipt.
2. Import and categorize cash activity; split transfers, owner activity, and reimbursements from operating income/expense.
3. Reconcile Stripe gross charges, refunds, fees, and net payouts to Bluevine deposits. Keep a Stripe-clearing account until each payout settles.
4. Reconcile all active/cancelled/past-due subscriptions to Stripe—not merely the product database. Confirm legacy $39 customers individually against their live Stripe customer/subscription/invoice history.
5. Reconcile Finder membership state to Stripe. A trial is not subscription revenue. A paid membership without a matching paid Stripe invoice is an exception.
6. Review failed Suite webhooks and any unmatched Stripe event. Correct the operational record only under the normal application controls; do not rewrite financial history.
7. Post vendor bills and allocate shared costs using the approved rule.
8. Produce: cash-basis P&L by product, balance sheet/cash reconciliation, monthly Stripe fee/refund/dispute schedule, MRR/active-paid-customer schedule, and an exception list.
9. Have Louis review and approve exceptions, owner draws/contributions, unusual charges, and any proposed money movement.

## First 30 days — Cheese’s priority order

1. Confirm the legal entity name, fiscal year, accounting basis, bookkeeping platform, tax registrations, and who the CPA/tax preparer is. Do not guess.
2. Confirm the two Bluevine account names and obtain statement exports or read-only access. Set up a secure, recurring source-document folder outside Open Brain/GitHub.
3. Obtain Stripe read-only reporting access or monthly exports. Keep the single existing Stripe account; create products/classes/reporting labels inside the accounting workflow rather than splitting the processor account.
4. Establish the chart of accounts and two product classes above. Backfill from the earliest reliable statements and Stripe history; do not start with a guessed MRR.
5. Build a legacy-customer reconciliation sheet: customer identity, contract/grandfathered status, Stripe subscription, invoice/payment history, current service status, and exception notes. Restrict it to approved financial personnel.
6. Create a Finder launch ledger: paid-billing flag/price confirmation, trial population, live Stripe subscriptions, invoices, refunds, payouts, and related costs. It should initially show no verified paid Finder subscriptions.
7. Build a 90-day cash budget only after actual fixed monthly vendor bills, Stripe net receipts, and owner-approved planned spending are captured. Use a conservative base case and show assumptions explicitly.

## Questions Cheese should bring back to Louis

- What is the exact legal entity name, tax classification, fiscal year, and CPA/tax-preparer contact?
- Which bookkeeping system is being adopted (QuickBooks, Xero, other), and what accounting basis should its management reports use?
- What are the official names and purposes of the Bluevine accounts? Is the “Sparkle Sweet” label the Suite account?
- Which historic $39 arrangements are still actively billed today, and which are free/internal/beta only?
- What Stripe labels/products/invoice descriptions identify Suite, Finder, and digital-services transactions today?
- Is Finder paid billing enabled in production, what is the exact active price, and should paid Suite reps receive Finder Silver at no additional charge?
- Which vendor subscriptions are actually paid by the business versus personal card, reimbursed, free tier, or no longer active?
- What budget approvals, spending thresholds, and cash-reserve target should Cheese enforce?

## Access and working protocol

- Give Cheese separate, least-privilege/read-only access to Stripe, Bluevine exports, Vercel/Supabase billing pages, and vendor receipts as needed. Do not share credentials in chat.
- Cheese may use Open Brain to search historical decisions and log reconciliation findings. For a meaningful conclusion, log the summary in Open Brain **and** add an appropriate vault update. Never log secrets or raw payment data.
- When a record is uncertain, label it `needs source evidence` and request the statement/report. Do not silently normalize a mismatch.
- The user-facing applications and their databases are operational systems. Do not make production data changes merely to make accounting totals match.

## Evidence used for this handoff

- Current Suite source/public pricing content, billing code, Suite migrations, and Finder billing/membership code.
- Read-only aggregate production database inspection on August 28, 2026. No customer names, emails, payment IDs, cards, or credentials were retrieved for this handoff.
- Current repository vault records and Open Brain entries through August 27, 2026.

This document deliberately flags stale or failed internal snapshots rather than presenting them as live books. Stripe reports, Bluevine statements, invoices, and receipts are the next evidence needed to convert this operational picture into accurate accounting.
