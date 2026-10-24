import 'server-only'
import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/** A streamed preview can be visible before onFinish commits its assistant row.
 * Wait for that exact server-owned reply; client preview parts never authorize a save.
 */
export async function waitForPendingPhotoReply(
  supabase: SupabaseClient,
  args: { repId: string; conversationId: string; photoMessageId: string },
): Promise<boolean> {
  const replyId = 'reply-' + createHash('sha256').update(args.conversationId + ':' + args.photoMessageId).digest('hex')
  const deadline = Date.now() + 20_000
  while (true) {
    const { data, error } = await supabase.from('nic_nac_conversations')
      .select('status').eq('rep_id', args.repId).eq('conversation_id', args.conversationId)
      .eq('message_id', replyId).eq('role', 'assistant').maybeSingle()
    if (error) return false
    if (data?.status === 'complete') return true
    if (data?.status !== 'pending' || Date.now() >= deadline) return false
    await new Promise(resolve => setTimeout(resolve, 250))
  }
}
