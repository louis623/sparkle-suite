import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePublicSiteVisibility } from '@/lib/public-site/visibility'
import {
  getSiteSettingsDashboard,
} from '@/lib/services/site-settings'
import { getJoinTeamRoster } from '@/lib/services/join-team-roster'
import type {
  JoinTeamMember,
  SiteSettingsDashboardResult,
} from '@/lib/services/types'
import {
  defaultAmethystHomepageTemplateData,
  type AmethystHomepageTemplateData,
} from './homepage-template-data'
import {
  DEFAULT_AMETHYST_APPEARANCE_PRESET,
  normalizeAmethystAppearancePreset,
  type AmethystAppearancePresetId,
} from './appearance-presets'
import {
  defaultAmethystJoinTemplateData,
  type AmethystJoinTeamMember,
  type AmethystJoinTemplateData,
} from './join-template-data'
import { resolveAmethystPreviewRep } from './preview-rep'
import {
  getRequiredSetupState,
  type RequiredSetupState,
} from '@/lib/self-serve/required-setup'
import {
  firstRequiredSetupDraftText as firstDraftText,
  normalizeRequiredSetupDraftState,
} from '@/lib/self-serve/required-setup-draft'
import {
  defaultAmethystTradeTemplateData,
  type AmethystTradeTemplateData,
} from './trade-template-data'
import { getPublicRepName } from './public-rep-name'
import {
  applyMileHighFizzHomepage,
  applyMileHighFizzJoin,
  applyMileHighFizzTrade,
  isMileHighFizzSettings,
} from '@/lib/mile-high-fizz/profile'
import {
  applyBrittWithBlingHomepage,
  applyBrittWithBlingJoin,
  applyBrittWithBlingTrade,
  isBrittWithBlingSettings,
} from '@/lib/britt-with-bling/profile'
import {
  isBlingKitchenSettings,
} from '@/lib/bling-kitchen/profile'

interface PreviewTemplateDataDependencies {
  createAdminClient?: typeof createAdminClient
  resolveAmethystPreviewRep?: typeof resolveAmethystPreviewRep
  getSiteSettingsDashboard?: typeof getSiteSettingsDashboard
  getJoinTeamRoster?: typeof getJoinTeamRoster
  getRequiredSetupState?: typeof getRequiredSetupState
}

interface LoadPreviewTemplateDataOptions {
  env?: Record<string, string | undefined>
  repId?: string | null
  publicSiteSlug?: string | null
  dependencies?: PreviewTemplateDataDependencies
}

interface PreviewRepExtras {
  shopLink?: string | null
  streamingLinks?: unknown
  publicSiteSlug?: string | null
}

export interface AmethystPreviewTemplateData {
  appearancePreset: AmethystAppearancePresetId
  homepage: AmethystHomepageTemplateData
  trade: AmethystTradeTemplateData
  join: AmethystJoinTemplateData
}

const defaultPreviewTemplateData: AmethystPreviewTemplateData = {
  appearancePreset: DEFAULT_AMETHYST_APPEARANCE_PRESET,
  homepage: defaultAmethystHomepageTemplateData,
  trade: defaultAmethystTradeTemplateData,
  join: defaultAmethystJoinTemplateData,
}

function clean(value: string | null | undefined) {
  return value?.trim() || ''
}

function socialKeyForUrl(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('tiktok.com')) return 'tiktok'
  if (normalized.includes('facebook.com') || normalized.includes('fb.com')) return 'facebook'
  if (normalized.includes('instagram.com')) return 'instagram'
  if (normalized.includes('youtube.com') || normalized.includes('youtu.be')) return 'youtube'
  if (normalized.includes('whatnot.com')) return 'whatnot'
  return 'website'
}

function splitAboutNarrative(value: string | undefined): [string, string, string] | null {
  const paragraphs = (value ?? '')
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\s*\r?\n\s*/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3)

  if (paragraphs.length === 0) return null
  return [paragraphs[0] ?? '', paragraphs[1] ?? '', paragraphs[2] ?? '']
}

function mergePrimarySocialLink(
  socialHandles: Record<string, string>,
  primaryLink: string,
) {
  if (!primaryLink) return socialHandles
  return {
    ...socialHandles,
    [socialKeyForUrl(primaryLink)]: primaryLink,
  }
}

