import { type AmethystTradeBoardListing } from './trade-board-listings'
import { buildPublicSiteVisibilityScript, type PublicSiteVisibility } from '@/lib/public-site/visibility'
import {
  applyAmethystAppearancePreset,
  type AmethystAppearancePresetId,
} from './appearance-presets'
import { getPublicRepName, redactPublicRepFullName } from './public-rep-name'

export interface AmethystTradeSocialLink {
  label: string
  shortLabel: string
  href: string
}

export interface AmethystTradeFooterLink {
  label: string
  href: string
}

export interface AmethystRuntimeContext {
  targeted: boolean
  repId?: string | null
  publicSiteSlug?: string | null
}

export interface AmethystTradeBoardTickerItem {
  name: string
  type: string
  collection: string
}

export interface AmethystTradeTemplateData {
  visibility?: PublicSiteVisibility
  publicSiteVariant?: 'mile_high_fizz_hybrid' | 'britt_with_bling_hybrid' | 'bling_kitchen_hybrid'
  repName: string
  businessName: string
  /** The upline or other team this rep belongs to, shown in the public footer. */
  memberTeamName?: string
  tradeHeroTitle: string
  tradeHeroSub: string
  tickerTopText: string
  tradeBoardTickerItems?: AmethystTradeBoardTickerItem[]
  pantryPageUrl?: string
  shopUrl: string
  footerTagline: string
  legalDisclaimer: string
  tradeRules: [string, string, string, string]
  faqAnswers: {
    howTradeWorks: string
    cashDifference: string
    tradeCredit: string
    matchingRules: string
    msrp: string
    rarePieces: string
    responseTime: string
  }
  socialLinks: AmethystTradeSocialLink[]
  footerLinks: {
    home: string
    tradeBoard: string
    joinTeam?: string
    catalog: string
    preOrders: string
    pastShows: string
    faq: string
    contact?: string
    privacy: string
    terms: string
    accessibility: string
  }
  footerColumn: {
    title: string
    links: [AmethystTradeFooterLink, AmethystTradeFooterLink, AmethystTradeFooterLink]
  }
}

export interface AmethystTradeTweakDefaults {
  repName: string
  businessName: string
  liveState: string
  contentState: string
  cardCount: number
  cardAspect: string
  tierVisibility: string
  filterStyle: string
  demoSheet: string
  showTicker: boolean
  showHero: boolean
  showFaq: boolean
  showLegal: boolean
  showFooter: boolean
  showNicNac: boolean
  tickerTopText: string
  tradeHeroTitle: string
  tradeHeroSub: string
  primaryColor: string
  accentColor: string
  bgTone: string
  headingFont: string
  bodyFont: string
  headingWeight: number
  shapeRadius: string
  density: string
  saturation: number
  preset: string
  sparkleLevel: string
  bgTreatment: string
  cardSurface: string
  textureOverlay: string
  buttonEnergy: string
  ctaEmphasis: string
  tradeFlair: string
  cursorEffect: string
  tickerSpeed: number
  showSlots: boolean
}

export const defaultAmethystTradeTemplateData: AmethystTradeTemplateData = {
  repName: 'Sasha',
  businessName: 'Sparkle by Sasha',
  tradeHeroTitle: 'Find the dancer you wanted to love.',
  tradeHeroSub:
    'The Dance Floor is for item-for-item swaps only. Requests must stay within the same collection and the same jewelry type.',
  tickerTopText:
    'Dance Floor open now | Item-for-item only | Same collection + same jewelry type | Birthday dancers can trade across months',
  shopUrl: 'https://bombparty.com',
  footerTagline:
    'Live jewelry reveals every Tuesday at 8pm CST. Real pieces, real sparkle.',
  legalDisclaimer:
    'Sparkle by Sasha is operated by an independent Bomb Party Representative. Bomb Party is a registered trademark of Bomb Party LLC. This dance floor is not endorsed by, directly affiliated with, maintained, authorized, or sponsored by Bomb Party LLC. Trades are private agreements between the customer and the rep. MSRP is shown for reference only and is not the basis for trade matching.',
  tradeRules: [
    'Item-for-item only.',
    'No pay-the-difference requests.',
    'No trade credit for lower-priced dancers.',
    'Trades must stay within the same collection and the same jewelry type.',
  ],
  faqAnswers: {
    howTradeWorks:
      "When you do not love the item number just revealed for you, you can request a dancer from the Dance Floor. The rep has both dancers during the live show and, if approved, swaps your just-revealed dancer for the requested dancer one-for-one.",
    cashDifference:
      'No. Customers cannot add money to trade into a more expensive dancer from the Dance Floor.',
    tradeCredit:
      'No. If the requested dancer has a lower Bomb Party MSRP, there is still no credit or payout attached to the trade.',
    matchingRules:
      'Trades need to stay within the same collection and the same jewelry type. OG trades for OG, Birthday trades for Birthday, and earrings trade for earrings, necklaces for necklaces, pendants for pendants, bracelets for bracelets, and stacks for stacks.',
    msrp:
      'Bomb Party MSRP is shown as a reference detail only. It is not the basis for deciding whether a trade is allowed or even.',
    rarePieces:
      'Diamond and unicorn dancers are allowed on the Dance Floor, but they are expected to be rare edge cases rather than the default inventory mix.',
    responseTime:
      'Most reps review trade requests after the live show ends and follow up directly with the customer.',
  },
  socialLinks: [
    { label: 'TikTok', shortLabel: 'TT', href: '#' },
    { label: 'Facebook', shortLabel: 'FB', href: '#' },
    { label: 'Instagram', shortLabel: 'IG', href: '#' },
    { label: 'YouTube', shortLabel: 'YT', href: '#' },
  ],
  footerLinks: {
    home: '/amethyst/Homepage.html',
    tradeBoard: '/amethyst/Trade.html',
    joinTeam: '/amethyst/Join.html',
    catalog: 'https://bombparty.com',
    preOrders: 'https://bombparty.com',
    pastShows: '/amethyst/Homepage.html#events',
    faq: '#faq',
    contact: '#faq',
    privacy: '#faq',
    terms: '#faq',
    accessibility: '#faq',
  },
  footerColumn: {
    title: 'Trade Notes',
    links: [
      { label: 'Birthday dancers can trade across months', href: '#faq' },
      { label: 'Diamonds and unicorns are rare', href: '#faq' },
      { label: 'All trades are rep reviewed', href: '#faq' },
    ],
  },
}

