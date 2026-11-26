import { AuthError } from '@/lib/nic-nac/auth'
import { renderSignedInSitePreview } from '@/lib/amethyst/site-preview'
import { ServiceError } from '@/lib/services/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRIVATE_HEADERS = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
}

export async function GET(request: Request) {
  try {
    return await renderSignedInSitePreview(request)
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(null, { status: 401, headers: PRIVATE_HEADERS })
    }
    if (error instanceof ServiceError) {
      return new Response(null, { status: error.statusCode, headers: PRIVATE_HEADERS })
    }
    throw error
  }
}
