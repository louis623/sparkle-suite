import { renderAmethystPublicAssetResponse } from '@/lib/amethyst/public-asset-response'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import {
  isBlingKitchenPantryAllowed,
  pantryNotFoundResponse,
} from '@/lib/bling-kitchen/pantry-access'
import { validatePublicSiteSlug } from '@/lib/public-site/show-link'
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
  if (!rep || !isBlingKitchenPantryAllowed({ publicSiteSlug: slug, repId: rep.id })) {
    return pantryNotFoundResponse()
  }

  return renderAmethystPublicAssetResponse(request, ['Pantry.html'], {
    repIdOverride: rep.id,
    canonicalPathOverride: `/${slug}/in-the-pantry`,
    publicSiteSlugOverride: slug,
  })
}
