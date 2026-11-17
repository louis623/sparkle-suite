-- Smoke application only. Live requires Louis's separate typed approval.
create function public.trade_listings_catalog_photo_guard_v1()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') and new.listing_source = 'catalog' then
    if tg_op = 'INSERT' then
      if new.listing_photo_url is not null or new.manual_photo_url is not null then
        raise exception 'CATALOG_PHOTO_NOT_ALLOWED' using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' then
      if (new.listing_photo_url is not null and new.listing_photo_url is distinct from old.listing_photo_url)
        or (new.manual_photo_url is not null and new.manual_photo_url is distinct from old.manual_photo_url)
        or ((new.listing_source is distinct from old.listing_source or new.design_id is distinct from old.design_id)
          and (new.listing_photo_url is not null or new.manual_photo_url is not null)) then
        raise exception 'CATALOG_PHOTO_NOT_ALLOWED' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger trade_listings_catalog_photo_guard_v1
before insert or update on public.trade_listings
for each row execute function public.trade_listings_catalog_photo_guard_v1();
notify pgrst, 'reload schema';
