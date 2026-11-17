-- Smoke application only. Live requires Louis's separate typed approval.
-- Preserve SELECT, REFERENCES, TRIGGER and PostgreSQL 17+ MAINTAIN.
revoke insert, update, delete, truncate on public.jewelry_designs from anon, authenticated;
drop policy if exists "designs_write_admin" on public.jewelry_designs;
notify pgrst, 'reload schema';
