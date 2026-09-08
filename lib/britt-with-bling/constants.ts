export const BRITT_WITH_BLING_PUBLIC_SITE_SLUG = 'brittwithbling'

export const BRITT_WITH_BLING_SHOWCASE_VIDEO_URL =
  'https://www.tiktok.com/embed/7602795836380073229'

export const BRITT_WITH_BLING_ABOUT_PORTRAIT_URL =
  'https://www.yoursparklesuite.com/britt-with-bling/hero.jpeg'

export function isBrittWithBlingPublicSiteSlug(value?: string | null) {
  return value?.trim().toLowerCase() === BRITT_WITH_BLING_PUBLIC_SITE_SLUG
}
