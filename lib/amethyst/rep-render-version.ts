import {resolveAmethystRequestTarget} from './request-rep-target'
import {resolveAmethystPreviewRep} from './preview-rep'
import {createAdminClient} from '@/lib/supabase/admin'
import {validatePublicSiteSlug} from '@/lib/public-site/show-link'

export function repRenderV2Enabled(slug: string | null | undefined, allowlist = process.env.REP_RENDER_V2_SLUGS) {
  const entries=(allowlist ?? '').split(/[\s,]+/).map(value=>value.trim().toLowerCase()).filter(Boolean)
  if(entries.includes('*'))return true
  const normalized=slug?.trim().toLowerCase()
  return !!normalized&&validatePublicSiteSlug(normalized).ok&&entries.includes(normalized)
}

/** Overrides come from the server's verified slug route, never an HTTP header. */
export async function shouldUseRepRenderV2(request: Request, options: {publicSiteSlugOverride?:string|null;repIdOverride?:string|null} = {}) {
  if(!process.env.REP_RENDER_V2_SLUGS?.trim())return false
  if(repRenderV2Enabled(null))return true
  if(options.publicSiteSlugOverride)return repRenderV2Enabled(options.publicSiteSlugOverride)
  const target=resolveAmethystRequestTarget(request)
  const identity=options.repIdOverride||target.repId||target.customDomain
  if(!identity)return repRenderV2Enabled(target.publicSiteSlug)
  // Do not trust a query slug supplied alongside another rep's ID. Resolve the
  // actual public slug for ID/custom-domain requests; a failed lookup is V1.
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)return false
  try {
    const rep=await resolveAmethystPreviewRep(createAdminClient(),{repId:identity,select:'id,email,public_site_slug'})
    return repRenderV2Enabled(rep?.public_site_slug)
  }catch{return false}
}