const lockedTweakDefaults: Omit<
  AmethystTradeTweakDefaults,
  | 'repName'
  | 'businessName'
  | 'tickerTopText'
  | 'tradeHeroTitle'
  | 'tradeHeroSub'
> = {
  liveState: 'live',
  contentState: 'populated',
  cardCount: 30,
  cardAspect: 'square',
  tierVisibility: 'rare',
  filterStyle: 'dropdowns',
  demoSheet: 'closed',
  showTicker: true,
  showHero: true,
  showFaq: true,
  showLegal: true,
  showFooter: true,
  showNicNac: true,
  primaryColor: '#5C0EFF',
  accentColor: '#FF1AC2',
  bgTone: 'lavender',
  headingFont: 'italiana',
  bodyFont: 'inter',
  headingWeight: 600,
  shapeRadius: 'soft',
  density: 'regular',
  saturation: 90,
  preset: 'amethyst',
  sparkleLevel: 'glittery',
  bgTreatment: 'confetti',
  cardSurface: 'holographic',
  textureOverlay: 'sparkle',
  buttonEnergy: 'calm',
  ctaEmphasis: 'standard',
  tradeFlair: 'holo-unicorn',
  cursorEffect: 'sparkle',
  tickerSpeed: 1,
  showSlots: false,
}

export function buildAmethystTradeTweakDefaults(
  data: AmethystTradeTemplateData,
  appearancePreset?: AmethystAppearancePresetId | string | null,
): AmethystTradeTweakDefaults {
  return applyAmethystAppearancePreset({
    repName: getPublicRepName(data.repName),
    businessName: data.businessName,
    tickerTopText: data.tickerTopText,
    tradeHeroTitle: data.tradeHeroTitle,
    tradeHeroSub: redactPublicRepFullName(data.tradeHeroSub, data.repName),
    ...lockedTweakDefaults,
  }, appearancePreset)
}

function safeScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function buildPublicRuntimeContext(runtimeContext: AmethystRuntimeContext) {
  const repId = runtimeContext.repId?.trim()
  const publicSiteSlug = runtimeContext.publicSiteSlug?.trim().toLowerCase()

  return {
    targeted: Boolean(runtimeContext.targeted),
    ...(repId ? { repId } : {}),
    ...(publicSiteSlug ? { publicSiteSlug } : {}),
  }
}

function formatTradeBoardTickerItems(
  listings: AmethystTradeBoardListing[],
): AmethystTradeBoardTickerItem[] {
  return listings.slice(0, 8).map((listing) => ({
    name: listing.name,
    type: listing.type,
    collection: listing.collection,
  }))
}

export function buildAmethystTradeBootstrapScript(
  data: AmethystTradeTemplateData = defaultAmethystTradeTemplateData,
  listings: AmethystTradeBoardListing[] = [],
  appearancePreset?: AmethystAppearancePresetId | string | null,
  runtimeContext: AmethystRuntimeContext = { targeted: false },
) {
  const publicRuntimeContext = buildPublicRuntimeContext(runtimeContext)
  const targeted = publicRuntimeContext.targeted
  const publicData: AmethystTradeTemplateData = {
    ...data,
    repName: getPublicRepName(data.repName),
    tradeHeroSub: redactPublicRepFullName(data.tradeHeroSub, data.repName),
    tradeBoardTickerItems: listings.length > 0
      ? formatTradeBoardTickerItems(listings)
      : (data.tradeBoardTickerItems ?? []),
  }
  const defaults = {
    ...buildAmethystTradeTweakDefaults(publicData, appearancePreset),
    ...(targeted
      ? {
          contentState: listings.length > 0 ? 'populated' : 'empty',
          cardCount: listings.length,
        }
      : {}),
  }

  return [
    `window.AMETHYST_RUNTIME_CONTEXT = ${safeScriptJson(publicRuntimeContext)};`,
    buildPublicSiteVisibilityScript(publicData.visibility),
    `window.AMETHYST_TRADE_TEMPLATE_DATA = ${safeScriptJson(publicData)};`,
    `window.TRADE_TWEAK_DEFAULTS = ${safeScriptJson(defaults)};`,
    `window.AMETHYST_TRADE_BOARD_LISTINGS = ${safeScriptJson(listings)};`,
  ].join('\n')
}
