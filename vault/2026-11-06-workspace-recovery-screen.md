# PR182 Workspace recovery — November 6, 2026

Louis explicitly approved exact recovery copy, Retry and existing sign-in flow; Smoke only. Base4b4b3ce, application/tested SHA dd97846f1c2f9c737d49ed40a1d3bcfcefac60ba. New component accepts no rep data. Retry calls the existing loader via a call-time cookie-authenticated/no-store request; support fetch wrapping remains active. Raw backend details are not rendered. Identity isolation and separate denied-support500 unchanged; PR181/photo files untouched.

Exactly2new cases in tests/nic-nac-workspace-recovery.test.tsx PASS;0old identity replays/0suite reruns. One READY unaliased preview dpl_23TyqpN7VwWjta7EXXGeePCad1ow / https://sparkle-suite-smoke-da8sewhdw-louis-2849s-projects.vercel.app. Stable Smoke and Live remain on their previous IDs.

Exactly2document navigations: first stopped from harness timing (Next route announcer seen before setup result), remaining navigation passed exact copy, safe-only content, no fallback/credential, enabled actions and actual Retry. Both actual backend setup reads resolved the same synthetic rep before the controlled outage response; UI remained safe. Sign-in href correctly retains return path, not followed because budget was spent. Successful retry response covered in new focused unit case. Phone viewport390x844 only.

The first failed helper emitted synthetic session and Smoke preview-access headers during shutdown. Affected synthetic account/session deleted immediately, remaining navigation used a fresh fixture, local credentials removed after cleanup. No production credential involved. Smoke access credential expires2026-11-07T06:48:47Z (Nov7 01:48:47ET); no security settings were changed or broader revocation attempted. Never copy values to memory or Git.

Both run-created fixtures removed; independent SQL confirms0reps/0authusers/0sessions, all owned rows0. Full sanitized evidence: docs/sparkle-suite/qa/2026-11-06-workspace-identity-isolation/recovery-receipt.json. One final diff/receipt review only. Recommend proceeding to Louis's release decision; no merge/Live/deploy/retest chain authorized. Historical Live causation remains unproven, support500 separate.

Actual Open Brain closeout capture confirmed successful. Local fixture credentials and raw browser transport logs were removed.
