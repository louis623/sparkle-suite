import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '@/lib/supabase/admin'

async function main() {
  const convId = process.argv[2]
  if (!convId) { console.error('Usage: tsx scripts/clean-conv.ts <conversationId>'); process.exit(1) }
  const admin = createAdminClient()
  await admin.from('thumper_conversations').delete().eq('conversation_id', convId)
  await admin.from('approval_events').delete().eq('conversation_id', convId)
  console.log('cleaned', convId)
}
main().catch((e) => { console.error(e); process.exit(1) })
