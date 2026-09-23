import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const canonical = readFileSync('supabase/migrations/20260826150000_ss_workspace_conversations.sql', 'utf8')
const support = readFileSync('supabase/migrations/20260826151000_ss_support_conversation_links.sql', 'utf8')
const team = readFileSync('supabase/migrations/20260826152000_ss_team_onboarding_conversations.sql', 'utf8')
const network = readFileSync('supabase/migrations/20260826153000_ss_rep_network_messaging.sql', 'utf8')
const reconciliation = readFileSync('supabase/migrations/20260826154000_ss_workspace_communications_reconciliation.sql', 'utf8')
const unreadNullSafety = readFileSync('supabase/migrations/20260826155000_ss_workspace_unread_trigger_null_safety.sql', 'utf8')
const supportStatusConflict = readFileSync('supabase/migrations/20260826156000_ss_support_status_conflict_target.sql', 'utf8')
const repNetworkAmbiguity = readFileSync('supabase/migrations/20260826157000_ss_rep_network_output_column_ambiguity.sql', 'utf8')
const unarchiveOnReply = readFileSync('supabase/migrations/20260923130000_ss_unarchive_on_inbound_reply.sql', 'utf8')

describe('workspace conversation migrations', () => {
  it('creates separate canonical conversation tables with exact principal checks', () => {
    for (const table of ['workspace_conversations', 'workspace_conversation_participants', 'workspace_conversation_messages', 'workspace_conversation_audit_events']) {
      expect(canonical).toContain(`create table if not exists public.${table}`)
    }
    expect(canonical).toContain('workspace_conversation_participants_exact_identity_check')
    expect(canonical).toContain('workspace_conversation_messages_request_unique')
    expect(canonical).not.toMatch(/grant\s+insert\s+on\s+public\.workspace_conversation_messages\s+to\s+authenticated/i)
  })

  it('uses a SECURITY DEFINER membership helper instead of recursive participant RLS', () => {
    expect(canonical).toContain('workspace_rep_is_conversation_participant')
    const policy = canonical.slice(canonical.indexOf('create policy workspace_conversation_participants_member_read'), canonical.indexOf('create policy workspace_conversation_participants_own_state_update'))
    expect(policy).toContain('workspace_rep_is_conversation_participant')
    expect(policy).not.toContain('from public.workspace_conversation_participants')
    expect(canonical).toContain("set search_path = ''")
  })

  it('links support idempotently and keeps screenshots private and support-only', () => {
    expect(support).toContain('create_workspace_support_submission')
    expect(support).toContain('submission_idempotency_key')
    expect(support).toContain('source_support_report_id')
    expect(support).toContain('transition_workspace_support_status')
    expect(support).toContain('uq_workspace_conversation_attachment_content')
    expect(support).toContain("'workspace-support-attachments'")
    expect(support).toContain('assert_workspace_support_attachment')
    expect(support).toContain("'workspace-support-submission:'")
    expect(support).toContain('pg_advisory_xact_lock')
    expect(support.toLowerCase()).not.toMatch(/create policy[^;]+storage\.objects/)
  })

  it('reconciles historical support without deleting legacy records', () => {
    expect(reconciliation).toContain('reconcile_workspace_support_conversations')
    expect(reconciliation).toContain('where support.workspace_conversation_id is null')
    expect(reconciliation).toContain("context_type = 'support_report'")
    expect(reconciliation).toContain("'legacy-support-report:' || report.id::text")
    expect(reconciliation).toContain("'support-conversation-backfill:' || report.id::text")
    expect(reconciliation).toContain('on conflict (conversation_id, sender_identity_key, client_request_id) do nothing')
    expect(reconciliation).toContain('pg_advisory_xact_lock')
    expect(reconciliation).not.toMatch(/delete\s+from\s+public\.support_reports/i)
    expect(reconciliation).not.toMatch(/drop\s+table\s+.*support_reports/i)
  })

  it('lists canonical conversation pages after filtering and calculates exact unread totals', () => {
    expect(reconciliation).toContain('list_workspace_rep_conversation_page')
    const rpc = reconciliation.slice(
      reconciliation.indexOf('create or replace function public.list_workspace_rep_conversation_page'),
    )
    expect(rpc.indexOf("conversation.conversation_type = p_conversation_type")).toBeLessThan(
      rpc.indexOf('limit least'),
    )
    expect(rpc).toContain('sum(eligible.participant_unread_count)')
    expect(rpc).toContain('eligible.last_message_at < p_before_last_message_at')
    expect(rpc).toContain("p_equal_timestamp_mode = 'same_kind'")
    expect(rpc).toContain('to service_role')
    expect(rpc).not.toMatch(/grant execute[^;]+to authenticated/i)
  })

  it('routes unread increments with null-safe participant identity comparisons', () => {
    expect(unreadNullSafety).toContain('is not distinct from new.sender_rep_id')
    expect(unreadNullSafety).toContain('is not distinct from new.sender_team_onboarding_participant_id')
    expect(unreadNullSafety).toContain('is not distinct from new.sender_principal_key')
  })

  it('returns archived recipients to the Inbox only for a genuine unread inbound reply', () => {
    const trigger = unarchiveOnReply.slice(0, unarchiveOnReply.indexOf('-- Restore only still-unread'))
    const restoration = unarchiveOnReply.slice(unarchiveOnReply.indexOf('-- Restore only still-unread'))
    expect(trigger).toContain('archived_at = case')
    expect(trigger).toContain("new.kind = 'message'")
    expect(trigger).toContain('new.created_at > participant.archived_at')
    expect(trigger).toContain("coalesce((new.metadata ->> 'suppressUnread')::boolean, false) = false")
    expect(trigger).toContain('participant.rep_id is not distinct from new.sender_rep_id')
    expect(trigger).toContain('participant.team_onboarding_participant_id is not distinct from new.sender_team_onboarding_participant_id')
    expect(trigger).toContain("new.sender_principal_type in ('rep', 'onboarding_guest', 'support_queue', 'owner_queue')")
    expect(restoration).toContain('participant.unread_count > 0')
    expect(restoration).toContain('message.created_at > participant.archived_at')
    expect(restoration).toContain("message.kind = 'message'")
    expect(restoration).toContain('participant.rep_id is not distinct from message.sender_rep_id')
    expect(restoration).not.toMatch(/\bdelete\b|\btruncate\b/i)
  })

  it('uses an unambiguous Support status message conflict target', () => {
    expect(supportStatusConflict).toContain(
      'on conflict on constraint workspace_conversation_messages_request_unique',
    )
    expect(supportStatusConflict).not.toContain(
      'on conflict (conversation_id, sender_identity_key, client_request_id)',
    )
  })

  it('qualifies Rep Network decision rows and named block conflicts', () => {
    expect(repNetworkAmbiguity).toContain(
      'where recipient.conversation_id = p_conversation_id',
    )
    expect(repNetworkAmbiguity).toContain(
      'on conflict on constraint workspace_rep_message_blocks_unique',
    )
  })

  it('backfills onboarding once while preserving the legacy table', () => {
    expect(team).toContain('team-onboarding-backfill:')
    expect(team).toContain('on conflict (conversation_id, sender_identity_key, client_request_id) do nothing')
    expect(team).not.toMatch(/drop table\s+.*team_onboarding_messages/i)
  })

  it('enforces atomic rep-network requests, sends, blocks and paid/reviewer isolation', () => {
    expect(network).toContain('create_workspace_rep_message_request')
    expect(network).toContain('send_workspace_rep_direct_message')
    expect(network).toContain('block_workspace_rep_conversation')
    expect(network).toContain('decide_workspace_rep_message_request')
    expect(network).toContain('create_workspace_rep_conversation_report')
    expect(network).toContain('workspace-rep-pair:')
    expect(network).toContain('pg_advisory_xact_lock')
    expect(network).toContain("monthly_amount > 0")
    expect(network).toContain("stripe_livemode is true")
    expect(network).toContain("pricing_tier = 'smoke'")
    expect(network).toContain("conversation.conversation_type = 'rep_direct'")
  })
})
