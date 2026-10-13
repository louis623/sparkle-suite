# Historical: May 2026 Public Site Incident Lesson

> **Historical record — superseded October 6, 2026.** This file preserves the May 2026 incident/audit context. Its deployment IDs, version lock, copy requirements, and special approval phrase are not current instructions. Louis explicitly approved the Warm plum / concept 2 full marketing mockups and authorized Smoke implementation. Use [08 — Approved brand system](08-production-site-design-kit.md) and the latest owner request. Do not restore a deployment or block already-authorized work based on this historical text. Live publication and email/Workspace changes remain separately scoped.

## Date

May 11, 2026

## What happened

The live Sparkle Suite public site was accidentally moved through rejected public-site treatments while Phase 8 email and waitlist work was moving quickly.

Louis had already approved the `Sparkle Suite V1 Preview Public Site`, sourced from Vercel deployment `dpl_2yAXz2pKp4QsJ4sQzboqpfXfqyoM`, created May 10, 2026 at 11:19 AM Eastern.

During follow-up work, a rejected version returned to production. That caused loss of trust and confusion because Louis thought he was testing the real approved page and instead saw copy/design he had already rejected.

## Root lesson

Do not treat public-facing design, copy, or branding changes as routine engineering cleanup.

Production public-site work must separate:

- engineering fixes that preserve the approved page
- copy/design/brand changes that need explicit Louis approval

## Official production result

As of May 11, 2026, production is back on the approved direction and was redeployed with email and waitlist fixes as:

- Production deployment: `dpl_95Z57PuyJYJvvHabc2bjGCNzpZ8t`
- Public route: `https://www.yoursparklesuite.com/prelaunch`
- Official version name: `Sparkle Suite V1 Preview Public Site`

Live verification confirmed:

- title is `Sparkle Suite | Coming Soon`
- approved hero is present
- approved waitlist copy is present
- rejected public-site copy is absent
- live waitlist API returned `201`
- Resend returned welcome email status `sent`

Do not mark waitlist/email task 8.2 complete until Louis confirms an actual inbox received the welcome email.

## Banned recovery path

Do not recover by guessing from memory.

Do not recover by choosing the version that looks best to the agent.

Do not recover by polishing the page.

Recover from the real source of truth:

1. Check Neon Rabbit HQ.
2. Check Open Brain, but watch for contradictory older memories.
3. Check `docs/sparkle-suite/brand/05-public-site-version-lock.md`.
4. Inspect the repo.
5. Inspect Vercel deployment history if production is in question.
6. Verify the live domain after any deploy.

## Required communication rule

If the user is testing production, say whether the test is:

- local development
- preview deployment
- production deployment

Do not let Louis think he is testing production when he is testing a local or preview URL.

## Approval rule

No agent may polish, rebrand, rewrite, redesign, or visually improve the public site unless Louis explicitly types:

`go ahead and polish this`

Small engineering fixes may happen only when they preserve the official content and visual direction.
