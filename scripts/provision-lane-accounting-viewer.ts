/**
 * Creates the non-customer identity used only by the narrowly scoped
 * Control Center accounting viewer. The credential itself is supplied through
 * environment variables and is never printed or stored in the repository.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'node:path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const email = (process.env.CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAIL ?? '').trim().toLowerCase()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !supabaseUrl || !serviceRoleKey) {
  throw new Error('The accounting-viewer email and local Supabase service credentials are required.')
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw new Error(`Could not inspect existing viewer identity: ${listError.message}`)
  let authUser = listed.users.find((user) => user.email?.trim().toLowerCase() === email) ?? null
  let createdAuthUser = false

  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error(`Could not create accounting-viewer identity: ${error?.message ?? 'no user returned'}`)
    authUser = data.user
    createdAuthUser = true
  }

  const { data: existingRep, error: lookupError } = await admin
    .from('reps')
    .select('id, auth_user_id')
    .eq('email', email)
    .maybeSingle()
  if (lookupError) throw new Error(`Could not inspect accounting-viewer record: ${lookupError.message}`)

  if (existingRep && existingRep.auth_user_id !== authUser.id) {
    throw new Error('Existing accounting-viewer record belongs to a different auth identity.')
  }

  let createdRep = false
  if (!existingRep) {
    const { error } = await admin.from('reps').insert({
      account_classification: 'demo',
      auth_user_id: authUser.id,
      business_name: 'Cheese accounting viewer',
      display_name: 'Cheese',
      email,
      status: 'active',
      template_id: 'default',
    })
    if (error) throw new Error(`Could not create accounting-viewer record: ${error.message}`)
    createdRep = true
  }

  console.log(JSON.stringify({ createdAuthUser, createdRep, email, ok: true }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Could not provision accounting viewer.')
  process.exitCode = 1
})
