import 'server-only'
import { createClient } from '@supabase/supabase-js'

// A single budget covers all database and storage calls in the batch, including stalled responses.
export function createMaintenanceClient(deadline: number) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const remaining = deadline - Date.now()
        if (remaining <= 0) throw new Error('Maintenance deadline reached')
        const timer = AbortSignal.timeout(remaining)
        const signal = init?.signal ? AbortSignal.any([timer, init.signal]) : timer
        return fetch(input, { ...init, signal })
      },
    },
  })
}
