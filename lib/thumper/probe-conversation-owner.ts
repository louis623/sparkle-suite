// Admin-client ownership probe for /api/thumper. Extracted from spike route
// (lines 85-92). MUST use admin client — an RLS-filtered client returns null
// for cross-tenant conversations (red-team attack #7), which would silently
// let a rep inject into another rep's conversationId.

import { createAdminClient } from '@/lib/supabase/admin'
import { getConversationOwner } from '@/lib/thumper/persistence'

export async function probeConversationOwner(conversationId: string): Promise<string | null> {
  const adminSupabase = createAdminClient()
  return getConversationOwner(adminSupabase, conversationId)
}
