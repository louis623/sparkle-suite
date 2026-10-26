# Neon Rabbit Production Quality Standard

Louis's standing instruction, October 25, 2026. Applies to all work.

1. Flag anything below production grade first, in plain English: what is wrong, why it matters, and the cost to fix. Include prototype setups, slow loads, fragile code, missing tests and development builds. State uncertainty rather than inventing estimates.
2. Main content visible within 2.5 seconds; desktop target under 2 seconds and mid-range phone on slow 4G under 3 seconds. Tap response within 0.2 seconds. No layout jumps, blank screen or plain-text flash.
3. Preserve established behavior, including every theme's hero animation and sound autoplay, images, links, signup, checkout, QR codes and emails. Report browser-enforced limits honestly.
4. Production builds only: no browser Babel compilation, React development builds, test data, placeholders or debug leftovers on customer production surfaces.
5. Use real theme art, consistent branding and finished presentation.
6. No exposed keys; preserve rep privacy; test credentials before sharing.
7. Automated tests and per-theme screenshot/animation checks must pass before shipping.
8. Every PR states what changed, what could break, desktop and slow-phone testing with filmstrip/screenshot evidence, and the exact rollback.
9. Release order: Smoke, then Louis's demo account on Live for his test, then all reps. Never release directly to everyone. A deployment that changes all reps does not satisfy a demo-only gate.
10. Rocky reviews every Live change. Nothing goes Live without Louis's explicit approval.
11. Recheck Live within 15 minutes of release. If anything is off, roll back first, explain afterward.

Never call work ready unless it meets all these requirements. Current task-specific limits, including Smoke-only instructions, still apply.
