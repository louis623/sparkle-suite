import { renderCustomerFaq } from '@/lib/amethyst/customer-faq'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
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
  if (!validatePublicSiteSlug(slug).ok) return new Response('Not found', { status: 404 })

  const rep = await resolveAmethystPreviewRep(createAdminClient(), {
    publicSiteSlug: slug,
    select: 'id',
  })
  if (!rep) return new Response('Not found', { status: 404 })
  return renderCustomerFaq(request, { repId: rep.id, publicSiteSlug: slug })
}
