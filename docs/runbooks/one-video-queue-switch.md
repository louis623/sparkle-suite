# Turn the video queue on or off for one rep

Apply the One Video Queue migrations to the target database before deploying the matching app code. For PR #191, use the Smoke database only. Live requires Louis’s separate approval.

Run these statements with service-role access. The UUID below is the Smoke `dudesfizzfest` test rep. Before making a change, check the database, the rep’s slug and both gate values.

```sql
SELECT r.id, r.public_site_slug,
       public.tiktok_hosted_video_enabled(r.id) AS hosted_gate_on,
       public.video_all_sources(r.id) AS all_sources_on
FROM public.reps AS r
WHERE r.id = '56c59f36-0e37-4e8e-a664-a1b293699c11';
```

For an already gated rep, turn the switch on with this call. The function records existing non-TikTok videos before enabling the queue. Reps can keep those embeds until they remove or replace them, or Louis selects them for backfill.

```sql
SELECT public.set_all_sources_enabled('56c59f36-0e37-4e8e-a664-a1b293699c11'::uuid, true);
```

Turning the switch off is the rollback. This restores the rep’s previous video handling and keeps stored files and queue history.

```sql
SELECT public.set_all_sources_enabled('56c59f36-0e37-4e8e-a664-a1b293699c11'::uuid, false);
```

Repeat the check after either call. The hosted gate should still be on. The `all_sources_on` value should match the choice you made. Use the function for every switch change so it can preserve assignments in the same transaction.
