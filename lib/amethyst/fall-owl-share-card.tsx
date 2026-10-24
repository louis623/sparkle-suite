/* eslint-disable @next/next/no-img-element -- Satori image responses render plain img elements. */
import type { CustomerSiteSharePalette } from './customer-site-brand-assets'

function channel(hex: string, offset: number) {
  return Number.parseInt(hex.slice(offset, offset + 2), 16)
}

function rgb(hex: string) {
  const normalized = hex.replace('#', '')
  return `${channel(normalized, 0)},${channel(normalized, 2)},${channel(normalized, 4)}`
}

export function FallOwlShareCard({
  businessName,
  customDomain,
  headline,
  markSrc,
  palette,
  sceneSrc,
  support,
  themeLabel,
}: {
  businessName: string
  customDomain: string
  headline: string
  markSrc: string | null
  palette: CustomerSiteSharePalette
  sceneSrc: string
  support: string
  themeLabel: string
}) {
  const veil = rgb(palette.background)
  const nameSize = businessName.length > 18 ? 50 : 58
  const headlineSize = support ? 34 : headline.length > 56 ? 32 : 40
  const headlineColor = support ? palette.accent : '#f6ead8'

  return (
    <div
      style={{
        background: palette.background,
        color: palette.foreground,
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      <img
        alt=""
        height={630}
        src={sceneSrc}
        style={{ left: 0, position: 'absolute', top: 0 }}
        width={1200}
      />
      <div
        style={{
          background: `linear-gradient(90deg, rgba(${veil},0.92) 0%, rgba(${veil},0.84) 28%, rgba(${veil},0.7) 50%, rgba(${veil},0.22) 62%, rgba(${veil},0) 72%)`,
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
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '52px 56px 46px 60px',
          position: 'relative',
          width: 700,
        }}
      >
        <div
          style={{
            alignItems: 'center',
            color: palette.accent,
            display: 'flex',
            fontFamily: 'Arial, sans-serif',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 3.5,
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              background: palette.accent,
              borderRadius: 99,
              display: 'flex',
              height: 10,
              marginRight: 14,
              width: 10,
            }}
          />
          {themeLabel}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Playfair Display',
              fontSize: nameSize,
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 0.96,
            }}
          >
            {businessName}
          </div>
          <div
            style={{
              color: headlineColor,
              display: 'flex',
              fontFamily: 'Playfair Display',
              fontSize: headlineSize,
              fontWeight: 800,
              lineHeight: 1.16,
              maxWidth: 590,
            }}
          >
            {headline}
          </div>
          {support ? (
            <div
              style={{
                color: palette.secondary,
                display: 'flex',
                fontFamily: 'Arial, sans-serif',
                fontSize: 24,
                lineHeight: 1.3,
                maxWidth: 570,
              }}
            >
              {support}
            </div>
          ) : null}
        </div>
        <div style={{ alignItems: 'center', display: 'flex' }}>
          <div
            style={{
              background: palette.accent,
              borderRadius: 999,
              color: palette.background,
              display: 'flex',
              fontFamily: 'Arial, sans-serif',
              fontSize: 20,
              fontWeight: 700,
              padding: '12px 22px',
            }}
          >
            {customDomain}
          </div>
          {markSrc ? (
            <img
              alt={`${businessName} monogram`}
              height={72}
              src={markSrc}
              style={{ marginLeft: 18 }}
              width={72}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
