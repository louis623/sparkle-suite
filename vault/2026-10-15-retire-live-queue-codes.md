# 2026-10-15 retire live_queue connection codes

- Connection codes move to `live_lineup_connection_codes`. Migration `20261015140000_ss_live_lineup_connection_codes.sql` copies every existing `live_queue.sync_code` exactly for reps that still exist.
- Lineup reads no longer fall back to `live_queue.queue`. With no current Live Lineup state, Workspace shows "No Live Lineup data yet." and the public snapshot is an empty offline lineup.
- `live-queue-sync` is a no-op. It does not read or write the database. The Oct 14 8:55 AM ET queue update matches that function: it is the only application writer of `queue` and `last_updated`, called by a legacy extension POST.
- `live_queue` stays in place, commented RETIRED, with writes revoked from `anon`, `authenticated`, and `service_role`. Permission names `live_queue.view` / `live_queue.manage` and `nic_nac_show_sessions.live_queue_sync_code` are unchanged. No deploy and no database apply in this session.
