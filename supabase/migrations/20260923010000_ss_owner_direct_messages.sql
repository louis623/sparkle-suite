-- Private, one-to-one conversations between the Control Center owner and a rep.
-- These are distinct from Rep Network requests, Support reports and broadcasts.
alter table public.workspace_conversations drop constraint workspace_conversations_type_check;
alter table public.workspace_conversations add constraint workspace_conversations_type_check
  check (conversation_type in ('team_onboarding', 'support', 'rep_direct', 'owner_direct'));
alter table public.workspace_conversations add constraint workspace_owner_direct_context_check
  check (conversation_type <> 'owner_direct' or (context_type = 'rep_profile'
    and context_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'));

alter table public.workspace_conversation_participants drop constraint workspace_conversation_participants_principal_type_check;
alter table public.workspace_conversation_participants add constraint workspace_conversation_participants_principal_type_check
  check (principal_type in ('rep', 'onboarding_guest', 'support_queue', 'owner_queue'));
alter table public.workspace_conversation_participants drop constraint workspace_conversation_participants_role_check;
alter table public.workspace_conversation_participants add constraint workspace_conversation_participants_role_check
  check (role in ('requester', 'recipient', 'team_lead', 'onboarding_guest', 'support', 'owner'));
alter table public.workspace_conversation_participants drop constraint workspace_conversation_participants_exact_identity_check;
alter table public.workspace_conversation_participants add constraint workspace_conversation_participants_exact_identity_check check (
  (principal_type = 'rep' and rep_id is not null and team_onboarding_participant_id is null and principal_key is null)
  or (principal_type = 'onboarding_guest' and rep_id is null and team_onboarding_participant_id is not null and principal_key is null)
  or (principal_type = 'support_queue' and rep_id is null and team_onboarding_participant_id is null and principal_key = 'sparkle_suite_support')
  or (principal_type = 'owner_queue' and rep_id is null and team_onboarding_participant_id is null and principal_key = 'sparkle_suite_owner')
);

alter table public.workspace_conversation_messages drop constraint workspace_conversation_messages_sender_type_check;
alter table public.workspace_conversation_messages add constraint workspace_conversation_messages_sender_type_check
  check (sender_principal_type in ('rep', 'onboarding_guest', 'support_queue', 'owner_queue', 'system'));
alter table public.workspace_conversation_messages drop constraint workspace_conversation_messages_sender_identity_check;
alter table public.workspace_conversation_messages add constraint workspace_conversation_messages_sender_identity_check check (
  (sender_principal_type = 'rep' and sender_rep_id is not null and sender_team_onboarding_participant_id is null and sender_principal_key is null)
  or (sender_principal_type = 'onboarding_guest' and sender_rep_id is null and sender_team_onboarding_participant_id is not null and sender_principal_key is null)
  or (sender_principal_type = 'support_queue' and sender_rep_id is null and sender_team_onboarding_participant_id is null and sender_principal_key = 'sparkle_suite_support')
  or (sender_principal_type = 'owner_queue' and sender_rep_id is null and sender_team_onboarding_participant_id is null and sender_principal_key = 'sparkle_suite_owner')
  or (sender_principal_type = 'system' and sender_rep_id is null and sender_team_onboarding_participant_id is null and sender_principal_key = 'system')
);

create unique index if not exists uq_workspace_owner_direct_rep
  on public.workspace_conversations(context_id)
  where conversation_type = 'owner_direct' and context_type = 'rep_profile';
create unique index if not exists uq_workspace_owner_direct_queue
  on public.workspace_conversation_participants(conversation_id)
  where principal_type = 'owner_queue';

create or replace function public.validate_workspace_owner_direct_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_type text; v_rep_id uuid; v_context_id text;
begin
  select conversation_type, context_id into v_type, v_context_id
  from public.workspace_conversations where id = new.conversation_id;
  if v_type = 'owner_direct' then
    v_rep_id := v_context_id::uuid;
    if not ((new.principal_type = 'rep' and new.role = 'recipient' and new.rep_id = v_rep_id)
      or (new.principal_type = 'owner_queue' and new.role = 'owner')) then
      raise exception 'invalid owner direct participant';
    end if;
  elsif new.principal_type = 'owner_queue' then
    raise exception 'owner queue requires owner direct conversation';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_validate_workspace_owner_direct_participant on public.workspace_conversation_participants;
create trigger trg_validate_workspace_owner_direct_participant
before insert or update on public.workspace_conversation_participants
for each row execute function public.validate_workspace_owner_direct_participant();
revoke all on function public.validate_workspace_owner_direct_participant() from public, anon, authenticated;

create or replace function public.validate_workspace_owner_direct_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_type text; v_rep_id uuid;
begin
  select conversation_type into v_type from public.workspace_conversations where id = new.conversation_id;
  if v_type = 'owner_direct' then
    select context_id::uuid into v_rep_id from public.workspace_conversations where id = new.conversation_id;
    if not ((new.sender_principal_type = 'owner_queue'
      and new.sender_principal_key = 'sparkle_suite_owner' and new.operator_actor_id is not null)
      or (new.sender_principal_type = 'rep' and new.sender_rep_id = v_rep_id)) then
      raise exception 'invalid owner direct sender';
    end if;
  elsif new.sender_principal_type = 'owner_queue' then
    raise exception 'owner sender requires owner direct conversation';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_validate_workspace_owner_direct_message on public.workspace_conversation_messages;
create trigger trg_validate_workspace_owner_direct_message
before insert or update on public.workspace_conversation_messages
for each row execute function public.validate_workspace_owner_direct_message();
revoke all on function public.validate_workspace_owner_direct_message() from public, anon, authenticated;

create table if not exists public.workspace_owner_direct_attachments (
  id uuid primary key,
  conversation_id uuid not null references public.workspace_conversations(id) on delete cascade,
  message_id uuid not null references public.workspace_conversation_messages(id) on delete cascade,
  attachment_slot integer not null check (attachment_slot between 1 and 3),
  object_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 8388608),
  width integer not null check (width between 1 and 2400),
  height integer not null check (height between 1 and 2400),
  created_at timestamptz not null default now(),
  unique (message_id, attachment_slot)
);
create index if not exists idx_workspace_owner_direct_attachments_conversation
  on public.workspace_owner_direct_attachments(conversation_id, message_id);
alter table public.workspace_owner_direct_attachments enable row level security;
-- The service-role API verifies owner scope or exact rep membership before signed reads.
revoke all on public.workspace_owner_direct_attachments from public, anon, authenticated;
grant select, insert, update, delete on public.workspace_owner_direct_attachments to service_role;

create table if not exists public.workspace_owner_direct_upload_tickets (
  id uuid primary key,
  rep_id uuid not null references public.reps(id) on delete cascade,
  operator_rep_id uuid not null references public.reps(id) on delete cascade,
  client_request_id text not null check (char_length(btrim(client_request_id)) between 1 and 180),
  object_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 8388608),
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index if not exists idx_workspace_owner_direct_upload_tickets_created
  on public.workspace_owner_direct_upload_tickets(created_at);
alter table public.workspace_owner_direct_upload_tickets enable row level security;
revoke all on public.workspace_owner_direct_upload_tickets from public, anon, authenticated;
grant select, insert, update, delete on public.workspace_owner_direct_upload_tickets to service_role;

create or replace function public.validate_workspace_owner_direct_attachment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.workspace_conversation_messages message
    join public.workspace_conversations conversation on conversation.id = message.conversation_id
    where message.id = new.message_id and message.conversation_id = new.conversation_id
      and conversation.conversation_type = 'owner_direct'
      and message.sender_principal_type = 'owner_queue'
  ) then raise exception 'owner direct attachment requires owner message'; end if;
  return new;
