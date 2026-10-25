import { buildHomepageBootstrapResponse } from '@/lib/amethyst/homepage-bootstrap-response'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  return buildHomepageBootstrapResponse(request)
}
