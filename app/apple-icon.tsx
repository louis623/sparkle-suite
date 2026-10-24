import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'

import {
  getCustomerSiteAppleMarkAssetPath,
  getCustomerSiteBrandAssetContext,
} from '@/lib/amethyst/customer-site-brand-assets'
import { loadCustomerSiteBrandImageDataUri } from '@/lib/amethyst/customer-site-brand-image-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default async function AppleIcon() {
  const brand = await getCustomerSiteBrandAssetContext(await headers())
  const markPath = brand ? getCustomerSiteAppleMarkAssetPath(brand.customDomain) : null
  if (markPath) {
    const markSrc = await loadCustomerSiteBrandImageDataUri(markPath)

    return new ImageResponse(
      (
        <div
          style={{
            background: '#201321',
            display: 'flex',
            height: '100%',
            width: '100%',
          }}
        >
          <img
            alt={`${brand?.businessName ?? 'Customer site'} monogram`}
            height={180}
            src={markSrc}
            width={180}
          />
        </div>
      ),
      { ...size },
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
          fontSize: 98,
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
            height: 158,
            justifyContent: 'center',
            width: 158,
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
    },
  )
}