function applyRequiredSetupDraftToSettings(
  settings: SiteSettingsDashboardResult,
  state: RequiredSetupState | null | undefined,
): SiteSettingsDashboardResult {
  if (!state?.repId) return settings
  const draft = normalizeRequiredSetupDraftState(state)
  const businessName = firstDraftText(
    draft.customerFacingDisplayName,
    settings.businessName,
  )
  const teamName = firstDraftText(settings.teamName)
  const tagline = firstDraftText(draft.welcomeSupportingLine, settings.tagline)
  const bannerText = firstDraftText(draft.welcomeHeadline, settings.bannerText)

  return {
    ...settings,
    displayName: firstDraftText(draft.conversationName, settings.displayName),
    businessName,
    email: firstDraftText(draft.bestContactEmail, settings.email),
    bannerText,
    bannerVisible: Boolean(bannerText) || settings.bannerVisible,
    tagline,
    teamName,
    appearancePreset: normalizeAmethystAppearancePreset(
      draft.appearancePreset ?? settings.appearancePreset,
    ),
    socialHandles: mergePrimarySocialLink(
      settings.socialHandles,
      draft.primaryLiveShowOrSocialLink,
    ),
  }
}

function applyRequiredSetupDraftToExtras(
  extras: PreviewRepExtras,
  state: RequiredSetupState | null | undefined,
): PreviewRepExtras {
  if (!state?.repId) return extras
  const draft = normalizeRequiredSetupDraftState(state)
  const streamingLinks = asRecord(extras.streamingLinks)
  const primaryLink = draft.primaryLiveShowOrSocialLink

  return {
    ...extras,
    shopLink: firstDraftText(draft.bombPartyRepStoreLink, extras.shopLink),
    streamingLinks: primaryLink
      ? {
          ...streamingLinks,
          [socialKeyForUrl(primaryLink)]: primaryLink,
        }
      : streamingLinks,
  }
}

function applyRequiredSetupDraftToHomepage(
  homepage: AmethystHomepageTemplateData,
  state: RequiredSetupState | null | undefined,
): AmethystHomepageTemplateData {
  if (!state?.repId) return homepage
  const draft = normalizeRequiredSetupDraftState(state)
  const aboutParagraphs = [...homepage.aboutParagraphs] as [string, string, string]

  if (draft.aboutCopy) aboutParagraphs[0] = draft.aboutCopy
  if (draft.scheduleSummary) {
    aboutParagraphs[2] = `Live show schedule: ${draft.scheduleSummary}`
  }

  return {
    ...homepage,
    heroEyebrow: draft.scheduleSummary
      ? `Live schedule: ${draft.scheduleSummary}`
      : 'Live schedule coming soon',
    heroHeadline: firstDraftText(draft.welcomeHeadline, homepage.heroHeadline),
    heroSub: firstDraftText(draft.welcomeSupportingLine, homepage.heroSub),
    aboutHeadline: draft.customerFacingDisplayName
      ? `Meet the story behind ${draft.customerFacingDisplayName}.`
      : homepage.aboutHeadline,
    aboutParagraphs,
    footerTagline: firstDraftText(draft.welcomeSupportingLine, homepage.footerTagline),
  }
}

function hasLegacyPlaceholderText(value: string | null | undefined) {
  const normalized = clean(value).toLowerCase()
  if (!normalized) return false

  return (
    /\b(rep name|show name)\b/.test(normalized) ||
    normalized === 'jane' ||
    normalized.includes("jane's ") ||
    normalized.includes("jane's sparkle party")
  )
}

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const cleaned = clean(value)
    if (cleaned && !hasLegacyPlaceholderText(cleaned)) return cleaned
  }

  return ''
}

function resolveTenantTeamName(
  configuredTeamName: string | null | undefined,
  businessName: string,
) {
  const configured = clean(configuredTeamName)
  const normalizedConfigured = configured.toLowerCase()
  const normalizedBusinessName = clean(businessName).toLowerCase()

  // These are the two historical demo identities. Keep them only when they
  // genuinely belong to the same business; otherwise a customer page must use
  // its owning rep's public business name rather than leak demo copy.
  if (
    normalizedConfigured === 'sparkle by sasha' &&
    normalizedConfigured !== normalizedBusinessName
  ) {
    return businessName
  }

  return firstText(configured, businessName)
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, link]) => [key, typeof link === 'string' ? link.trim() : ''])
      .filter(([, link]) => link.length > 0),
  )
}

