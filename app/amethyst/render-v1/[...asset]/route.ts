import {legacyStaticAssetResponse,withLegacyStaticAssets} from '@/lib/amethyst/legacy-assets'
import {renderAmethystPublicAssetResponse} from '@/lib/amethyst/legacy/public-asset-response'

export const runtime='nodejs'
export async function GET(request:Request,{params}:{params:Promise<{asset:string[]}>}) {
  const {asset}=await params
  // HTML retains the pinned renderer's metadata, targeting and page-access
  // guards. Never expose an unguarded raw HTML snapshot as a public rep page.
  if(asset.length===1&&asset[0].endsWith('.html'))return withLegacyStaticAssets(await renderAmethystPublicAssetResponse(request,asset))
  return legacyStaticAssetResponse(asset,request)
}
