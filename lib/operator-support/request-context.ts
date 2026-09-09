import 'server-only'

import { AsyncLocalStorage } from 'node:async_hooks'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { OperatorSupportSession, WorkspaceActor } from './types'

export type OperatorSupportRequestContext = {
  actor: Extract<WorkspaceActor, { mode: 'operator_support' }>
  session: OperatorSupportSession
  supabase: SupabaseClient
  targetRep: {
    id: string
    auth_user_id: string
    email: string
    display_name: string
    business_name: string
    stripe_customer_id: string | null
    public_site_slug: string | null
    custom_domain: string | null
    time_zone: string
    status: string
  }
}

const operatorSupportRequestStorage =
  new AsyncLocalStorage<OperatorSupportRequestContext>()

export function getOperatorSupportRequestContext() {
  return operatorSupportRequestStorage.getStore() ?? null
}

export function runWithOperatorSupportRequestContext<T>(
  context: OperatorSupportRequestContext,
  callback: () => T,
) {
  return operatorSupportRequestStorage.run(context, callback)
}
