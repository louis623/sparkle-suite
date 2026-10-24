// Persistence helpers for Nic-Nac conversations. Layered defensive pattern:
//   1. Insert user message with ON CONFLICT DO NOTHING (idempotent on retry).
//   2. Reserve assistant row as 'pending' BEFORE streamText starts.
//   3. Checkpoint parts into the reserved row from onStepFinish + onChunk
//      (debounced) so an aborted stream leaves durable partial state.
//   4. onFinish → status='complete'. onError or consumeSseStream error →
//      status='aborted'. Final flush preserves whatever was checkpointed.

import type { SupabaseClient } from '@supabase/supabase-js'
import { messageCreatedAt } from '@/lib/nic-nac/message-order'
import type { UIMessage } from 'ai'
import { isTradeRequestCardPart } from '@/lib/nic-nac/trade-request-card-parts'
import {
  recentConversationsFromRows,
  type RecentConversationSummary,
} from '@/lib/nic-nac/recent-conversations'
import type { TradeRequestStatus } from '@/lib/services/types'

export async function loadCanonicalHistory(
  supabase: SupabaseClient,
  conversationId: string,
  options?: { includeCleared?: boolean },
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
  if (!options?.includeCleared && (data ?? []).some((row) => row.cleared_at)) return []

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

const RECENT_PAGE = 100
const RECENT_CONVERSATION_CAP = 8

async function earliestUserLines(
  supabase: SupabaseClient,
  repId: string,
  conversationId: string,
): Promise<Array<{ parts?: unknown; created_at?: string | null }>> {
  const { data, error } = await supabase
    .from('nic_nac_conversations')
    .select('parts, created_at')
    .eq('rep_id', repId)
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .order('created_at', { ascending: true })
    .limit(8)
  if (error) throw error
  return data ?? []
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
  const discovered: Array<{ id: string; latestAt: string }> = []
  const seen = new Set<string>()
  for (
    let pageNumber = 0;
    pageNumber < RECENT_CONVERSATION_CAP && discovered.length < RECENT_CONVERSATION_CAP;
    pageNumber += 1
  ) {
    let query = supabase
      .from('nic_nac_conversations')
      .select('conversation_id, created_at')
      .eq('rep_id', repId)
    // Skip already discovered chats rather than exhausting a row cap on one
    // long chat and incorrectly reporting that no other conversations exist.
    for (const id of seen) query = query.neq('conversation_id', id)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(0, RECENT_PAGE - 1)
    if (error) throw error
    const page = data ?? []
    for (const row of page) {
      const id = (row.conversation_id as string | null | undefined)?.trim()
      const createdAt = (row.created_at as string | null | undefined)?.trim()
      if (!id || !createdAt || seen.has(id)) continue
      seen.add(id)
      discovered.push({ id, latestAt: createdAt })
    }
    if (page.length < RECENT_PAGE) break
  }

  const titled = await Promise.all(
    discovered.slice(0, RECENT_CONVERSATION_CAP).map(async (item) => {
      const users = await earliestUserLines(supabase, repId, item.id)
      return { item, users }
    }),
  )
  const rows: Array<{
    conversation_id: string
    role: string
    parts: unknown
    created_at: string
  }> = []
  for (const { item, users } of titled) {
    const startedAt =
      (users[0]?.created_at as string | null | undefined)?.trim() || item.latestAt
    for (const user of users) {
      const createdAt = (user.created_at as string | null | undefined)?.trim()
      if (!createdAt) continue
      rows.push({
        conversation_id: item.id,
        role: 'user',
        parts: user.parts,
        created_at: createdAt,
      })
    }
    if (!users.length) {
      rows.push({
        conversation_id: item.id,
        role: 'user',
        parts: [],
        created_at: startedAt,
      })
    }
    if (item.latestAt !== startedAt) {
      rows.push({
        conversation_id: item.id,
        role: 'assistant',
        parts: [],
        created_at: item.latestAt,
      })
    }
  }
  return recentConversationsFromRows(rows, limit, options)
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

/**
 * Clear starts a new empty chat. The chat that was open stays in Recent, so
 * it is not marked cleared. A pending marker makes the new chat the latest.
 */
export async function clearNicNacConversationChain(
  supabase: SupabaseClient,
  _admin: SupabaseClient,
  repId: string,
  conversationId: string,
  nextConversationId: string,
): Promise<string[]> {
  const nextId = nextConversationId.trim()
  if (nextId && nextId !== conversationId) {
    await reserveAssistantMessage(supabase, {
      conversationId: nextId,
      repId,
      messageId: `fresh-start-${nextId}`,
    })
  }
  return []
}

/** The newest chat this one rolled into, or null when this chat is current. */
export async function findForwardRolloverDestination(
  supabase: SupabaseClient,
  repId: string,
  conversationId: string,
): Promise<string | null> {
  try {
    let current = conversationId
    const seen = new Set<string>()
    for (let hop = 0; hop < 8; hop += 1) {
      if (seen.has(current)) break
      seen.add(current)
      const { data, error } = await supabase
        .from('nic_nac_rollovers')
        .select('destination_conversation_id')
        .eq('rep_id', repId)
        .eq('source_conversation_id', current)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error || !Array.isArray(data) || data.length === 0) break
      const next = (data[0] as { destination_conversation_id?: string })
        .destination_conversation_id?.trim()
      if (!next || next === current) break
      current = next
    }
    return current !== conversationId ? current : null
  } catch {
    return null
  }
}

export async function insertUserMessage(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    repId: string
    messageId: string
    parts: UIMessage['parts']
    receivedAt?: string
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
      created_at: args.receivedAt ?? new Date().toISOString(),
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
    args.messages.map((message, index) => {
      const createdAt = messageCreatedAt(message)
      return {
        conversation_id: args.conversationId,
        message_id: message.id,
        rep_id: args.repId,
        role: message.role,
        parts: message.parts ?? [],
        status: 'complete',
        created_at: createdAt ?? new Date(Date.now() + index).toISOString(),
      }
    }),
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
    claimSubmission?: boolean
  }
): Promise<boolean> {
  const query = supabase.from('nic_nac_conversations').upsert(
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
  const { data, error } = args.claimSubmission ? await query.select('message_id') : await query
  if (error) throw error
  if (!args.claimSubmission || (data?.length ?? 0) > 0) return true
  // Only an explicitly failed run may be retried. A slow/pending run is never
  // stolen on a timer; a second request cannot execute its tools again.
  const retry = await supabase.from('nic_nac_conversations')
    .update({ status: 'pending', parts: [], updated_at: new Date().toISOString() })
    .eq('conversation_id', args.conversationId).eq('message_id', args.messageId)
    .eq('rep_id', args.repId).eq('status', 'aborted').select('message_id')
  if (retry.error) throw retry.error
  return (retry.data?.length ?? 0) > 0
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
  const messages = await loadCanonicalHistory(supabase, conversationId, { includeCleared: true })

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
