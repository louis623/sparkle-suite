import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '@/lib/supabase/admin'

async function main() {
  const admin = createAdminClient()
  const { data, count, error } = await admin
    .from('jewelry_designs')
    .select('item_number, design_name', { count: 'exact' })
    .limit(50)
  if (error) throw error
  console.log('total count:', count)
  console.log('first rows:', (data ?? []).map((d) => d.item_number))
}
main().catch((e) => { console.error(e); process.exit(1) })