function normalizeSocialUrl(label: string, value: string | undefined) {
  const cleaned = clean(value)
  if (!cleaned) return '#'
  if (/^https?:\/\//.test(cleaned)) return cleaned

  const handle = cleaned.replace(/^@/, '')
  if (label === 'tiktok') return `https://www.tiktok.com/@${handle}`
  if (label === 'instagram') return `https://www.instagram.com/${handle}`
  if (label === 'facebook') return `https://www.facebook.com/${handle}`
  if (label === 'whatnot') return `https://www.whatnot.com/user/${handle}`
  return cleaned
}

function buildTicker(settings: SiteSettingsDashboardResult, fallback: string) {
  const tickerText = settings.tickerVisible ? settings.tickerText : ''

  return clean(tickerText).length > 0 && !hasLegacyPlaceholderText(tickerText)
    ? tickerText
    : fallback
}

function buildSocialLinks(settings: SiteSettingsDashboardResult) {
  return [
    {
      label: 'TikTok',
      shortLabel: 'TT',
      href: normalizeSocialUrl('tiktok', settings.socialHandles.tiktok),
    },
    {
      label: 'Facebook',
      shortLabel: 'FB',
      href: normalizeSocialUrl('facebook', settings.socialHandles.facebook),
    },
    {
      label: 'Instagram',
      shortLabel: 'IG',
      href: normalizeSocialUrl('instagram', settings.socialHandles.instagram),
    },
    {
      label: 'YouTube',
      shortLabel: 'YT',
      href: normalizeSocialUrl('youtube', settings.socialHandles.youtube),
    },
    {
      label: 'Whatnot',
      shortLabel: 'WN',
      href: normalizeSocialUrl('whatnot', settings.socialHandles.whatnot),
    },
  ].filter((link) => link.href !== '#')
}

function resolveShopUrl(extras: PreviewRepExtras) {
  return clean(extras.shopLink) || 'https://bombparty.com'
}

function resolveStreamingLinks(settings: SiteSettingsDashboardResult, extras: PreviewRepExtras) {
  const links = asRecord(extras.streamingLinks)
  const tiktok = normalizeSocialUrl('tiktok', settings.socialHandles.tiktok)
  const facebook = normalizeSocialUrl('facebook', settings.socialHandles.facebook)
  const whatnot =
    links.whatnot || normalizeSocialUrl('whatnot', settings.socialHandles.whatnot)

  return {
    shop: resolveShopUrl(extras),
    watch:
      links.tiktok ||
      links.facebook ||
      (tiktok !== '#' ? tiktok : whatnot),
    tiktok: links.tiktok || tiktok,
    facebook: links.facebook || facebook,
    whatnot,
  }
}

function buildLegalDisclaimer(businessName: string, context: 'homepage' | 'trade' | 'join') {
  const tradeNote =
    context === 'trade'
      ? ' Trades are private agreements between the customer and the rep.'
      : ''

  return `${businessName} is operated by an independent Bomb Party Representative. Bomb Party is a registered trademark of Bomb Party LLC. This site is not endorsed by, directly affiliated with, maintained, authorized, or sponsored by Bomb Party LLC.${tradeNote}`
}

function withCustomerTarget(href: string, repId: string | null | undefined) {
  const cleanedRepId = repId?.trim()
  if (!cleanedRepId || !href.startsWith('/amethyst/')) return href

  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}c=${encodeURIComponent(cleanedRepId)}`
}

function applyBlingKitchenPantryAccess(
  homepage: AmethystHomepageTemplateData,
): AmethystHomepageTemplateData {
  return {
    ...homepage,
    pantryPageUrl: '/amethyst/Pantry.html',
  }
}

function targetedHomepageAboutParagraphs(
  homepage: AmethystHomepageTemplateData,
): [string, string, string] {
  const repName = getPublicRepName(homepage.repName)
  const neutral: [string, string, string] = [
    `${repName} will share more about this live reveal community soon.`,
    'Customer details, show style, and favorite reveal notes will appear here after they are added.',
    homepage.heroEyebrow,
  ]
  const isPlaceholder = (value: string) => {
    const normalized = value.toLowerCase()
    return (
      normalized.includes('share how you got started') ||
      normalized.includes('nic-nac can rewrite this') ||
      normalized.includes('add a final paragraph')
    )
  }

  return homepage.aboutParagraphs.map((paragraph, index) =>
    isPlaceholder(paragraph) ? neutral[index] : paragraph,
  ) as [string, string, string]
}

function buildRepOwnedJoinFaq(
  teamName: string,
  repName: string,
  hasRecruitingLink: boolean,
): AmethystJoinTemplateData['faqAnswers'] {
  const publicRepName = getPublicRepName(repName)
  return {
    whatIsTeam: `${teamName} is the team ${publicRepName} manages. Ask ${publicRepName} for the current team details before deciding whether it is right for you.`,
    cost: hasRecruitingLink
      ? 'Starter pack options and prices can change. Use the official link on this page to review the current details before joining.'
      : `Starter pack details are not connected on this page yet. Ask ${publicRepName} for the current official options before joining.`,
    experience: `${publicRepName} can explain the current onboarding requirements and answer experience questions directly.`,
    timeCommitment: `${publicRepName} can discuss what setup and a realistic show schedule can look like.`,
    support: `Ask ${publicRepName} what support is currently available to new team members.`,
    income: 'Review the income disclosure before joining. Income varies by effort, sales, and time.',
  }
}

function applyCustomerTarget(
  data: AmethystPreviewTemplateData,
  repId: string | null | undefined,
  publicSiteSlug?: string | null,
): AmethystPreviewTemplateData {
  const targeted = Boolean(repId?.trim())
  const isMileHighFizzHybrid =
    data.homepage.publicSiteVariant === 'mile_high_fizz_hybrid'
  const isBrittWithBlingHybrid =
    data.homepage.publicSiteVariant === 'britt_with_bling_hybrid'
  const isBespokeHybrid =
    isMileHighFizzHybrid || isBrittWithBlingHybrid
  const hasDatabaseRoster = data.join.teamMembers.some(
    (member) => typeof member.id === 'string' && member.id.trim().length > 0,
  )
  const publicSlugLinks =
    publicSiteSlug?.trim()
      ? {
          home: `/${publicSiteSlug.trim().toLowerCase()}`,
          tradeBoard: `/${publicSiteSlug.trim().toLowerCase()}/trade`,
          joinTeam: `/${publicSiteSlug.trim().toLowerCase()}/join`,
          pantry: `/${publicSiteSlug.trim().toLowerCase()}/in-the-pantry`,
        }
      : null
  const pantrySlugLink =
    data.homepage.pantryPageUrl && publicSiteSlug?.trim()
      ? `/${publicSiteSlug.trim().toLowerCase()}/in-the-pantry`
      : null
  const scrubGenericJoin =
    targeted && !isBespokeHybrid && !hasDatabaseRoster

  return {
    appearancePreset: data.appearancePreset,
    homepage: {
      ...data.homepage,
      aboutParagraphs: targeted
        ? targetedHomepageAboutParagraphs(data.homepage)
        : data.homepage.aboutParagraphs,
      showcaseVideoCaption: targeted
        ? data.homepage.showcaseVideoCaption || 'Live reveal highlights'
        : data.homepage.showcaseVideoCaption,
      joinTeamUrl: data.homepage.joinTeamUrl
        ? publicSlugLinks?.joinTeam ??
          withCustomerTarget(data.homepage.joinTeamUrl, repId)
        : '',
      pantryPageUrl: data.homepage.pantryPageUrl
        ? pantrySlugLink ??
          publicSlugLinks?.pantry ??
          withCustomerTarget(data.homepage.pantryPageUrl, repId)
        : data.homepage.pantryPageUrl,
      footerLinks: {
        ...data.homepage.footerLinks,
        home:
          publicSlugLinks?.home ??
          withCustomerTarget(
            data.homepage.footerLinks.home || '/amethyst/Homepage.html',
            repId,
          ),
        tradeBoard:
          publicSlugLinks?.tradeBoard ??
          withCustomerTarget(data.homepage.footerLinks.tradeBoard, repId),
        joinTeam: data.homepage.footerLinks.joinTeam
          ? publicSlugLinks?.joinTeam ??
            withCustomerTarget(data.homepage.footerLinks.joinTeam, repId)
          : undefined,
      },
    },
    trade: {
      ...data.trade,
      pantryPageUrl: data.trade.pantryPageUrl
        ? pantrySlugLink ??
          withCustomerTarget(data.trade.pantryPageUrl, repId)
        : data.trade.pantryPageUrl,
      footerLinks: {
        ...data.trade.footerLinks,
        home:
          publicSlugLinks?.home ??
          withCustomerTarget(data.trade.footerLinks.home, repId),
        tradeBoard:
          publicSlugLinks?.tradeBoard ??
          withCustomerTarget(data.trade.footerLinks.tradeBoard, repId),
        joinTeam: data.trade.footerLinks.joinTeam
          ? publicSlugLinks?.joinTeam ??
            withCustomerTarget(data.trade.footerLinks.joinTeam, repId)
          : undefined,
      },
    },
    join: {
      ...data.join,
      pantryPageUrl: data.join.pantryPageUrl
        ? pantrySlugLink ??
          withCustomerTarget(data.join.pantryPageUrl, repId)
        : data.join.pantryPageUrl,
      teamMembers: scrubGenericJoin ? [] : data.join.teamMembers,
      promoText: scrubGenericJoin ? '' : data.join.promoText,
      footerColumn: scrubGenericJoin
        ? {
            title: 'Team Notes',
            links: [
              { label: 'Team details appear after setup', href: '#faq' },
              { label: 'Connect with the rep', href: '#faq' },
              { label: 'Review current income disclosure', href: '#faq' },
            ],
          }
        : data.join.footerColumn,
      faqAnswers: scrubGenericJoin
        ? buildRepOwnedJoinFaq(
            data.join.teamName,
            data.join.repName,
            data.join.hasRecruitingLink,
          )
        : data.join.faqAnswers,
      footerLinks: {
        ...data.join.footerLinks,
        home:
          publicSlugLinks?.home ??
          withCustomerTarget(data.join.footerLinks.home, repId),
        tradeBoard:
          publicSlugLinks?.tradeBoard ??
          withCustomerTarget(data.join.footerLinks.tradeBoard, repId),
        joinTeam:
          publicSlugLinks?.joinTeam ??
          withCustomerTarget(data.join.footerLinks.joinTeam, repId),
      },
    },
  }
}

export function mapPreviewSettingsToHomepageTemplateData(
  settings: SiteSettingsDashboardResult,
  extras: PreviewRepExtras = {},
): AmethystHomepageTemplateData {
  const repName = getPublicRepName(
    firstText(settings.displayName, defaultAmethystHomepageTemplateData.repName),
  )
  const businessName = firstText(
    settings.businessName,
    defaultAmethystHomepageTemplateData.businessName,
  )
  const tagline = firstText(settings.tagline, defaultAmethystHomepageTemplateData.tagline)
  const heroHeadlineOverride = settings.heroHeadline?.trim() || ''
  const heroSubtitleOverride = settings.heroSubtitle?.trim() || ''
  const streamLinks = resolveStreamingLinks(settings, extras)
  const showJoinPage =
    settings.joinTeamAccessEnabled === true && settings.showJoinPage !== false
  const homepageMediaSlots = settings.homepageMediaSlots ?? []
  const showcaseMedia = homepageMediaSlots.find(
    (slot) => slot.key === 'showcase',
  )
  const aboutMedia = ['about_1', 'about_2', 'about_3', 'about_4'].map((key) =>
    homepageMediaSlots.find((slot) => slot.key === key),
  )
  const aboutParagraphs = splitAboutNarrative(settings.aboutNarrative)

  const homepage: AmethystHomepageTemplateData = {
    ...defaultAmethystHomepageTemplateData,
    visibility: resolvePublicSiteVisibility(settings),
    repName,
    businessName,
    teamName: resolveTenantTeamName(settings.teamName, businessName),
    memberTeamName: settings.memberTeamName?.trim() || undefined,
    tagline,
    heroHeadline: firstText(heroHeadlineOverride, defaultAmethystHomepageTemplateData.heroHeadline),
    heroHeadlineOverride,
    heroSub: `I'm ${repName} - join me for live reveals, favorite finds, and customer-first sparkle.`,
    heroMotion: settings.heroAnimationType,
    heroEyebrow: 'Live schedule coming soon',
    tickerTopText: buildTicker(
      settings,
      defaultAmethystHomepageTemplateData.tickerTopText,
    ),
    aboutHeadline: firstText(
      settings.aboutHeading,
      `Meet ${repName} and the story behind ${businessName}.`,
    ),
    aboutSubheading: settings.aboutSubheading?.trim() || undefined,
    ...(aboutParagraphs ? { aboutParagraphs } : {}),
    signupSub: `Get a heads-up when ${repName} goes live, plus first dibs on new drops.`,
    signupConsent: `Choose SMS, email, or both. Marketing consent stays separate from reminders and updates from ${businessName}. Msg & data rates may apply. Reply STOP to unsubscribe.`,
    footerTagline: tagline,
    legalDisclaimer: buildLegalDisclaimer(businessName, 'homepage'),
    showJoinPage,
    joinTeamUrl: showJoinPage
      ? defaultAmethystHomepageTemplateData.joinTeamUrl
      : '',
    streamLinks,
    socialLinks: buildSocialLinks(settings),
    showcaseVideoCaption: '',
    showcaseVideoUrl: showcaseMedia?.videoUrl || '#',
    showcaseVideoVisible: showcaseMedia?.isVisible !== false,
    showAboutSection: aboutMedia[0]?.sectionVisible === true,
    aboutMediaManaged: aboutMedia.some(
      (media) =>
        media?.isVisible !== undefined ||
        media?.sectionVisible !== undefined ||
        Boolean(media?.imageUrl || media?.videoUrl),
    ),
    showcaseImageUrl: '',
    aboutMediaSlots: defaultAmethystHomepageTemplateData.aboutMediaSlots.map(
      (fallback, index) => {
        const media = aboutMedia[index]
        const isPortrait = index === 0
        const mediaVisible = media?.isVisible !== false
        return {
          typeLabel: isPortrait ? 'Portrait photo' : `Short video ${index}`,
          caption: isPortrait && mediaVisible ? media?.caption || fallback.caption : '',
          href: isPortrait || !mediaVisible ? '#' : media?.videoUrl || '#',
          mediaUrl: isPortrait && mediaVisible ? media?.imageUrl || undefined : undefined,
          portraitFocusX: isPortrait ? media?.portraitFocusX : undefined,
          portraitFocusY: isPortrait ? media?.portraitFocusY : undefined,
          portraitZoom: isPortrait ? media?.portraitZoom : undefined,
        }
      },
    ) as AmethystHomepageTemplateData['aboutMediaSlots'],
    footerLinks: {
      ...defaultAmethystHomepageTemplateData.footerLinks,
      joinTeam: showJoinPage
        ? defaultAmethystHomepageTemplateData.footerLinks.joinTeam
        : undefined,
      catalog: streamLinks.shop,
      preOrders: streamLinks.shop,
    },
  }

  const variantHomepage = isMileHighFizzSettings(settings)
    ? applyMileHighFizzHomepage(homepage)
    : isBrittWithBlingSettings(settings, extras.publicSiteSlug)
      ? applyBrittWithBlingHomepage(homepage)
      : isBlingKitchenSettings(settings)
        ? applyBlingKitchenPantryAccess(homepage)
        : homepage

  return heroSubtitleOverride
    ? { ...variantHomepage, heroSub: heroSubtitleOverride }
    : variantHomepage
}

