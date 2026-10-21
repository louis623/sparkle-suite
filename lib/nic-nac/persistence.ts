// Persistence helpers for Nic-Nac conversations. Layered defensive pattern:
//   1. Insert user message with ON CONFLICT DO NOTHING (idempotent on retry).
//   2. Reserve assistant row as 'pending' BEFORE streamText starts.
//   3. Checkpoint parts into the reserved row from onStepFinish + onChunk
//      (debounced) so an aborted stream leaves durable partial state.
//   4. onFinish → status='complete'. onError or consumeSseStream error →
//      status='aborted'. Final flush preserves whatever was checkpointed.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UIMessage } from 'ai'
import { isTradeRequestCardPart } from '@/lib/nic-nac/trade-request-card-parts'
import {
  recentConversationsFromRows,
  type RecentConversationSummary,
} from '@/lib/nic-nac/recent-conversations'
import type { TradeRequestStatus } from '@/lib/services/types'

export async function loadCanonicalHistory(
  supabase: SupabaseClient,
  conversationId: string
): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from('nic_nac_conversations')
    .select('message_id, role, parts, status, created_at, cleared_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  // Drop pending (mid-stream) and aborted (failed) assistant rows from the
  // canonical view fed to the model — they'd surface as empty assistant
  // turns. The GET /conversation/[id] route reports them separately for UI
  // visibility; only the model should skip them.
  if ((data ?? []).some((row) => row.cleared_at)) return []

  return (data ?? [])
    .filter((row) => row.role === 'user' || row.status === 'complete')
    .map((row) => {
      // Merge any pre-existing metadata (forward-compat) with created_at.
      // No metadata column today, but spread guards against clobber if added.
      const existing = (row as { metadata?: Record<string, unknown> }).metadata
      return {
        id: row.message_id as string,
        role: row.role as 'user' | 'assistant',
        parts: row.parts as UIMessage['parts'],
        metadata: { ...(existing ?? {}), created_at: row.created_at as string },
      }
    })
}

export async function getConversationOwner(
  supabase: SupabaseClient,
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('nic_nac_conversations')
    .select('rep_id')
    .eq('conversation_id', conversationId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.rep_id as string | undefined) ?? null
}

// Find the rep's most recently active conversation by locating their newest
// message row. NOTE: nic_nac_conversations is a per-MESSAGE table despite the
// name (one row per UIMessage). The secondary `.order('id', desc)` is a
// deterministic tiebreaker for messages that share a created_at timestamp
// (rare but possible under bulk inserts or clock granularity).
export async function getLatestConversationId(
  supabase: SupabaseClient,
  repId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('nic_nac_conversations')
    .select('conversation_id')
    .eq('rep_id', repId)
    .is('cleared_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.conversation_id as string | undefined) ?? null
}

export async function listRecentNicNacConversations(
  supabase: SupabaseClient,
  repId: string,
  limit = 5,
  options?: {
    excludeConversationId?: string | null
    rolloverEdges?: Array<{
      sourceConversationId: string
      destinationConversationId: string
    }>
  },
): Promise<RecentConversationSummary[]> {
  const { data, error } = await supabase
    .from('nic_nac_conversations')
    .select('conversation_id, role, parts, created_at')
    .eq('rep_id', repId)
    .is('cleared_at', null)
    .order('created_at', { ascending: false })
    .limit(80)
  if (error) throw error
  return recentConversationsFromRows(data ?? [], limit, options)
}

// Clear retires the open chat so the next visit does not resume it. Earlier
// chats stay uncleared so Recent can reopen them. Rows are kept for audit.
export async function clearActiveConversationsForRep(
  supabase: SupabaseClient,
  repId: string,
  conversationId: string,
): Promise<string[]> {
  // Retire only the open chat. Earlier chats stay in Recent and can be reopened.
  const { data, error } = await supabase
    .from('nic_nac_conversations')
    .update({ cleared_at: new Date().toISOString() })
    .eq('rep_id', repId)
    .eq('conversation_id', conversationId)
    .is('cleared_at', null)
    .select('conversation_id')
  if (error) throw error

  return Array.from(
    new Set(
      ((data ?? []) as Array<{ conversation_id?: string | null }>)
        .map((row) => row.conversation_id?.trim())
        .filter((conversationId): conversationId is string => Boolean(conversationId)),
    ),
  )
}

export async function insertUserMessage(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    repId: string
    messageId: string
    parts: UIMessage['parts']
  }
): Promise<void> {
  // ON CONFLICT DO NOTHING on (conversation_id, message_id) — idempotent.
  // PostgREST doesn't expose ON CONFLICT DO NOTHING directly via .insert;
  // use .upsert with ignoreDuplicates to match that semantic.
  const { error } = await supabase.from('nic_nac_conversations').upsert(
    {
      conversation_id: args.conversationId,
      message_id: args.messageId,
      rep_id: args.repId,
      role: 'user',
      parts: args.parts,
      status: 'complete',
    },
    { onConflict: 'conversation_id,message_id', ignoreDuplicates: true }
  )
  if (error) throw error
}

