# Pricing FAQ article live

- Louis approved the pricing FAQ. PR https://github.com/louis623/sparkle-suite/pull/121 merged onto `codex/nic-nac-trade-hardening`. Application SHA `83918dd194532ec8e27610cc64c47946f50a4cb6` is Ready production deployment `dpl_41Q9f22JzJqxYrcph2ix6XsVq8qV`. `www.yoursparklesuite.com` serves that deployment, and `yoursparklesuite.com` redirects to it. Rollback remains Ready `dpl_FzMYwmcGtXdRoU8Nhj5x8twnUT5H` at `f0f9e904`.
- Existing plain-text “Sparkle Suite pricing explained” mentions are now links to `/faq/articles/sparkle-suite-pricing-explained` in What Is Sparkle Suite and how to get your own Bomb Party rep website. The words did not change.
- No database or billing change. Pull request #122 was not merged.
- Live checks: the new article returned 200 with a self canonical, the approved title and description, and a sitemap loc. The two relinked articles returned the new href. The homepage returned 200 and still says `Email and SMS updates: coming soon.` Mile High Fizz returns 404 noindex for the article. Signed-in reviewer smoke was not used; these are public pages.
- Smoke-only draft PR https://github.com/louis623/sparkle-suite/pull/122 is head `ad0fc5d8d23c60637279a95482e78fae03c0c127`. Suite Smoke preview https://sparkle-suite-smoke-d30be6f7i-louis-2849s-projects.vercel.app (`dpl_DQ1cYzYiBqFfx7tZcN5q1NNjRwQA`) shows `Email and SMS updates: coming soon (included on every plan).` The shared Smoke alias stayed on `dpl_Epu1Cfx8PQPi1iJneUPscHEAesfK`. Live was not moved for that preview.
- This note is not a second application release.

Next session: start from the verified GitHub tip. Live stays on `83918dd1` / `dpl_41Q9f22JzJqxYrcph2ix6XsVq8qV` unless Louis asks for another release. PR #122 stays unmerged.
