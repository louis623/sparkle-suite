# 2026-10-15 rep deactivation script closeout

Rocky's review of draft PR #101: audience code stays, the manual script was rewritten. No merge, no Live write, no Live deploy, no email.

- Read-only Live inventory: 32 reps. Twelve stay protected. Nineteen test, demo, and smoke reps go to `inactive`. Stephanie Graham `cf798d57-c2f7-40d7-a862-2fc39ca3a4b1` goes to `churned` and `account_classification=customer`.
- A count of 20 inactive targets plus Stephanie does not match Live. The abort count is 20 total rows: 19 inactive plus Stephanie.
- Match is by hard-coded rep UUID. Undo restores `status`, `account_classification`, and `updated_at` from `public.manual_rep_status_backup_20261014`.
- The script was not executed on Live or Smoke.