end;
$$;
drop trigger if exists trg_validate_workspace_owner_direct_attachment on public.workspace_owner_direct_attachments;
create trigger trg_validate_workspace_owner_direct_attachment
before insert or update on public.workspace_owner_direct_attachments
for each row execute function public.validate_workspace_owner_direct_attachment();
revoke all on function public.validate_workspace_owner_direct_attachment() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-owner-direct', 'workspace-owner-direct', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The API uploads private objects before this atomic write and removes its own
-- upload set on failure or a losing idempotency race.
create or replace function public.send_workspace_owner_direct_message(
  p_rep_id uuid, p_operator_rep_id uuid, p_body text, p_client_request_id text,
  p_attachments jsonb default '[]'::jsonb
)
returns table (out_conversation_id uuid, out_message_id uuid, out_created_at timestamptz, out_created boolean)
language plpgsql security definer set search_path = '' as $$
declare v_conversation_id uuid; v_message_id uuid; v_created_at timestamptz;
  v_attachment jsonb; v_slot integer := 0; v_rep_name text;
begin
  if p_body is null or char_length(btrim(p_body)) not between 1 and 10000
    or p_client_request_id is null or char_length(btrim(p_client_request_id)) not between 1 and 180
    or jsonb_typeof(p_attachments) <> 'array' or jsonb_array_length(p_attachments) > 3 then
    raise exception 'invalid owner direct message';
  end if;
  select coalesce(nullif(btrim(business_name), ''), nullif(btrim(display_name), ''), 'Sparkle Suite rep')
    into v_rep_name from public.reps where id = p_rep_id and status = 'active';
  if v_rep_name is null then raise exception 'recipient is not active'; end if;
  if not exists (select 1 from public.reps where id = p_operator_rep_id and status = 'active') then
    raise exception 'operator is not active';
  end if;

  insert into public.workspace_conversations
    (conversation_type, state, subject, context_type, context_id, context_snapshot)
  values ('owner_direct', 'open', 'Message from Sparkle Suite', 'rep_profile', p_rep_id::text,
    jsonb_build_object('recipientRepId', p_rep_id))
  on conflict (context_id) where conversation_type = 'owner_direct' and context_type = 'rep_profile'
  do nothing returning id into v_conversation_id;
  if v_conversation_id is null then
    select id into v_conversation_id from public.workspace_conversations
      where conversation_type = 'owner_direct' and context_type = 'rep_profile' and context_id = p_rep_id::text;
  end if;
  if v_conversation_id is null then raise exception 'owner direct conversation missing'; end if;
  insert into public.workspace_conversation_participants
    (conversation_id, principal_type, rep_id, role, membership_state)
  values (v_conversation_id, 'rep', p_rep_id, 'recipient', 'active')
  on conflict (conversation_id, rep_id) where principal_type = 'rep' do nothing;
  insert into public.workspace_conversation_participants
    (conversation_id, principal_type, principal_key, role, membership_state)
  values (v_conversation_id, 'owner_queue', 'sparkle_suite_owner', 'owner', 'active')
  on conflict (conversation_id) where principal_type = 'owner_queue' do nothing;
  if (select count(*) from public.workspace_conversation_participants where conversation_id = v_conversation_id) <> 2
     or not exists (select 1 from public.workspace_conversation_participants where conversation_id = v_conversation_id and rep_id = p_rep_id and membership_state = 'active') then
    raise exception 'owner direct participant invariant failed';
  end if;

  insert into public.workspace_conversation_messages
    (conversation_id, sender_principal_type, sender_identity_key, sender_principal_key,
     sender_display_name, operator_actor_id, kind, body, client_request_id)
  values (v_conversation_id, 'owner_queue', 'owner:sparkle_suite_owner',
    'sparkle_suite_owner', 'Sparkle Suite', p_operator_rep_id::text,
    'message', btrim(p_body), btrim(p_client_request_id))
  on conflict (conversation_id, sender_identity_key, client_request_id) do nothing
  returning id, workspace_conversation_messages.created_at into v_message_id, v_created_at;
  if v_message_id is null then
    select id, workspace_conversation_messages.created_at into v_message_id, v_created_at
    from public.workspace_conversation_messages
    where workspace_conversation_messages.conversation_id = v_conversation_id
      and sender_identity_key = 'owner:sparkle_suite_owner' and client_request_id = btrim(p_client_request_id);
    if v_message_id is null then raise exception 'idempotent owner message missing'; end if;
    if (select body from public.workspace_conversation_messages where id = v_message_id) <> btrim(p_body) then
      raise exception 'client request id reused with different content';
    end if;
    return query select v_conversation_id, v_message_id, v_created_at, false;
    return;
  end if;
  for v_attachment in select value from jsonb_array_elements(p_attachments) loop
    v_slot := v_slot + 1;
    if (v_attachment->>'id') is null or (v_attachment->>'contentType') not in ('image/jpeg','image/png','image/webp')
      or (v_attachment->>'byteSize')::integer not between 1 and 8388608
      or (v_attachment->>'width')::integer not between 1 and 2400
      or (v_attachment->>'height')::integer not between 1 and 2400
      or coalesce(v_attachment->>'objectPath', '') !~ ('^' || p_rep_id::text || '/[0-9a-f-]+[.](jpg|png|webp)$') then
      raise exception 'invalid owner direct attachment';
    end if;
    insert into public.workspace_owner_direct_attachments
      (id, conversation_id, message_id, attachment_slot, object_path, content_type, byte_size, width, height)
    values ((v_attachment->>'id')::uuid, v_conversation_id, v_message_id, v_slot,
      v_attachment->>'objectPath', v_attachment->>'contentType', (v_attachment->>'byteSize')::integer,
      (v_attachment->>'width')::integer, (v_attachment->>'height')::integer);
  end loop;
  return query select v_conversation_id, v_message_id, v_created_at, true;
