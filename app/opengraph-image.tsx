import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'

import { getCustomerSiteBrandAssetContext } from '@/lib/amethyst/customer-site-brand-assets'
import { getCustomerSiteBrandImageFonts } from '@/lib/amethyst/customer-site-brand-fonts'
import { loadCustomerSiteBrandImageDataUri } from '@/lib/amethyst/customer-site-brand-image-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const alt =
  'Sparkle Suite: a polished website for your live-selling business.'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  const brand = await getCustomerSiteBrandAssetContext(await headers())
  const fonts = await getCustomerSiteBrandImageFonts(brand)
  if (brand) {
    const markSrc = brand.markAssetPath
      ? await loadCustomerSiteBrandImageDataUri(brand.markAssetPath)
      : null

    if (brand.preset === 'gnome_garden') {
      const [forestSrc, gnomeSrc, lanternSrc] = await Promise.all([
        loadCustomerSiteBrandImageDataUri(
          '/customer-site-assets/goforthebling-gnome-forest-share-forest.jpg',
        ),
        loadCustomerSiteBrandImageDataUri(
          '/customer-site-assets/goforthebling-gnome-forest-share-gnome.png',
        ),
        loadCustomerSiteBrandImageDataUri(
          '/customer-site-assets/goforthebling-gnome-forest-share-lantern.png',
        ),
      ])

      return new ImageResponse(
        (
          <div
            style={{
              background: brand.palette.background,
              color: '#422b20',
              display: 'flex',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              width: '100%',
            }}
          >
            <img
              alt=""
              height={800}
              src={forestSrc}
              style={{
                height: '100%',
                left: 0,
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                width: '100%',
              }}
              width={1200}
            />
            <div
              style={{
                background: 'linear-gradient(90deg, rgba(18,48,33,.18), rgba(8,29,20,.56))',
                bottom: 0,
                display: 'flex',
                left: 0,
                position: 'absolute',
                right: 0,
                top: 0,
              }}
            />
            <img alt="" height={300} src={lanternSrc} style={{ left: 26, position: 'absolute', top: -55 }} width={118} />
            <img alt="" height={300} src={lanternSrc} style={{ position: 'absolute', right: 22, top: -62, transform: 'scaleX(-1)' }} width={118} />
            <div
              style={{
                background: 'rgba(255, 246, 211, .96)',
                border: '5px solid #d99b27',
                borderRadius: 38,
                boxShadow: '0 24px 70px rgba(17, 32, 20, .38)',
                display: 'flex',
                flexDirection: 'column',
                height: 506,
                justifyContent: 'space-between',
                left: 72,
                padding: '42px 48px',
                position: 'absolute',
                top: 62,
                width: 760,
              }}
            >
              <div style={{ alignItems: 'center', color: '#842421', display: 'flex', fontFamily: 'Arial, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>
                <span style={{ background: '#d99b27', borderRadius: 99, display: 'flex', height: 10, marginRight: 14, width: 10 }} />
                Gnome Forest
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ color: '#4d2b22', display: 'flex', fontFamily: 'Playfair Display', fontSize: 66, fontWeight: 800, letterSpacing: -2, lineHeight: .98 }}>
                  {brand.businessName}
                </div>
                <div style={{ color: '#842421', display: 'flex', fontFamily: 'Playfair Display', fontSize: 33, fontWeight: 800, lineHeight: 1.08, maxWidth: 630 }}>
                  {brand.heroTitle || 'A little wonder, a lot of sparkle.'}
                </div>
                <div style={{ color: '#65483b', display: 'flex', fontFamily: 'Arial, sans-serif', fontSize: 23, lineHeight: 1.28, maxWidth: 640 }}>
                  {brand.heroSubtitle || brand.tagline || 'Follow along for live reveals, friendly faces, and a little everyday wonder.'}
                </div>
              </div>
              <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ background: '#842421', borderRadius: 999, color: '#fff7dc', display: 'flex', fontFamily: 'Arial, sans-serif', fontSize: 20, fontWeight: 700, padding: '13px 22px' }}>
                  {brand.customDomain}
                </div>
                {markSrc ? <img alt={`${brand.businessName} monogram`} height={76} src={markSrc} width={76} /> : null}
              </div>
            </div>
            <img
              alt=""
              height={510}
              src={gnomeSrc}
              style={{ bottom: -28, position: 'absolute', right: 82 }}
              width={277}
            />
          </div>
        ),
        { ...size, fonts },
      )
    }

    return new ImageResponse(
      (
        <div
          style={{
            background: brand.palette.background,
            color: brand.palette.foreground,
            display: 'flex',
            height: '100%',
            padding: 54,
            position: 'relative',
            width: '100%',
          }}
        >
          <div
            style={{
              background: `radial-gradient(circle at 84% 18%, ${brand.palette.accent}66, transparent 31%), linear-gradient(135deg, ${brand.palette.background}, #0f0d0e)`,
              bottom: 0,
              display: 'flex',
              left: 0,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />
          <div
            style={{
              border: `1px solid ${brand.palette.accent}99`,
              display: 'flex',
              height: '100%',
              justifyContent: 'space-between',
              padding: 52,
              position: 'relative',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', maxWidth: 700 }}>
              <div style={{ color: brand.palette.secondary, display: 'flex', fontFamily: 'Arial, sans-serif', fontSize: 20, letterSpacing: 4, textTransform: 'uppercase' }}>
                Live jewelry reveals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', fontFamily: 'Georgia, serif', fontSize: 78, fontWeight: 600, letterSpacing: -2, lineHeight: 0.98 }}>
                  {brand.businessName}
                </div>
                <div style={{ color: brand.palette.secondary, display: 'flex', fontFamily: 'Arial, sans-serif', fontSize: 28, lineHeight: 1.35 }}>
                  {brand.tagline || 'Follow along for live reveals, new favorites, and customer updates.'}
                </div>
              </div>
              <div style={{ color: brand.palette.secondary, display: 'flex', fontFamily: 'Arial, sans-serif', fontSize: 21 }}>
                {brand.customDomain}
              </div>
            </div>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'center', width: 300 }}>
              {markSrc ? (
                <img alt={`${brand.businessName} monogram`} height={252} src={markSrc} width={252} />
              ) : (
                <div style={{ alignItems: 'center', background: `linear-gradient(135deg, ${brand.palette.background}, ${brand.palette.accent})`, color: brand.palette.foreground, display: 'flex', fontFamily: brand.markFontFamily, fontSize: 190, fontWeight: 800, height: 252, justifyContent: 'center', width: 252 }}>
                  {brand.mark}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      { ...size, fonts },
    )
  }

  const [logo, preview] = await Promise.all([
    loadCustomerSiteBrandImageDataUri('/brand/sparkle-suite-logo-transparent.png'),
    loadCustomerSiteBrandImageDataUri('/marketing/demo-social-preview.jpg'),
  ])
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#34252f', color: '#f6e7da', padding: 48, gap: 44 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 510 }}>
          <div style={{ display: 'flex', background: 'white', borderRadius: 12, padding: '12px 20px', width: 330 }}>
            <img src={logo} alt="Sparkle Suite" width={290} height={74} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', fontFamily: 'Playfair Display', fontSize: 60, lineHeight: 1.08 }}>Your brand. Your show. A setup that shines.</div>
            <div style={{ display: 'flex', fontSize: 25, lineHeight: 1.4 }}>A polished website for your live-selling business.</div>
          </div>
          <div style={{ display: 'flex', color: '#ffd4ea', fontSize: 20 }}>yoursparklesuite.com</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', width: 550, border: '1px solid #ffd4ea', borderRadius: 18, overflow: 'hidden', background: '#fff6fa' }}>
          <div style={{ display: 'flex', padding: '16px 20px', background: '#36221d', fontSize: 18 }}>A website that feels like you</div>
          <img src={preview} alt="Sparkle Suite customer website example" width={550} height={490} style={{ objectFit: 'cover', objectPosition: 'top' }} />
        </div>
      </div>
    ),
    { ...size, fonts },
  )
}
