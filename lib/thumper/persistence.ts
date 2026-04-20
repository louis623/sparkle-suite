// Persistence helpers for Thumper conversations. Layered defensive pattern:
//   1. Insert user message with ON CONFLICT DO NOTHING (idempotent on retry).
//   2. Reserve assistant row as 'pending' BEFORE streamText starts.
//   3. Checkpoint parts into the reserved row from onStepFinish + onChunk
//      (debounced) so an aborted stream leaves durable partial state.
//   4. onFinish → status='complete'. onError or consumeSseStream error →
//      status='aborted'. Final flush preserves whatever was checkpointed.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UIMessage } from 'ai'

export async function loadCanonicalHistory(
  supabase: SupabaseClient,
  conversationId: string
): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from('thumper_conversations')
    .select('message_id, role, parts, status, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  // Drop pending (mid-stream) and aborted (failed) assistant rows from the
  // canonical view fed to the model — they'd surface as empty assistant
  // turns. The GET /conversation/[id] route reports them separately for UI
  // visibility; only the model should skip them.
  return (data ?? [])
    .filter((row) => row.role === 'user' || row.status === 'complete')
    .map((row) => ({
      id: row.message_id as string,
      role: row.role as 'user' | 'assistant',
      parts: row.parts as UIMessage['parts'],
    }))
}

export async function getConversationOwner(
  supabase: SupabaseClient,
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('thumper_conversations')
    .select('rep_id')
    .eq('conversation_id', conversationId)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data?.rep_id as string | undefined) ?? null
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
  const { error } = await supabase.from('thumper_conversations').upsert(
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

export async function reserveAssistantMessage(
  supabase: SupabaseClient,
  args: {
    conversationId: string
    repId: string
    messageId: string
  }
): Promise<void> {
  const { error } = await supabase.from('thumper_conversations').upsert(
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
    .from('thumper_conversations')
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
    .from('thumper_conversations')
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
    .from('thumper_conversations')
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
              console.error('[thumper] checkpoint failed:', err)
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