export function mapPreviewSettingsToTradeTemplateData(
  settings: SiteSettingsDashboardResult,
  extras: PreviewRepExtras = {},
): AmethystTradeTemplateData {
  const businessName = firstText(
    settings.businessName,
    defaultAmethystTradeTemplateData.businessName,
  )
  const shopUrl = resolveShopUrl(extras)
  const showJoinPage =
    settings.joinTeamAccessEnabled === true && settings.showJoinPage !== false

  const repName = getPublicRepName(
    firstText(settings.displayName, defaultAmethystTradeTemplateData.repName),
  )

  const trade: AmethystTradeTemplateData = {
    ...defaultAmethystTradeTemplateData,
    visibility: resolvePublicSiteVisibility(settings),
    repName,
    businessName,
    memberTeamName: settings.memberTeamName?.trim() || undefined,
    tickerTopText: buildTicker(settings, defaultAmethystTradeTemplateData.tickerTopText),
    shopUrl,
    footerTagline: firstText(settings.tagline, defaultAmethystTradeTemplateData.footerTagline),
    legalDisclaimer: buildLegalDisclaimer(businessName, 'trade'),
    socialLinks: buildSocialLinks(settings),
    footerLinks: {
      ...defaultAmethystTradeTemplateData.footerLinks,
      joinTeam: showJoinPage
        ? defaultAmethystTradeTemplateData.footerLinks.joinTeam
        : undefined,
      catalog: shopUrl,
      preOrders: shopUrl,
    },
  }

  if (isMileHighFizzSettings(settings)) return applyMileHighFizzTrade(trade)
  if (isBrittWithBlingSettings(settings, extras.publicSiteSlug)) {
    return applyBrittWithBlingTrade(trade)
  }
  if (isBlingKitchenSettings(settings)) {
    return {
      ...trade,
      pantryPageUrl: '/amethyst/Pantry.html',
    }
  }
  return trade
}

