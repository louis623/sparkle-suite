import { buildHomepageBootstrapResponse } from '@/lib/amethyst/homepage-bootstrap-response'
import {shouldUseRepRenderV2} from '@/lib/amethyst/rep-render-version'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  if(!(await shouldUseRepRenderV2(request))){
    const {buildLegacyHomepageBootstrapResponse}=await import('@/lib/amethyst/legacy/homepage-bootstrap-response')
    return buildLegacyHomepageBootstrapResponse(request)
  }
  return buildHomepageBootstrapResponse(request)
}
