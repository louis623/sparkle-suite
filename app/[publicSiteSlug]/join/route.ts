import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'
import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { validatePublicSiteSlug } from '@/lib/public-site/show-link'
import { canonicalizeSparkleCrawlOrigin } from '@/lib/seo/sparkle-crawl'
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
    select: 'id, email, custom_domain',
  })
  if (!rep) return new Response('Not found', { status: 404 })
  const settings = await getSiteSettingsDashboard(admin, rep.id)
  if (!settings.showJoinPage) {
    return new Response('Not found', { status: 404 })
  }

  const customHost = normalizeAmethystCustomDomainCandidate(rep.custom_domain)
  const customOrigin = customHost
    ? canonicalizeSparkleCrawlOrigin(`https://${customHost}`)
    : null

  return renderAmethystPublicAssetResponse(request, ['Join.html'], {
    repIdOverride: rep.id,
    canonicalPathOverride: customOrigin ? '/join' : `/${slug}/join`,
    ...(customOrigin ? { canonicalOriginOverride: customOrigin } : {}),
    publicSiteSlugOverride: slug,
    joinVisibilityVerified: true,
  })
}
