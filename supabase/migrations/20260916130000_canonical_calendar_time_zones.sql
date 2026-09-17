-- Calendar timestamps are instants. Their geographic IANA region determines
-- the local wall-clock display and DST-aware recurring-series calculations.
-- Preserve every event instant while removing legacy fixed/ambiguous labels.

update public.calendar_events
set time_zone = case time_zone
  when 'EST' then 'America/New_York'
  when 'EDT' then 'America/New_York'
  when 'CST' then 'America/Chicago'
  when 'CDT' then 'America/Chicago'
  when 'MST' then 'America/Denver'
  when 'MDT' then 'America/Denver'
  when 'PST' then 'America/Los_Angeles'
  when 'PDT' then 'America/Los_Angeles'
  when 'HST' then 'Pacific/Honolulu'
  else time_zone
end
where time_zone in ('EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT', 'HST');

-- Lindsey's existing timestamps already represent her intended Mountain local
-- show times. Change metadata only: 01:00Z remains 7 PM in Denver daylight time.
update public.reps
set time_zone = 'America/Denver', updated_at = now()
where id = 'f82734fd-6964-42c7-b67d-c2445528c3b4'
  and email = 'lindseychapman1188@gmail.com'
  and public_site_slug = 'milehighfizz'
  and time_zone = 'America/New_York';
