import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaidNicNacContext, AuthError } from '@/lib/nic-nac/auth'
import { ServiceError } from '@/lib/services/errors'
import { getRepDashboard } from '@/lib/services/rep-dashboard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { repId, rep } = await getPaidNicNacContext()
    const dashboard = await getRepDashboard({
      supabase: createAdminClient(),
      repId,
      publicSiteSlug: rep.public_site_slug,
      timeZone: rep.time_zone,
    })
    return NextResponse.json(dashboard)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { code: error.code, error: error.userMessage },
        { status: error.statusCode },
      )
    }
    throw error
  }
}
