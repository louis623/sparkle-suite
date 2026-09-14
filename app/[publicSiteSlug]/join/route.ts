import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { validatePublicSiteSlug } from '@/lib/public-site/show-link'
import { getSiteSettingsDashboard } from '@/lib/services/site-settings'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicSiteSlug: string }> },
) {
  const { publicSiteSlug } = await params
  const slug = publicSiteSlug.trim().toLowerCase()
  if (!validatePublicSiteSlug(slug).ok) {
    return new Response('Not found', { status: 404 })
  }

  const admin = createAdminClient()
  const rep = await resolveAmethystPreviewRep(admin, {
    publicSiteSlug: slug,
    select: 'id, email',
  })
  if (!rep) return new Response('Not found', { status: 404 })
  const settings = await getSiteSettingsDashboard(admin, rep.id)
  if (!settings.showJoinPage) {
    return new Response('Not found', { status: 404 })
  }

  return renderAmethystPublicAssetResponse(request, ['Join.html'], {
    repIdOverride: rep.id,
    canonicalPathOverride: `/${slug}/join`,
    publicSiteSlugOverride: slug,
    joinVisibilityVerified: true,
  })
}
