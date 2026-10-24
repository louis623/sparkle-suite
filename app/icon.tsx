import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'

import {
  getCustomerSiteBrandAssetContext,
  getCustomerSiteMarkIconBackground,
} from '@/lib/amethyst/customer-site-brand-assets'
import { getCustomerSiteBrandImageFonts } from '@/lib/amethyst/customer-site-brand-fonts'
import { loadCustomerSiteBrandImageDataUri } from '@/lib/amethyst/customer-site-brand-image-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const size = {
  width: 192,
  height: 192,
}

export const contentType = 'image/png'

export default async function Icon() {
  const brand = await getCustomerSiteBrandAssetContext(await headers())
  const fonts = await getCustomerSiteBrandImageFonts(brand)
  if (brand?.markAssetPath) {
    const markSrc = await loadCustomerSiteBrandImageDataUri(brand.markAssetPath)

    return new ImageResponse(
      <div
        style={{
          alignItems: 'center',
          background: getCustomerSiteMarkIconBackground(brand.markAssetPath),
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <img alt={`${brand.businessName} monogram`} height={192} src={markSrc} width={192} />
      </div>,
      { ...size, fonts },
    )
  }

  if (brand) {
    return new ImageResponse(
      (
        <div
          style={{
            alignItems: 'center',
            background: `linear-gradient(135deg, ${brand.palette.background}, ${brand.palette.accent})`,
            color: brand.palette.foreground,
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <span
            style={{
              display: 'flex',
              fontFamily: brand.markFontFamily,
              fontSize: 150,
              fontWeight: 800,
              lineHeight: 1,
              transform: 'translateY(-4px)',
            }}
          >
            {brand.mark}
          </span>
        </div>
      ),
      { ...size, fonts },
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'transparent',
          color: '#ee2c9b',
          display: 'flex',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 104,
          height: '100%',
          justifyContent: 'center',
          lineHeight: 1,
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: '#ffffff',
            border: '3px solid #ee2c9b',
            borderRadius: '999px',
            display: 'flex',
            height: 168,
            justifyContent: 'center',
            width: 168,
          }}
        >
          <span
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              transform: 'skewX(-10deg) translateY(7px)',
            }}
          >
            S
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  )
}
