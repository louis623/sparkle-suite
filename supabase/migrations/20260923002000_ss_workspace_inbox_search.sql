-- Keep Message Center search scoped to the signed-in rep before pagination.
create function public.search_workspace_rep_conversation_page(
  p_rep_id uuid,
  p_conversation_type text,
  p_archived boolean,
  p_search text,
  p_needs_reply boolean,
  p_limit integer,
  p_before_last_message_at timestamptz,
  p_before_id uuid,
  p_equal_timestamp_mode text
)
returns table (
  id uuid, conversation_type text, state text, subject text,
  context_snapshot jsonb, last_message_at timestamptz,
  latest_message_preview text, latest_message_sender_display_name text,
  updated_at timestamptz, participant_id uuid, participant_role text,
  participant_membership_state text, participant_last_read_at timestamptz,
  participant_archived_at timestamptz, participant_muted_at timestamptz,
  participant_unread_count integer, total_unread bigint
)
language sql stable security definer set search_path = ''
as $$
  with term as (
    select '%' || replace(replace(replace(p_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' as pattern
  ), eligible as materialized (
    select c.id, c.conversation_type, c.state, c.subject, c.context_snapshot,
      c.last_message_at, c.latest_message_preview,
      c.latest_message_sender_display_name, c.updated_at,
      p.id as participant_id, p.role as participant_role,
      p.membership_state as participant_membership_state,
      p.last_read_at as participant_last_read_at,
      p.archived_at as participant_archived_at,
      p.muted_at as participant_muted_at,
      p.unread_count as participant_unread_count
    from public.workspace_conversation_participants p
    join public.workspace_conversations c on c.id = p.conversation_id
    cross join term
    where p.principal_type = 'rep' and p.rep_id = p_rep_id
      and p.membership_state in ('pending', 'active')
      and ((p_archived and p.archived_at is not null)
        or (not p_archived and p.archived_at is null))
      and (p_conversation_type is null or c.conversation_type = p_conversation_type)
      and (not p_needs_reply or (c.state = 'open' and exists (
        select 1 from public.workspace_conversation_messages latest
        where latest.id = (
          select m.id from public.workspace_conversation_messages m
          where m.conversation_id = c.id and m.kind = 'message'
          order by m.created_at desc, m.id desc limit 1
        )
        and (latest.sender_principal_type not in ('system', 'rep')
          or (latest.sender_principal_type = 'rep'
            and latest.sender_rep_id is distinct from p_rep_id))
      )))
      and (
        p_search is null or
        c.subject ilike term.pattern
        or c.latest_message_sender_display_name ilike term.pattern
        or exists (
          select 1 from public.team_onboarding_participants t
          where t.workspace_conversation_id = c.id
            and t.owner_rep_id = p_rep_id
            and t.display_name ilike term.pattern
        )
        or exists (
          select 1 from public.workspace_conversation_participants other
          join public.reps r on r.id = other.rep_id
          where other.conversation_id = c.id
            and other.rep_id is distinct from p_rep_id
            and (r.display_name ilike term.pattern
              or r.business_name ilike term.pattern)
        )
      )
  ), page as (
    select e.* from eligible e
    where p_before_last_message_at is null
      or e.last_message_at < p_before_last_message_at
      or (e.last_message_at = p_before_last_message_at
        and (p_equal_timestamp_mode = 'include_all'
          or (p_equal_timestamp_mode = 'same_kind'
            and p_before_id is not null and e.id < p_before_id)))
    order by e.last_message_at desc, e.id desc
    limit least(greatest(coalesce(p_limit, 25), 1), 101)
  )
  select page.*, coalesce((select pg_catalog.sum(e.participant_unread_count)
    from eligible e), 0)::bigint as total_unread
  from page order by page.last_message_at desc, page.id desc
$$;

revoke all on function public.search_workspace_rep_conversation_page(
  uuid, text, boolean, text, boolean, integer, timestamptz, uuid, text
) from public, anon, authenticated;
grant execute on function public.search_workspace_rep_conversation_page(
  uuid, text, boolean, text, boolean, integer, timestamptz, uuid, text
) to service_role;

-- A page has one durable participant label and one latest actual message.
-- System status messages do not turn a conversation into work awaiting reply.
create function public.workspace_rep_conversation_page_metadata(
  p_rep_id uuid, p_conversation_ids uuid[]
)
returns table (
  conversation_id uuid, participant_name text, needs_reply boolean
)
language sql stable security definer set search_path = ''
as $$
  select c.id,
    coalesce(case when c.conversation_type = 'owner_direct' then 'Sparkle Suite'
      when c.conversation_type = 'support' then 'Sparkle Suite Support'
      else null end, team.display_name, other_rep.business_name,
      other_rep.display_name, c.latest_message_sender_display_name,
      c.subject) as participant_name,
    (c.state = 'open' and latest.sender_principal_type is not null
      and latest.sender_principal_type not in ('system', 'rep')
      or c.state = 'open' and latest.sender_principal_type = 'rep'
        and latest.sender_rep_id is distinct from p_rep_id) as needs_reply
  from public.workspace_conversations c
  join public.workspace_conversation_participants own
    on own.conversation_id = c.id and own.principal_type = 'rep'
    and own.rep_id = p_rep_id and own.membership_state in ('pending', 'active')
  left join public.team_onboarding_participants team
    on team.workspace_conversation_id = c.id and team.owner_rep_id = p_rep_id
  left join lateral (
    select r.display_name, r.business_name
    from public.workspace_conversation_participants other
    join public.reps r on r.id = other.rep_id
    where other.conversation_id = c.id and other.rep_id <> p_rep_id
    order by other.id limit 1
  ) other_rep on true
  left join lateral (
    select m.sender_principal_type, m.sender_rep_id
    from public.workspace_conversation_messages m
    where m.conversation_id = c.id and m.kind = 'message'
    order by m.created_at desc, m.id desc limit 1
  ) latest on true
  where c.id = any(p_conversation_ids)
$$;

revoke all on function public.workspace_rep_conversation_page_metadata(
  uuid, uuid[]
) from public, anon, authenticated;
grant execute on function public.workspace_rep_conversation_page_metadata(
  uuid, uuid[]
) to service_role;

notify pgrst, 'reload schema';
