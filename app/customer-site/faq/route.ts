import { renderCustomerFaq } from '@/lib/amethyst/customer-faq'
import { resolveAmethystPreviewRep } from '@/lib/amethyst/preview-rep'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const customerDomain = new URL(request.url).searchParams.get('c')?.trim()
  if (!customerDomain) return new Response('Not found', { status: 404 })

  const rep = await resolveAmethystPreviewRep(createAdminClient(), {
    repId: customerDomain,
    select: 'id',
  })
  if (!rep) return new Response('Not found', { status: 404 })
  return renderCustomerFaq(request, { repId: rep.id, customDomain: true })
}
