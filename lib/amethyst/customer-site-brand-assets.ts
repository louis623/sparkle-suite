import {
  getAmethystAppearancePreset,
  type AmethystAppearancePresetId,
} from './appearance-presets'
import { resolveAmethystRequestCustomDomainHost } from './host-routing'
import { loadAmethystPreviewTemplateData } from './preview-template-data'

export interface CustomerSiteSharePalette {
  background: string
  foreground: string
  secondary: string
  accent: string
}

export interface CustomerSiteBrandAssetContext {
  businessName: string
  customDomain: string
  heroSubtitle: string
  heroTitle: string
  mark: string
  markAssetPath: string | null
  markFontFamily: string
  palette: CustomerSiteSharePalette
  preset: AmethystAppearancePresetId
  tagline: string
}

const BRI_CUSTOM_DOMAINS = new Set(['brisglowtique.com', 'www.brisglowtique.com'])
const KIM_CUSTOM_DOMAINS = new Set(['goforthebling.com', 'www.goforthebling.com'])

const SHARE_BACKGROUNDS: Partial<Record<AmethystAppearancePresetId, string>> = {
  amethyst: '#2b155c',
  sparkle_suite_morganite: '#5b1e3b',
  black_diamond: '#161313',
  moonstone: '#272938',
  emerald_garden: '#123c35',
  gnome_garden: '#173a28',
  rose_gold: '#54202f',
  rose_champagne: '#54202f',
  midnight_rose: '#180e16',
  pearl_rose: '#5a2e39',
  garnet: '#4a1218',
  velvet: '#321142',
}

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, ' ').trim() || ''
}

export function getCustomerSiteShareTagline(tagline: string | null | undefined) {
  const cleaned = cleanText(tagline)
  const genericLiveShowMatch = cleaned.match(/^Welcome to (.+?) Live Show site\.?$/i)

  return genericLiveShowMatch
    ? `Welcome to ${genericLiveShowMatch[1]}'s Live Show Site.`
    : cleaned
}

export function getCustomerSiteSharePalette(
  preset: AmethystAppearancePresetId,
): CustomerSiteSharePalette {
  const appearance = getAmethystAppearancePreset(preset)
  const background = SHARE_BACKGROUNDS[preset] ?? '#21191d'

  if (preset === 'gnome_garden') {
    return {
      background,
      foreground: '#fff7dc',
      secondary: '#f4dfb4',
      accent: appearance.values.primaryColor,
    }
  }

  return {
    background,
    foreground: '#fffdfb',
    secondary: '#f4e9e4',
    accent: appearance.values.primaryColor,
  }
}

export function getCustomerSiteMark(
  businessName: string | null | undefined,
  fallbackName: string | null | undefined,
) {
  const source = cleanText(businessName) || cleanText(fallbackName) || 'S'
  const letter = Array.from(source).find((character) => /[\p{L}\p{N}]/u.test(character))
  return letter?.toLocaleUpperCase() ?? 'S'
}

export function getCustomerSiteMarkAssetPath(customDomain: string) {
  if (KIM_CUSTOM_DOMAINS.has(customDomain)) {
    return '/customer-site-assets/goforthebling-gnome-forest-monogram-g.png'
  }

  return BRI_CUSTOM_DOMAINS.has(customDomain)
    ? '/customer-site-assets/bris-glowtique-monogram-b.png'
    : null
}

export function getCustomerSiteMarkFontFamily(customDomain: string) {
  // `next/og` needs an embedded font, rather than a browser's serif fallback.
  // A single display face keeps every rep's compact monogram consistent while
  // the business initial itself remains stable across skin changes.
  void customDomain
  return '"Playfair Display", Georgia, serif'
}

/**
 * Resolves customer-site branding only on a custom customer domain. Platform
 * URLs keep the Sparkle Suite application icon and social card unchanged.
 */
export async function getCustomerSiteBrandAssetContext(
  requestHeaders: Headers,
): Promise<CustomerSiteBrandAssetContext | null> {
  const request = new Request('https://www.yoursparklesuite.com/', {
    headers: requestHeaders,
  })
  const customDomain = resolveAmethystRequestCustomDomainHost(request)
  if (!customDomain) return null

  const templateData = await loadAmethystPreviewTemplateData({ repId: customDomain })
  const businessName = cleanText(templateData.homepage.businessName)
  const tagline = getCustomerSiteShareTagline(templateData.homepage.tagline)
  const heroTitle = cleanText(
    templateData.homepage.heroHeadlineOverride || templateData.homepage.heroHeadline,
  )
  const heroSubtitle = cleanText(templateData.homepage.heroSub)
  const preset = templateData.appearancePreset

  return {
    businessName: businessName || 'Customer site',
    customDomain,
    heroSubtitle,
    heroTitle,
    mark: getCustomerSiteMark(businessName, templateData.homepage.repName),
    markAssetPath: getCustomerSiteMarkAssetPath(customDomain),
    markFontFamily: getCustomerSiteMarkFontFamily(customDomain),
    palette: getCustomerSiteSharePalette(preset),
    preset,
    tagline,
  }
}
