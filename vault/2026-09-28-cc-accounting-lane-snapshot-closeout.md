## September 28, 2026 - Control Center accounting reads Cheese’s monthly snapshot

- Cheese is the bookkeeper. `control_center_get_accounting_summary` and the internal accounting summary were totaling stored client-list monthly amounts. That rollup reported Suite projected recurring as $50, six active clients, and Stripe not connected, while the September verified snapshot and live Stripe both had $216.98 and five active subscriptions.
- The summary now uses Cheese’s latest verified monthly snapshot for the current Eastern month. Counts, projected recurring, actuals, processor available, expenses, net, and source status come from that snapshot. A missing snapshot stays not connected. The incomplete client list cannot fill or override those figures, and it is not treated as cash.
- The Control Center Accounting page uses the same snapshot for its totals. The client list remains a labeled profile check only. Control Center home already used the snapshot. LOC Overview still prefers live Stripe, then the snapshot; that screen lives in louis-ops-center, not this repo.
- Live connector tool names, the token table, and the stored actor key still use the `lane_` wire values so existing credentials keep working. Cheese owns that path.
- Not deployed. No money movement, Stripe or Bluevine writes, or customer identities in the agent summary.