export function mapPreviewSettingsToJoinTemplateData(
  settings: SiteSettingsDashboardResult,
  extras: PreviewRepExtras = {},
  teamMembers?: AmethystJoinTeamMember[],
): AmethystJoinTemplateData {
  const repName = getPublicRepName(
    firstText(settings.displayName, defaultAmethystJoinTemplateData.repName),
  )
  const businessName = firstText(
    settings.businessName,
    defaultAmethystJoinTemplateData.businessName,
  )
  const teamName = resolveTenantTeamName(settings.teamName, businessName)
  const shopUrl = resolveShopUrl(extras)
  const streamingLinks = asRecord(extras.streamingLinks)
  const joinUrl = clean(streamingLinks.join) || clean(extras.shopLink)
  const hasRecruitingLink = Boolean(joinUrl)

  const join: AmethystJoinTemplateData = {
    ...defaultAmethystJoinTemplateData,
    visibility: resolvePublicSiteVisibility(settings),
    repName,
    repCity: '',
    repState: '',
    businessName,
    teamName,
    memberTeamName: settings.memberTeamName?.trim() || undefined,
    heroTitle: `Join ${teamName}`,
    heroPitch: `Explore what it takes to join ${teamName} with ${repName}, review the current official details, and ask questions before you decide.`,
    promoText: '',
    finalPitch: hasRecruitingLink
      ? `Review the current official starter pack options, then connect with ${repName} for the next onboarding step.`
      : `Starter pack details are not connected here yet. Connect with ${repName} for the current official options and next steps.`,
    bpReferralUrl: joinUrl,
    hasRecruitingLink,
    tickerTopText: buildTicker(settings, defaultAmethystJoinTemplateData.tickerTopText),
    shopUrl,
    footerTagline: firstText(settings.tagline, defaultAmethystJoinTemplateData.footerTagline),
    legalDisclaimer: buildLegalDisclaimer(businessName, 'join'),
    faqAnswers: buildRepOwnedJoinFaq(teamName, repName, hasRecruitingLink),
    repSocialLinks: {
      tiktok: normalizeSocialUrl('tiktok', settings.socialHandles.tiktok),
      website: shopUrl,
      youtube: normalizeSocialUrl('youtube', settings.socialHandles.youtube),
    },
    socialLinks: buildSocialLinks(settings),
    footerLinks: {
      ...defaultAmethystJoinTemplateData.footerLinks,
      catalog: shopUrl,
      preOrders: shopUrl,
      contact: `mailto:${settings.email}`,
    },
    ...(teamMembers ? { teamMembers } : {}),
  }

  if (isMileHighFizzSettings(settings)) return applyMileHighFizzJoin(join)
  if (isBrittWithBlingSettings(settings, extras.publicSiteSlug)) {
    return applyBrittWithBlingJoin(join, teamMembers ?? [])
  }
  if (isBlingKitchenSettings(settings)) {
    return {
      ...join,
      pantryPageUrl: '/amethyst/Pantry.html',
    }
  }
  return join
}