export async function insertConversationMessages(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    repId: string
    messages: UIMessage[]
  },
): Promise<void> {
  if (args.messages.length === 0) return
  const { error } = await supabase.from('nic_nac_conversations').insert(
    args.messages.map((message) => ({
      conversation_id: args.conversationId,
      message_id: message.id,
      rep_id: args.repId,
      role: message.role,
      parts: message.parts ?? [],
      status: 'complete',
    })),
  )
  if (error) throw error
}

export async function deleteConversationMessages(
  supabase: SupabaseClient,
  args: { conversationId: string; repId: string },
): Promise<void> {
  const { error } = await supabase
    .from('nic_nac_conversations')
    .delete()
    .eq('conversation_id', args.conversationId)
    .eq('rep_id', args.repId)
  if (error) throw error
}

export async function reserveAssistantMessage(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    repId: string
    messageId: string
  }
): Promise<void> {
  const { error } = await supabase.from('nic_nac_conversations').upsert(
    {
      conversation_id: args.conversationId,
      message_id: args.messageId,
      rep_id: args.repId,
      role: 'assistant',
      parts: [],
      status: 'pending',
    },
    { onConflict: 'conversation_id,message_id', ignoreDuplicates: true }
  )
  if (error) throw error
}

export async function checkpointAssistant(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    messageId: string
    parts: UIMessage['parts']
  }
): Promise<void> {
  const { error } = await supabase
    .from('nic_nac_conversations')
    .update({ parts: args.parts, updated_at: new Date().toISOString() })
    .eq('conversation_id', args.conversationId)
    .eq('message_id', args.messageId)
  if (error) throw error
}

export async function completeAssistant(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    messageId: string
    parts: UIMessage['parts']
  }
): Promise<void> {
  const { error } = await supabase
    .from('nic_nac_conversations')
    .update({
      parts: args.parts,
      status: 'complete',
      updated_at: new Date().toISOString(),
    })
    .eq('conversation_id', args.conversationId)
    .eq('message_id', args.messageId)
  if (error) throw error
}

export async function abortAssistant(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    messageId: string
    parts?: UIMessage['parts']
  }
): Promise<void> {
  const update: Record<string, unknown> = {
    status: 'aborted',
    updated_at: new Date().toISOString(),
  }
  if (args.parts) update.parts = args.parts
  const { error } = await supabase
    .from('nic_nac_conversations')
    .update(update)
    .eq('conversation_id', args.conversationId)
    .eq('message_id', args.messageId)
  if (error) throw error
}

export async function recordApprovalEvent(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    repId: string
    approvalId: string
    toolName: string
    approved: boolean
  }
): Promise<{ replayed: boolean }> {
  // Rely on UNIQUE (approval_id) to reject replays at the DB level.
  const { error } = await supabase.from('approval_events').insert({
    conversation_id: args.conversationId,
    rep_id: args.repId,
    approval_id: args.approvalId,
    tool_name: args.toolName,
    approved: args.approved,
  })
  if (error) {
    // 23505 = unique_violation
    if ((error as { code?: string }).code === '23505') {
      return { replayed: true }
    }
    throw error
  }
  return { replayed: false }
}

// Like loadCanonicalHistory but annotated for the client's UI hydrate path.
// Walks the loaded messages and attaches a non-SDK marker to any assistant
// `approval-requested` part whose approval id is already recorded in
// approval_events. The marker is read by the client gate
// (lib/nic-nac/hitl-state.ts) to suppress live HITL cards for stale rows
// without claiming the tool actually executed.
//
// Critical: an approval_events row is recorded BEFORE streamText runs in
// app/api/nic-nac/route.ts. It only proves the user clicked, NOT that the
// tool's execute() ran. We therefore must NOT transform the part into a
// terminal state (output-available / output-denied) — doing so would:
//   1. claim a successful tool execution that may never have happened,
//   2. fabricate placeholder `output` payloads that get round-tripped back
//      through useChat → convertToModelMessages, polluting model history.
//
// We leave `state: 'approval-requested'` and the original (output-less) part
// shape intact — that's the truthful persisted state. The marker is purely a
// render/gate hint that survives JSON round-tripping but is ignored by both
// the AI SDK's convert-to-model-messages and the route's replay extractor
// (which only matches `state === 'approval-responded'`).
//
// Only used by the GET /conversation/[id] hydrate route. The POST route's
// loadCanonicalHistory call is left untouched — it only feeds an ownership
// probe and a user-message dedup set, neither of which needs annotation.
export const HISTORICAL_APPROVAL_KEY = '__historicalApproval'

