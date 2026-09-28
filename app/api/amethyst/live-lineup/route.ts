import { NextResponse } from 'next/server'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { buildPublicLiveLineup, requestedLineupPresentation } from '@/lib/amethyst/public-live-lineup'
import { getEffectiveLiveQueueSnapshot } from '@/lib/live-lineup/service'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function lineupJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
}

export async function GET(request: Request) {
  const target = resolveAmethystRequestTarget(request)
  if (!target.targeted) return lineupJson({ error: 'not_found' }, 404)
  try {
    const admin = createAdminClient()
    const rep = await resolveAmethystPreviewRep(admin, {
      repId: target.repId ?? target.customDomain,
      publicSiteSlug: target.publicSiteSlug,
      select: 'id, email, public_site_slug', strict: true,
    })
    if (!rep) {
      return lineupJson({ error: 'not_found' }, 404)
    }
    const snapshot = await getEffectiveLiveQueueSnapshot(admin, rep.id)
    if (!snapshot) return lineupJson({ error: 'temporarily_unavailable' }, 503)
    return lineupJson(buildPublicLiveLineup(snapshot, requestedLineupPresentation(request)))
  } catch {
    return lineupJson({ error: 'temporarily_unavailable' }, 503)
  }
}