function mapJoinTeamRosterToTemplateMembers(
  members: JoinTeamMember[],
): AmethystJoinTeamMember[] {
  return members.map((member) => ({
    id: member.id,
    name: member.displayName,
    business: member.businessName,
    state: member.city
      ? `${member.city}${member.state ? `, ${member.state}` : ''}`
      : member.state,
    initials: member.initials || undefined,
    imageUrl: member.photoUrl || undefined,
    imageAlt: member.photoAlt || member.displayName,
    imageClassName: member.imageClassName || undefined,
    bio: member.bio || undefined,
    isVisible: member.isVisible,
    socialLinks: {
      ...(member.links.tiktok ? { tiktok: member.links.tiktok } : {}),
      ...(member.links.facebook ? { facebook: member.links.facebook } : {}),
      ...(member.links.instagram ? { instagram: member.links.instagram } : {}),
      ...(member.links.website ? { website: member.links.website } : {}),
      ...(member.links.youtube ? { youtube: member.links.youtube } : {}),
      ...(member.links.whatnot ? { whatnot: member.links.whatnot } : {}),
    },
  }))
}

function canLoadPreviewData(env: Record<string, string | undefined>) {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function loadAmethystPreviewTemplateData(
  options: LoadPreviewTemplateDataOptions = {},
): Promise<AmethystPreviewTemplateData> {
  const env = options.env ?? process.env
  const requestedRepId = options.repId?.trim() ?? null
  const requestedPublicSiteSlug = options.publicSiteSlug?.trim().toLowerCase() ?? null
  if (!canLoadPreviewData(env)) return defaultPreviewTemplateData

  const dependencies = options.dependencies ?? {}

  try {
    const admin = (dependencies.createAdminClient ?? createAdminClient)()
    const rep = await (dependencies.resolveAmethystPreviewRep ??
      resolveAmethystPreviewRep)(admin, {
      env,
      publicSiteSlug: requestedPublicSiteSlug,
      repId: requestedRepId,
      select: 'id, email, shop_link, streaming_links, public_site_slug',
    })

    if (!rep) return defaultPreviewTemplateData

    const settings = await (dependencies.getSiteSettingsDashboard ??
      getSiteSettingsDashboard)(admin, rep.id)
    let joinTeamMembers: AmethystJoinTeamMember[] | undefined
    try {
      joinTeamMembers = mapJoinTeamRosterToTemplateMembers(
        await (dependencies.getJoinTeamRoster ?? getJoinTeamRoster)(admin, rep.id),
      )
    } catch {
      joinTeamMembers = []
    }
    let requiredSetupState: RequiredSetupState | null = null
    try {
      requiredSetupState = await (dependencies.getRequiredSetupState ??
        getRequiredSetupState)(rep.id)
    } catch {
      requiredSetupState = null
    }
    const activeSetupDraftState =
      requiredSetupState?.status === 'required_setup' ||
      requiredSetupState?.status === 'setup_blocked'
        ? requiredSetupState
        : null
    const draftSettings = applyRequiredSetupDraftToSettings(
      settings,
      activeSetupDraftState,
    )
    const extras = {
      shopLink: rep.shop_link,
      streamingLinks: rep.streaming_links,
      publicSiteSlug: requestedPublicSiteSlug ?? rep.public_site_slug,
    }
    const draftExtras = applyRequiredSetupDraftToExtras(extras, activeSetupDraftState)

    return applyCustomerTarget(
      {
        appearancePreset: normalizeAmethystAppearancePreset(
          draftSettings.appearancePreset,
        ),
        homepage: applyRequiredSetupDraftToHomepage(
          mapPreviewSettingsToHomepageTemplateData(draftSettings, draftExtras),
          activeSetupDraftState,
        ),
        trade: mapPreviewSettingsToTradeTemplateData(draftSettings, draftExtras),
        join: mapPreviewSettingsToJoinTemplateData(
          draftSettings,
          draftExtras,
          joinTeamMembers,
        ),
      },
      requestedRepId ?? rep.id,
      requestedPublicSiteSlug,
    )
  } catch {
    return defaultPreviewTemplateData
  }
}
