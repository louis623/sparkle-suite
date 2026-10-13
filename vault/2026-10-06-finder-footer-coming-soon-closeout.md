# October 6, 2026 — Finder footer coming soon

- Louis requested keeping the Finder logo in Suite marketing footers while disabling its link and adding “Coming soon.” Shared footer now renders an accessible non-interactive image and label; Suite, legal and social links stay intact.
- Application SHA58de37c8d1f695d503ac59f6445cc7270c8db107, from the approved clean clone of louis623/sparkle-suite / codex/nic-nac-trade-hardening. Three scoped files only; persistent dirty checkout and Finder application unchanged.
- Production build and diff integrity pass; lint has zero errors and two existing raw-image advisories. Smoke dpl_ZWCLPWaH3TjXmyXo88aGfAVpBZ5i verified before fresh Live dpl_DgSMbssLiAAArXUxmsGUTV2Lkdaf. Both Suite domains resolve to the exact Live deployment; prior dpl_Br3Lk189L8YFCFFLUqrLGuJkofwT preserved.
- All seven Live marketing routes (Home, Portfolio, Tools, FAQ, queue, Privacy, Terms) return200 with Finder visible, Coming soon present, no Finder link, and intact Suite/social links. Live desktop and390px screenshots confirm layout; phone has no horizontal overflow. No account, database, payment or extension changes.
- Evidence: finder-footer-live-checks.json, finder-coming-soon-live-desktop.jpg and finder-coming-soon-live-mobile.jpg in the October5 task artifact directory. No remaining work in this scope.
