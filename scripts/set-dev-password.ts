// Dev-only: sets a known password on an existing rep's auth.users row so we
// can signInWithPassword from the spike harness. Not for prod use.

import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '@/lib/supabase/admin'

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/set-dev-password.ts <email> <password>')
    process.exit(1)
  }
  const admin = createAdminClient()
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listErr) throw listErr
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) throw new Error(`No auth user for email ${email}`)
  const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })
  if (updErr) throw updErr
  console.log(`[set-dev-password] updated user ${user.id} (${email})`)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
