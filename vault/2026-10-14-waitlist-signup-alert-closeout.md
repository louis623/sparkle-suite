# 2026-10-14 waitlist signup alert

Draft PR #100, branch `cursor/waitlist-signup-alert-3682`, SHA `cbf7767f`. Not merged. No Live deploy.

The waitlist insert now returns the signup columns, the build-list webhook keeps its old keys and adds phone, TikTok, team rep, setup needs, and consent, and a failed webhook logs status plus body. An owner alert to `louis@neonrabbit.net` runs in its own `after()` callback. The lead is not emailed.

Smoke preview `dpl_8h7qVJNZa1VoETkuAX6xNpejgNjf`: https://sparkle-suite-smoke-jkpcl0e6u-louis-2849s-projects.vercel.app. Smoke alias unchanged. Database `pukemqiwlyqmyytxkdmo` only.

Synthetic signup returned 201. Webhook skipped because `BUILD_LIST_WEBHOOK_URL` and `BUILD_LIST_WEBHOOK_KEY` are unset on Smoke. Owner alert did not send because `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are empty and production-only.

Next: set those four values on the Smoke preview, then repeat one synthetic signup before any Live release.
