import { buildPublicSiteVisibilityScript, type PublicSiteVisibility } from '@/lib/public-site/visibility'
import {
  applyAmethystAppearancePreset,
  type AmethystAppearancePresetId,
} from './appearance-presets'
import { getPublicRepName, redactPublicRepFullName } from './public-rep-name'
import type { AmethystTradeBoardListing } from './trade-board-listings'

export interface AmethystJoinSocialLink {
  label: string
  shortLabel: string
  href: string
}

export interface AmethystJoinFooterLink {
  label: string
  href: string
}

export interface AmethystJoinTeamMember {
  id?: string
  name: string
  business: string
  state: string
  initials?: string
  imageUrl?: string
  imageAlt?: string
  imageClassName?: string
  bio?: string
  isVisible?: boolean
  socialLinks: {
    tiktok?: string
    facebook?: string
    instagram?: string
    website?: string
    youtube?: string
    whatnot?: string
  }
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

export interface AmethystJoinTemplateData {
  visibility?: PublicSiteVisibility
  publicSiteVariant?: 'mile_high_fizz_hybrid' | 'britt_with_bling_hybrid' | 'bling_kitchen_hybrid'
  repName: string
  repCity: string
  repState: string
  businessName: string
  teamName: string
  /** The upline or other team this rep belongs to, shown in the public footer. */
  memberTeamName?: string
  heroTitle?: string
  promoText: string
  heroPitch: string
  heroCtaText: string
  finalPitch: string
  bpReferralUrl: string
  hasRecruitingLink: boolean
  bpIncomeDisclosureUrl: string
  tickerTopText: string
  tradeBoardTickerItems?: AmethystTradeBoardTickerItem[]
  pantryPageUrl?: string
  shopUrl: string
  bombPartyFaqUrl: string
  footerTagline: string
  legalDisclaimer: string
  repSocialLinks: {
    tiktok?: string
    website?: string
    youtube?: string
  }
  socialLinks: AmethystJoinSocialLink[]
  footerLinks: {
    tradeBoard: string
    catalog: string
    preOrders: string
    pastShows: string
    home: string
    joinTeam: string
    faq: string
    contact: string
    privacy: string
    terms: string
    accessibility: string
  }
  footerColumn: {
    title: string
    links: AmethystJoinFooterLink[]
  }
  teamMembers: AmethystJoinTeamMember[]
  faqAnswers: {
    whatIsTeam: string
    cost: string
    experience: string
    timeCommitment: string
    support: string
    income: string
  }
}

export interface AmethystJoinTweakDefaults {
  teamName: string
  heroTitle: string
  repName: string
  repCity: string
  repState: string
  businessName: string
  teamMemberCount: number
  showPromo: boolean
  promoText: string
  heroPitch: string
  heroCtaText: string
  finalPitch: string
  bpReferralUrl: string
  hasRecruitingLink: boolean
  showTicker: boolean
  showHero: boolean
  showTeam: boolean
  showWhy: boolean
  showFaq: boolean
  showFinalCta: boolean
  showFooter: boolean
  showNicNac: boolean
  tickerTopText: string
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

export const defaultAmethystJoinTemplateData: AmethystJoinTemplateData = {
  repName: 'Sasha',
  repCity: 'Austin',
  repState: 'Texas',
  businessName: 'Sparkle by Sasha',
  teamName: 'Sparkle by Sasha',
  heroTitle: 'Welcome to Sparkle by Sasha',
  promoText:
    'Check the official Bomb Party enrollment page for current starter-pack details and promotions.',
  heroPitch:
    'Learn what it takes to become an independent rep, review the official requirements, and ask the team lead what support is currently available.',
  heroCtaText: 'See starter packs',
  finalPitch:
    'Review the current official starter-pack options and enrollment requirements, then ask the team lead any questions before you decide.',
  bpReferralUrl: 'https://bombparty.com/?ref=sparklebysasha',
  hasRecruitingLink: true,
  bpIncomeDisclosureUrl:
    'https://bombpartyassets.blob.core.windows.net/exigoresourcelibraryassets/Rep%20Use%20Documents/Bomb%20Party_Income%20Disclosure%20Statement_2025%20%281%29.pdf',
  tickerTopText:
    'Live tonight Â· 8pm CST | Use code AMETHYST15 | Pre-orders close Friday | New Unicorn drops Tuesday',
  shopUrl: 'https://bombparty.com/?ref=sparklebysasha',
  bombPartyFaqUrl: 'https://bombparty.com',
  footerTagline:
    'Live jewelry reveals every Tuesday at 8pm CST. Real pieces, real sparkle.',
  legalDisclaimer:
    'Sparkle by Sasha is operated by an independent Bomb Party Representative. Bomb Party is a registered trademark of Bomb Party LLC. This site is not endorsed by, directly affiliated with, maintained, authorized, or sponsored by Bomb Party LLC. Any agreements formed between site visitors and the rep are solely between those parties, not Bomb Party LLC and not the platform.',
  repSocialLinks: {
    tiktok: 'https://www.tiktok.com',
    website: 'https://bombparty.com/?ref=sparklebysasha',
    youtube: 'https://www.youtube.com',
  },
  socialLinks: [
    { label: 'TikTok', shortLabel: 'TT', href: 'https://www.tiktok.com' },
    { label: 'Facebook', shortLabel: 'FB', href: 'https://www.facebook.com' },
    { label: 'Instagram', shortLabel: 'IG', href: 'https://www.instagram.com' },
    { label: 'YouTube', shortLabel: 'YT', href: 'https://www.youtube.com' },
  ],
  footerLinks: {
    tradeBoard: '/amethyst/Trade.html',
    catalog: 'https://bombparty.com/?ref=sparklebysasha',
    preOrders: 'https://bombparty.com/?ref=sparklebysasha',
    pastShows: '#top',
    home: '/amethyst/Homepage.html',
    joinTeam: '/amethyst/Join.html',
    faq: '#faq',
    contact: 'mailto:hello@sparklebysasha.example',
    privacy: '#faq',
    terms: '#faq',
    accessibility: '#faq',
  },
  footerColumn: {
    title: '',
    links: [],
  },
  teamMembers: [
    {
      name: 'Lindsey',
      business: 'Virtuous Sisters',
      state: 'Texas',
      initials: 'L',
      socialLinks: {
        tiktok: 'https://www.tiktok.com',
        website: 'https://bombparty.com/?ref=sparklebysasha',
      },
    },
    {
      name: 'Mira',
      business: "Mira's Magic Box",
      state: 'Georgia',
      initials: 'M',
      socialLinks: {
        tiktok: 'https://www.tiktok.com',
        youtube: 'https://www.youtube.com',
      },
    },
    {
      name: 'Cassidy',
      business: 'Cassidy Sparkle',
      state: 'Florida',
      initials: 'C',
      socialLinks: {
        tiktok: 'https://www.tiktok.com',
        website: 'https://bombparty.com/?ref=sparklebysasha',
      },
    },
    {
      name: 'Rae',
      business: 'Rae of Sunshine',
      state: 'Arizona',
      initials: 'R',
      socialLinks: {
        tiktok: 'https://www.tiktok.com',
      },
    },
    {
      name: 'Tasha',
      business: "Tasha's Treasure",
      state: 'Ohio',
      initials: 'T',
      socialLinks: {
        tiktok: 'https://www.tiktok.com',
        website: 'https://bombparty.com/?ref=sparklebysasha',
        youtube: 'https://www.youtube.com',
      },
    },
    {
      name: 'Joelle',
      business: 'Joelle Glows',
      state: 'California',
      initials: 'J',
      socialLinks: {
        tiktok: 'https://www.tiktok.com',
      },
    },
  ],
  faqAnswers: {
    whatIsTeam:
      'Sparkle by Sasha is a team of independent Bomb Party reps led by Sasha. Ask the team lead how the group communicates and what support is currently available.',
    cost:
      'Starter-pack options, contents, and prices can change. Review the current official enrollment page before making a decision.',
    experience:
      'Review the current official requirements and ask the team lead what training or onboarding help is available for new reps.',
    timeCommitment:
      'The time needed depends on your goals and how you run your independent business. Review the official policies and plan a schedule that is realistic for you.',
    support:
      'Support differs by team and can change. Ask the team lead which onboarding, communication, and training resources are available now.',
    income:
      'Income is not guaranteed and results vary. Read the current Income Disclosure Statement and consider your costs, time, and goals before enrolling.',
  },
}

const lockedTweakDefaults: Omit<
  AmethystJoinTweakDefaults,
  | 'teamName'
  | 'repName'
  | 'repCity'
  | 'repState'
  | 'businessName'
  | 'teamMemberCount'
  | 'heroTitle'
  | 'promoText'
  | 'heroPitch'
  | 'heroCtaText'
  | 'finalPitch'
  | 'bpReferralUrl'
  | 'hasRecruitingLink'
  | 'tickerTopText'
> = {
  showPromo: true,
  showTicker: true,
  showHero: true,
  showTeam: true,
  showWhy: true,
  showFaq: true,
  showFinalCta: true,
  showFooter: true,
  showNicNac: true,
  primaryColor: '#480DDF',
  accentColor: '#D209E3',
  bgTone: 'lavender',
  headingFont: 'italiana',
  bodyFont: 'inter',
  headingWeight: 600,
  shapeRadius: 'soft',
  density: 'compact',
  saturation: 110,
  preset: 'amethyst',
  sparkleLevel: 'glittery',
  bgTreatment: 'mesh',
  cardSurface: 'holographic',
  textureOverlay: 'sparkle',
  buttonEnergy: 'calm',
  ctaEmphasis: 'pulse',
  tradeFlair: 'tier-glow',
  cursorEffect: 'default',
  tickerSpeed: 1,
  showSlots: false,
}

export function buildAmethystJoinTweakDefaults(
  data: AmethystJoinTemplateData,
  appearancePreset?: AmethystAppearancePresetId | string | null,
): AmethystJoinTweakDefaults {
  return applyAmethystAppearancePreset({
    teamName: data.teamName,
    heroTitle: data.heroTitle || `Welcome to ${data.teamName}`,
    repName: getPublicRepName(data.repName),
    repCity: data.repCity,
    repState: data.repState,
    businessName: data.businessName,
    teamMemberCount: data.teamMembers.length,
    promoText: data.promoText,
    heroPitch: redactPublicRepFullName(data.heroPitch, data.repName),
    heroCtaText: data.heroCtaText,
    finalPitch: redactPublicRepFullName(data.finalPitch, data.repName),
    bpReferralUrl: data.bpReferralUrl,
    hasRecruitingLink: data.hasRecruitingLink,
    tickerTopText: data.tickerTopText,
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

export function buildAmethystJoinBootstrapScript(
  data: AmethystJoinTemplateData = defaultAmethystJoinTemplateData,
  appearancePreset?: AmethystAppearancePresetId | string | null,
  runtimeContext: AmethystRuntimeContext = { targeted: false },
  tradeBoardListings: AmethystTradeBoardListing[] = [],
) {
  const publicRuntimeContext = buildPublicRuntimeContext(runtimeContext)
  const targeted = publicRuntimeContext.targeted
  const publicData: AmethystJoinTemplateData = {
    ...data,
    repName: getPublicRepName(data.repName),
    tradeBoardTickerItems: tradeBoardListings.length > 0
      ? formatTradeBoardTickerItems(tradeBoardListings)
      : (data.tradeBoardTickerItems ?? []),
    heroPitch: redactPublicRepFullName(data.heroPitch, data.repName),
    finalPitch: redactPublicRepFullName(data.finalPitch, data.repName),
    faqAnswers: {
      ...data.faqAnswers,
      whatIsTeam: redactPublicRepFullName(data.faqAnswers.whatIsTeam, data.repName),
      experience: redactPublicRepFullName(data.faqAnswers.experience, data.repName),
      timeCommitment: redactPublicRepFullName(
        data.faqAnswers.timeCommitment,
        data.repName,
      ),
      support: redactPublicRepFullName(data.faqAnswers.support, data.repName),
      income: redactPublicRepFullName(data.faqAnswers.income, data.repName),
    },
  }
  const defaults = {
    ...buildAmethystJoinTweakDefaults(publicData, appearancePreset),
    ...(targeted
      ? {
          showTeam: publicData.teamMembers.length > 0,
          teamMemberCount: publicData.teamMembers.length,
          showPromo: Boolean(publicData.promoText),
        }
      : {}),
  }

  return [
    `window.AMETHYST_RUNTIME_CONTEXT = ${safeScriptJson(publicRuntimeContext)};`,
    buildPublicSiteVisibilityScript(publicData.visibility),
    `window.AMETHYST_JOIN_TEMPLATE_DATA = ${safeScriptJson(publicData)};`,
    `window.JOIN_TWEAK_DEFAULTS = ${safeScriptJson(defaults)};`,
  ].join('\n')
}
