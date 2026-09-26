# 2026-09-26 - Workspace refresh lands on Nic-Nac

- Bare `/nic-nac` refresh stays on the Nic-Nac home. Leaving Message Center clears `section=messages` and message-only query params, so the next refresh does not reopen the inbox.
- Explicit `section=messages`, message threads, and other section deep links still load that destination.
- Nic-Nac conversation URL updates now merge into the live address bar, so a stale search snapshot cannot put Message Center back after the rep has returned home.
- Not deployed.
