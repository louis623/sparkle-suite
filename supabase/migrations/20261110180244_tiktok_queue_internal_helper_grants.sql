-- Supabase's default function privileges can grant service_role EXECUTE even
-- when the original migration never explicitly grants these internal helpers.
-- Public SECURITY DEFINER entry points and triggers call them as their owner.
revoke execute on function public.tiktok_sync_locked(uuid,text),
  public.tiktok_queue_try_sync(uuid), public.tiktok_queue_lock_key(uuid),
  public.site_settings_tiktok_queue_trigger(), public.reps_tiktok_queue_trigger()
  from service_role;

-- Keep the SELECT-only backfill dry run available to the server role.
grant execute on function public.tiktok_current_slot_ids(uuid) to service_role;
