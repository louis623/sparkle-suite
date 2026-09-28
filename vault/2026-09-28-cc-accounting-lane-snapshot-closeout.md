## September 28, 2026 - Control Center accounting reads the Lane snapshot

- `control_center_get_accounting_summary` and the internal accounting summary were totaling stored client-list monthly amounts. That rollup reported Suite projected recurring as $50, six active clients, and Stripe not connected, while the September Lane snapshot and live Stripe both had $216.98 and five active subscriptions.
- The summary now uses the latest Lane monthly snapshot for the current Eastern month. Counts, projected recurring, actuals, processor available, expenses, net, and source status come from that snapshot. A missing snapshot stays not connected. The incomplete client list cannot fill or override those figures, and it is not treated as cash.
- The Control Center Accounting page uses the same snapshot for its totals. The client list remains a labeled profile check only. Control Center home already used the snapshot. LOC Overview still prefers live Stripe, then the snapshot; that screen lives in louis-ops-center, not this repo.
- Not deployed. No money movement, Stripe or Bluevine writes, or customer identities in the agent summary.
