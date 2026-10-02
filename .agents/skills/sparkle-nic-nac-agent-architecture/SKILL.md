---
name: sparkle-nic-nac-agent-architecture
description: Use when the user types /Nic-Nac or when designing, reviewing, implementing, debugging, testing, or planning Sparkle Suite or Sparkle Finder Nic-Nac agent behavior, especially Trade Board add-listing, jewelry database intake, model/tool routing, workflow state, photo roles, model comparison, evals, smoke tests, or changes that could make Nic-Nac brittle.
---

# Sparkle Nic-Nac Agent Architecture

## Purpose

Use this skill to keep Nic-Nac work grounded in the approved stateful agent architecture. Nic-Nac should be a flexible conversational assistant over app-owned workflow state, not a prompt-only script that loses tools when a rep words something differently.

## Required Operating Rules

- Use `C:\Users\louis\sparkle-suite` as the binder/notes project only.
- Use `C:\Users\louis\sparkle-suite-repo` for implementation, builds, tests, commits, deploys, and smoke tests only after Louis gives a concrete implementation task.
- Do not touch Chrome Web Store settings or local Sparkle Suite Chrome extension code.
- Treat Sparkle Suite live queue extension files as protected live-show material.
- For deployed verification, use `https://www.yoursparklesuite.com` with
  reviewer-smoke/synthetic sessions instead of Louis's personal account.
- Do not call Nic-Nac fixed until the relevant workflow has real replay verification, not only prompt assertions or unit tests.

## Architecture Rule

Default to this split:

- Application code owns workflow truth, required fields, photo roles, allowed state transitions, tool availability, final validation, final mutation, telemetry, and database verification.
- The model owns language understanding, extraction suggestions, conversational tone, coaching, and tool-use reasoning inside app-owned boundaries.
- Tests and smoke replays own proof that the workflow behaves like a real rep expects.

If a proposed fix only adds prompt text, regex wording, or another narrow phrase patch, stop and check whether workflow state or tool availability should own the behavior instead.

## Shared Ecosystem Agent Rule

Nic-Nac should be one shared Sparkle ecosystem agent, not copied per product.

This is a core business architecture decision. Sparkle Suite and Sparkle Finder should route into the same Nic-Nac core with shared:

- model/provider adapter
- workflow engine and durable workflow state
- jewelry intake logic
- photo-role rules
- catalog truth and jewelry-library knowledge
- tool registry and tool contracts
- evals, hard-fail phrase gates, fixtures, and smoke harnesses
- observability for routing, photo roles, tool calls, tool results, cost, latency, and final outcome

Product context decides what that shared core can do:

- Sparkle Suite context: rep/workspace user, Trade Board tools, site/workspace tools, final mutation can add or update a rep Trade Board listing.
- Sparkle Finder context: collector/Silver user, allowed Finder/library tools, final mutation can add or update jewelry library/catalog data when that product is ready.
- Account tier, permissions, safety state, and product surface should select allowed tools and destinations without forking Nic-Nac's core behavior.

Do not create a separate Sparkle Finder Nic-Nac by copying Sparkle Suite prompts, tools, or workflow code. If Finder needs similar jewelry intake, extend or parameterize the shared core with product-scoped capabilities. The success condition is that improving Nic-Nac's label-photo handling, boxed-display handling, catalog truth, tone, or tool routing improves the whole Sparkle ecosystem.

## Nic-Nac Trade Board Intake Rules

- Facts can arrive in any order.
- A rep may type the collection name; Nic-Nac must accept it and must not demand packaging proof after the rep provides it.
- Rejection is the last resort; Nic-Nac should coach and continue gathering missing details.
- Active add-listing workflows must keep Trade Board tools available until completed, cancelled, expired, or escalated.
- Nic-Nac must never tell the rep to manually add the item in Sparkle Suite while the add-listing workflow and tool should be available.

## Photo Role Rules

Photo role is workflow state.

- A label/details/tag/back-of-card photo is a details source only.
- Visible jewelry in a label/details photo does not satisfy the customer-facing jewelry photo requirement.
- If only a label/details photo has been provided, Nic-Nac should ask for a separate customer-facing jewelry photo when needed.
- A boxed display jewelry photo is valid for earrings, necklaces, rings, and similar pieces when the jewelry is centered, close, clear, and website-worthy.
- Jewelry does not need to be removed from Bomb Party packaging or placed on a plain background when the boxed display shot is clean and attractive.

Only two strict photo gates should block progress:

- Unreadable label/details/tag photo: ask for a clearer details photo.
- Genuinely bad customer-facing jewelry photo: coach for a better jewelry photo.

## Success Gate

Before declaring Trade Board intake fixed, require:

- Deterministic workflow/controller tests for required state transitions.
- Tool-route tests proving active add-listing workflows keep Trade Board tools available.
- Model-in-loop replay with real uploaded image parts for the relevant fixture case.
- Browser or Chrome reviewer-smoke through the actual UI or real `/api/nic-nac`.
- Database assertions for completed listing/design state.
- Public-site visibility assertions for Trade Board listings when the workflow affects customer-facing inventory. A completed add-listing path should prove the targeted public Trade Board keeps the same rep/site context after hydration or API refresh.
- Transcript capture with conversation id, run ids, active tools, tool calls, tool results, and final assistant text.
- Zero hard-fail phrases.

Hard-fail phrases include:

- "I can't actually add listings"
- "Log into your workspace and add it manually"
- "The photo of the earrings needs" when only a label/details photo was uploaded
- "Unboxed"
- "Plain background"
- "Packaging is too prominent" for a clear boxed display jewelry photo

## Workflow For Nic-Nac Work

1. Read the current v2 architecture spec if the work affects architecture, routing, photo roles, evals, or implementation planning: `references/nic-nac-agent-architecture-spec-v2.md`.
2. Inspect current repo state in `C:\Users\louis\sparkle-suite-repo`; do not assume the tree is clean.
3. Identify whether the task is architecture/design, implementation, verification, or deployment.
4. For design/planning, keep work in specs/plans and get Louis approval before implementation.
5. For implementation, prefer workflow state, controller contracts, and evals over prompt/regex patching.
6. For verification, include deterministic tests plus real replay/smoke appropriate to the risk.
7. For deployed review, verify on Smoke first. Live `www.yoursparklesuite.com`
   and `yoursparklesuite.com` checks happen only after Louis approves the
   batch promote, or names a hotfix. Canonical playbook: Core Memory
   `skills/sparkle-smoke-ship.md`.

## When To Use The Reference

Read `references/nic-nac-agent-architecture-spec-v2.md` when you need any of:

- numeric success thresholds
- state machine transitions
- controller-to-model payload contract
- eval grading contract
- provider/model abstraction requirements
- observability schema
- human escalation policy
- photo/transcript privacy rules
- backward compatibility and rollout guidance
