# Neon Rabbit Production Quality Standard

Adopted by Louis Chapman on Oct 25, 2026. Scaled to a small business's size and usage.

All work in this repo, by any agent (Codex, Cursor, Grok Bot agents) or person, must meet this standard. Never call anything "ready" unless it meets every point below.

1. **Flag it first.** If anything is not production-grade (prototype setup, slow loads, fragile code, missing tests, dev builds), tell Louis in plain English what's wrong, why it matters, and what fixing it costs, even unasked.
2. **Speed (Core Web Vitals).** Main content visible in 2.5s or less (desktop target under 2s; mid-range phone on slow 4G under 3s), tap response within 0.2s, no layout jumps, no blank screen or plain-text flash.
3. **No regressions.** Everything that worked before still works, including every theme's hero animation and sound autoplay, images, links, sign-up, checkout, QR codes and emails.
4. **Production builds only.** No in-browser compiling (babel-standalone), no React dev builds, no test data, placeholders or debug leftovers.
5. **Looks professional.** Real art, consistent branding, nothing unfinished; Louis would be at least 95% happy.
6. **Safe.** No exposed keys, customer and rep data private, credentials tested before they're shared.
7. **Automated checks before shipping.** Tests plus per-theme screenshot and animation checks must pass.
8. **Every PR states** what changed, what could break, what was tested (desktop + slow phone, with filmstrips or screenshots), and the exact rollback.
9. **Release order.** Smoke or preview, then Louis's demo account on Live (he tests), then all users.
10. **Review and approval.** Rocky (adversarial reviewer) reviews every Live change. Nothing goes Live without Louis's OK.
11. **Recheck Live within 15 minutes** of each release; if anything is off, roll back first, explain after.
12. **Monitoring and reporting.** Live sites get automatic monitoring alerts, and Louis gets a monthly plain-English report of anything below the standard.
