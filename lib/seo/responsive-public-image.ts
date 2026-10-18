/**
 * Browser-facing srcset for rep and pantry photos.
 * Customer-site JSX is not a Next component, so it calls the same
 * /_next/image optimizer next/image uses (WebP or AVIF, sized widths).
 */

const OPTIMIZER_WIDTHS = [128, 256, 384, 640, 828, 1080, 1200, 1920] as const

export type ResponsivePublicImageOptions = {
  alt?: string
  sizes: string
  widths?: readonly number[]
  /** Above-the-fold photos. Everything else stays lazy. */
  eager?: boolean
  quality?: number
}

export type ResponsivePublicImageProps = {
  src: string
  alt: string
  decoding: 'async'
  loading: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low'
  srcSet?: string
  sizes?: string
}

function isOptimizablePublicImage(src: string) {
  if (src.startsWith('/') && !src.startsWith('//')) return true
  try {
    const url = new URL(src)
    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.supabase.co') &&
      url.pathname.includes('/storage/v1/object/public/')
    )
  } catch {
    return false
  }
}

function optimizerUrl(src: string, width: number, quality: number) {
  const params = new URLSearchParams()
  params.set('url', src)
  params.set('w', String(width))
  params.set('q', String(quality))
  return `/_next/image?${params.toString()}`
}

export function responsivePublicImage(
  src: string | null | undefined,
  options: ResponsivePublicImageOptions,
): ResponsivePublicImageProps {
  const alt = options.alt ?? ''
  const loading = options.eager ? 'eager' : 'lazy'
  const cleaned = src?.trim() ?? ''
  if (!cleaned || !isOptimizablePublicImage(cleaned)) {
    return { src: cleaned, alt, decoding: 'async', loading }
  }

  const quality = options.quality ?? 75
  const widths = (options.widths ?? (options.eager ? [640, 828, 1200, 1920] : [384, 640, 828]))
    .filter((width) => OPTIMIZER_WIDTHS.includes(width as (typeof OPTIMIZER_WIDTHS)[number]))
    .sort((left, right) => left - right)
  const chosen = widths.length > 0 ? widths : [640]
  const largest = chosen[chosen.length - 1]

  return {
    src: optimizerUrl(cleaned, largest, quality),
    srcSet: chosen.map((width) => `${optimizerUrl(cleaned, width, quality)} ${width}w`).join(', '),
    sizes: options.sizes,
    alt,
    decoding: 'async',
    loading,
    fetchPriority: options.eager ? 'high' : 'low',
  }
}