end;
$$;
revoke all on function public.send_workspace_owner_direct_message(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.send_workspace_owner_direct_message(uuid, uuid, text, text, jsonb) to service_role;

-- Owner sends should increment only the rep's unread count; rep replies increment the owner queue.
create or replace function public.update_workspace_conversation_after_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.workspace_conversations set
    last_message_at = new.created_at,
    latest_message_preview = pg_catalog.left(pg_catalog.regexp_replace(pg_catalog.btrim(new.body), '\s+', ' ', 'g'), 180),
    latest_message_sender_display_name = new.sender_display_name,
    updated_at = greatest(updated_at, new.created_at)
  where id = new.conversation_id;
  update public.workspace_conversation_participants participant set
    unread_count = participant.unread_count + 1,
    updated_at = greatest(participant.updated_at, new.created_at)
  where participant.conversation_id = new.conversation_id
    and participant.membership_state in ('pending', 'active')
    and coalesce((new.metadata ->> 'suppressUnread')::boolean, false) = false
    and not (
      (new.sender_principal_type = 'rep' and participant.rep_id is not distinct from new.sender_rep_id)
      or (new.sender_principal_type = 'onboarding_guest' and participant.team_onboarding_participant_id is not distinct from new.sender_team_onboarding_participant_id)
      or (new.sender_principal_type = 'support_queue' and participant.principal_type = 'support_queue' and participant.principal_key is not distinct from new.sender_principal_key)
      or (new.sender_principal_type = 'owner_queue' and participant.principal_type = 'owner_queue' and participant.principal_key is not distinct from new.sender_principal_key)
      or (new.sender_principal_type = 'system' and participant.principal_type in ('support_queue', 'owner_queue'))
    );
  return new;
end;
$$;

create or replace function public.list_workspace_owner_direct_page(
  p_query text default null, p_limit integer default 50, p_offset integer default 0
)
returns table (
  id uuid, rep_id uuid, rep_name text, business_name text, subject text,
  state text, latest_message_preview text, last_message_at timestamptz,
  unread_count integer, total_count bigint
)
language sql stable security definer set search_path = '' as $$
  select conversation.id, conversation.context_id::uuid,
    coalesce(nullif(btrim(rep.display_name), ''), nullif(btrim(rep.business_name), ''), 'Sparkle Suite rep'),
    rep.business_name, conversation.subject, conversation.state,
    conversation.latest_message_preview, conversation.last_message_at,
    coalesce(owner_participant.unread_count, 0), count(*) over ()
  from public.workspace_conversations conversation
  left join public.reps rep on rep.id::text = conversation.context_id
  left join public.workspace_conversation_participants owner_participant
    on owner_participant.conversation_id = conversation.id and owner_participant.principal_type = 'owner_queue'
  where conversation.conversation_type = 'owner_direct'
    and (nullif(btrim(p_query), '') is null
      or rep.display_name ilike '%' || btrim(p_query) || '%'
      or rep.business_name ilike '%' || btrim(p_query) || '%'
      or conversation.subject ilike '%' || btrim(p_query) || '%'
      or conversation.latest_message_preview ilike '%' || btrim(p_query) || '%')
  order by conversation.last_message_at desc, conversation.id desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;
revoke all on function public.list_workspace_owner_direct_page(text, integer, integer) from public, anon, authenticated;
grant execute on function public.list_workspace_owner_direct_page(text, integer, integer) to service_role;
