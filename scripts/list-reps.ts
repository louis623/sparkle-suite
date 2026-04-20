import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '@/lib/supabase/admin'

async function main() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reps')
    .select('id, email, display_name, status')
    .order('created_at', { ascending: false })
  if (error) throw error
  console.log(JSON.stringify(data, null, 2))
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
