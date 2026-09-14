import {
  renderSkinPreview,
  SKIN_PREVIEW_PAGES,
  SKIN_PREVIEW_SKINS,
  type SkinPreviewPage,
  type SkinPreviewSkin,
} from '@/lib/amethyst/skin-preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ skin: string; page: string }> }) {
  const { skin, page } = await params
  if (
    !SKIN_PREVIEW_SKINS.includes(skin as SkinPreviewSkin) ||
    !SKIN_PREVIEW_PAGES.includes(page as SkinPreviewPage)
  ) {
    return new Response('Not found', { status: 404 })
  }
  const origin = new URL(request.url).origin
  return new Response(await renderSkinPreview(skin as SkinPreviewSkin, page as SkinPreviewPage, origin), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
      // srcdoc inherits this policy; its own policy further denies nested frames.
      'Content-Security-Policy': `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'unsafe-inline' ${origin} https://fonts.googleapis.com https://api.fontshare.com; font-src ${origin} https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com data:; img-src ${origin} https: data: blob:; frame-src 'self' about:; connect-src 'none'; form-action 'none'; base-uri ${origin}; frame-ancestors 'self'; object-src 'none'`,
    },
  })
}
