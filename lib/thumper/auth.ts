// Composes the existing getAuthenticatedRep() helper with a fresh SSR Supabase
// client bound to the same request cookies. Returns { repId, rep, supabase }
// so tools and services can run against the authed client and have RLS
// enforce ownership (Phase 1 Task 1.0 spike plan Finding 1).

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthenticatedRep, AuthError } from '@/lib/supabase/auth'

export interface ThumperAuthContext {
  repId: string
  rep: {
    id: string
    auth_user_id: string
    email: string
    display_name: string
    stripe_customer_id: string | null
  }
  supabase: SupabaseClient
}

export async function getAuthenticatedThumperContext(): Promise<ThumperAuthContext> {
  // getAuthenticatedRep already validates session and resolves repId via an
  // admin client (reps RLS prohibits anon SELECT). We reuse that, then build
  // an independent authed client for tool/service queries against RLS-scoped
  // tables (trade_listings, trade_requests, thumper_conversations, etc.).
  const { repId, rep } = await getAuthenticatedRep()

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only path for tool/service usage.
        },
      },
    }
  )

  return { repId, rep, supabase }
}

export { AuthError }