export async function loadConversationForClient(
  supabase: SupabaseClient,
  conversationId: string
): Promise<UIMessage[]> {
  const messages = await loadCanonicalHistory(supabase, conversationId)

  // Collect every approval id that appears in an approval-requested part.
  const pendingApprovalIds: string[] = []
  const tradeRequestIds: string[] = []
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    for (const part of m.parts ?? []) {
      const p = part as { state?: string; approval?: { id?: string } }
      if (p?.state === 'approval-requested' && p?.approval?.id) {
        pendingApprovalIds.push(p.approval.id)
      }
      if (isTradeRequestCardPart(part)) {
        tradeRequestIds.push(part.data.requestId)
      }
    }
  }
  if (pendingApprovalIds.length === 0 && tradeRequestIds.length === 0) return messages

  // One round-trip: pull every recorded approval event for this conversation
  // whose id matches a pending part. Conversation-scoped to keep the index
  // selective.
  const resolved = new Map<string, boolean>()
  if (pendingApprovalIds.length > 0) {
    const { data, error } = await supabase
      .from('approval_events')
      .select('approval_id, approved')
      .eq('conversation_id', conversationId)
      .in('approval_id', pendingApprovalIds)
    if (error) throw error

    for (const row of (data ?? []) as Array<{ approval_id: string; approved: boolean }>) {
      resolved.set(row.approval_id, row.approved)
    }
  }

  const tradeStatuses = new Map<string, TradeRequestStatus>()
  if (tradeRequestIds.length > 0) {
    const uniqueTradeRequestIds = Array.from(new Set(tradeRequestIds))
    const { data, error } = await supabase
      .from('trade_requests')
      .select('id, status')
      .in('id', uniqueTradeRequestIds)
    if (error) throw error

    for (const row of (data ?? []) as Array<{ id: string; status: TradeRequestStatus }>) {
      tradeStatuses.set(row.id, row.status)
    }
  }

  if (resolved.size === 0 && tradeStatuses.size === 0) return messages

  // Annotate in place. Build new arrays so we don't mutate the loaded rows
  // (UIMessage is a structural type but UI consumers may share references).
  return messages.map((m) => {
    if (m.role !== 'assistant') return m
    let changed = false
    const nextParts = (m.parts ?? []).map((part) => {
      if (isTradeRequestCardPart(part)) {
        const status = tradeStatuses.get(part.data.requestId)
        if (!status || part.data.status === status) return part
        changed = true
        return {
          ...part,
          data: {
            ...part.data,
            status,
          },
        }
      }

      const p = part as { state?: string; approval?: { id?: string } }
      if (p?.state !== 'approval-requested' || !p?.approval?.id) return part
      const approved = resolved.get(p.approval.id)
      if (approved === undefined) return part
      changed = true
      // Preserve every existing field — state, approval, input, type — and
      // only attach the non-SDK historical marker. No fake output, no state
      // transition.
      return {
        ...part,
        [HISTORICAL_APPROVAL_KEY]: { approved },
      }
    })
    if (!changed) return m
    return { ...m, parts: nextParts as UIMessage['parts'] }
  })
}

export async function hasPriorApproval(
  supabase: SupabaseClient,
  approvalId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('approval_events')
    .select('approval_id')
    .eq('approval_id', approvalId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return !!data
}

// Debounced checkpoint writer. One instance per streamText call.
export function makeCheckpointWriter(
  supabase: SupabaseClient,
  args: { conversationId: string; messageId: string; minIntervalMs?: number }
) {
  const minInterval = args.minIntervalMs ?? 500
  let lastWrite = 0
  let pending: Promise<void> | null = null
  let latestParts: UIMessage['parts'] | null = null

  const writeNow = async () => {
    if (!latestParts) return
    const parts = latestParts
    latestParts = null
    lastWrite = Date.now()
    await checkpointAssistant(supabase, {
      conversationId: args.conversationId,
      messageId: args.messageId,
      parts,
    })
  }

  return {
    write: (parts: UIMessage['parts']) => {
      latestParts = parts
      const now = Date.now()
      if (pending) return pending
      if (now - lastWrite < minInterval) {
        pending = new Promise<void>((resolve) => {
          setTimeout(async () => {
            pending = null
            try {
              await writeNow()
            } catch (err) {
              console.error('[nic-nac] checkpoint failed:', err)
            }
            resolve()
          }, minInterval - (now - lastWrite))
        })
        return pending
      }
      pending = writeNow().finally(() => {
        pending = null
      })
      return pending
    },
    flush: async () => {
      if (pending) await pending
      if (latestParts) await writeNow()
    },
  }
}
