import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '@/lib/supabase/admin'

async function main() {
  const listingId = process.argv[2]
  const convId = process.argv[3]
  if (!listingId || !convId) {
    console.error('Usage: tsx scripts/verify-hitl.ts <listingId> <conversationId>')
    process.exit(1)
  }
  const admin = createAdminClient()
  const { data: l } = await admin
    .from('trade_listings')
    .select('id, status, removal_reason')
    .eq('id', listingId)
    .single()
  const { data: ae } = await admin
    .from('approval_events')
    .select('approval_id, tool_name, approved, created_at')
    .eq('conversation_id', convId)
  console.log('LISTING:', JSON.stringify(l, null, 2))
  console.log('APPROVAL_EVENTS:', JSON.stringify(ae, null, 2))
  // Restore
  await admin
    .from('trade_listings')
    .update({ status: 'available', removal_reason: null, updated_at: new Date().toISOString() })
    .eq('id', listingId)
  console.log('RESTORED')
}
main().catch((e) => { console.error(e); process.exit(1) })
