import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '@/lib/supabase/admin'

async function main() {
  const convId = process.argv[2]
  if (!convId) { console.error('Usage: tsx scripts/dump-conv.ts <conversationId>'); process.exit(1) }
  const admin = createAdminClient()
  const { data } = await admin
    .from('thumper_conversations')
    .select('message_id, role, status, parts, created_at')
    .eq('conversation_id', convId)
    .order('created_at')
  console.log(JSON.stringify(data, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
