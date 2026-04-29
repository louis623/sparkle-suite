// One-shot: create the vac-reader@neonrabbit.net Supabase Auth user.
//
// Run with:
//   $env:NEW_VAC_READER_PASSWORD = "<generated-password>"
//   npx tsx --env-file=.env.local scripts/create-vac-reader.ts
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local via
// node's --env-file flag. NEW_VAC_READER_PASSWORD comes from the shell session
// only (never written to disk in this repo).
//
// This account exists solely for the vac-case-reference site
// (C:\Users\louis\vac-case-reference) to authenticate server-side.
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.NEW_VAC_READER_PASSWORD

if (!url || !serviceKey || !password) {
  console.error(
    '[create-vac-reader] missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEW_VAC_READER_PASSWORD'
  )
  process.exit(1)
}

async function main() {
  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await admin.auth.admin.createUser({
    email: 'vac-reader@neonrabbit.net',
    password: password!,
    email_confirm: true,
    user_metadata: {
      purpose: 'vac-case-reference read-only site',
      created_at: new Date().toISOString(),
    },
  })
  if (error) {
    console.error('[create-vac-reader] FAIL:', error.message)
    process.exit(1)
  }
  console.log('[create-vac-reader] user created')
  console.log('  id:    ', data.user?.id)
  console.log('  email: ', data.user?.email)
}

main().catch((err) => {
  console.error('[create-vac-reader] unexpected error:', err)
  process.exit(1)
})
