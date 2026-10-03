-- Signed-in Free accounts can read their own Showcase Studio requests and save favorite reps.
-- Saving a collection stays an application gate. Nic-Nac stays Silver. Trial length and price are unchanged.

drop policy if exists "Silver users can select their own intake submissions"
  on public.sparkle_finder_nic_nac_intake_submissions;

create policy "Signed-in users can select their own intake submissions"
on public.sparkle_finder_nic_nac_intake_submissions
for select
to authenticated
using (user_id = auth.uid());

create or replace function private.sparkle_finder_can_insert_favorite_rep(
  p_user_id uuid,
  p_rep_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    and char_length(btrim(p_rep_id)) between 1 and 200;
$$;

comment on function private.sparkle_finder_can_insert_favorite_rep(uuid, text) is
  'RLS helper that lets a signed-in customer save their own favorite reps. Saving a collection and Nic-Nac stay Silver.';
