-- An archived conversation stays out of the Inbox until a genuine new message
-- arrives for that participant. Keep the existing sender, system, and
-- suppressUnread behavior intact; only the recipient's archive state changes.
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
    archived_at = case
      when new.kind = 'message'
        and new.sender_principal_type in ('rep', 'onboarding_guest', 'support_queue', 'owner_queue')
        and new.created_at > participant.archived_at
      then null
      else participant.archived_at
    end,
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
revoke all on function public.update_workspace_conversation_after_message()
  from public, anon, authenticated;

-- Restore only still-unread conversations with a real inbound message posted
-- after the participant archived them. Already-read archives remain archived.
update public.workspace_conversation_participants participant set
  archived_at = null,
  updated_at = greatest(participant.updated_at, clock_timestamp())
where participant.archived_at is not null
  and participant.unread_count > 0
  and participant.membership_state in ('pending', 'active')
  and exists (
    select 1 from public.workspace_conversation_messages message
    where message.conversation_id = participant.conversation_id
      and message.created_at > participant.archived_at
      and message.kind = 'message'
      and message.sender_principal_type in ('rep', 'onboarding_guest', 'support_queue', 'owner_queue')
      and coalesce((message.metadata ->> 'suppressUnread')::boolean, false) = false
      and not (
        (message.sender_principal_type = 'rep' and participant.rep_id is not distinct from message.sender_rep_id)
        or (message.sender_principal_type = 'onboarding_guest' and participant.team_onboarding_participant_id is not distinct from message.sender_team_onboarding_participant_id)
        or (message.sender_principal_type = 'support_queue' and participant.principal_type = 'support_queue' and participant.principal_key is not distinct from message.sender_principal_key)
        or (message.sender_principal_type = 'owner_queue' and participant.principal_type = 'owner_queue' and participant.principal_key is not distinct from message.sender_principal_key)
      )
  );
