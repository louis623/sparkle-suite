import { buildPublicSiteVisibilityScript, type PublicSiteVisibility } from '@/lib/public-site/visibility'
import {
  defaultAmethystHomepageEvents,
  type AmethystHomepageEventCard,
} from './homepage-upcoming-shows'
import {
  applyAmethystAppearancePreset,
  type AmethystAppearancePresetId,
} from './appearance-presets'
import { getPublicRepName, redactPublicRepFullName } from './public-rep-name'
import type { AmethystTradeBoardListing } from './trade-board-listings'
import type { LiveQueueSnapshot } from '@/lib/services/types'
import { buildPublicLiveLineup } from './public-live-lineup'

export interface AmethystHomepageMediaSlot {
  typeLabel: string
  caption: string
  href: string
  mediaUrl?: string
  portraitFocusX?: number
  portraitFocusY?: number
  portraitZoom?: number
}

export interface AmethystHomepageSocialLink {
  label: string
  shortLabel: string
  href: string
}

export interface AmethystHomepageFeaturedReveal {
  eyebrow: string
  title: string
  body: string
  ctaLabel: string
  ctaHref: string
  videoUrl: string
  videoTitle: string
}

export interface AmethystHomepageRevealExplainerStep {
  title: string
  body: string
}

export interface AmethystHomepageRevealExplainer {
  title: string
  body: string
  videoCaption: string
  videoHandle: string
  videoUrl: string
  videoTitle: string
  ctaLabel: string
  ctaHref: string
  steps: [
    AmethystHomepageRevealExplainerStep,
    AmethystHomepageRevealExplainerStep,
    AmethystHomepageRevealExplainerStep,
  ]
}

export interface AmethystRuntimeContext {
  targeted: boolean
  repId?: string | null
  publicSiteSlug?: string | null
}

export type AmethystHomepageLiveQueueState =
  | 'live'
  | 'offline'
  | 'loading'
  | 'empty'
  | 'delayed'

export interface AmethystHomepageLiveQueueEntry {
  position: number
  label: string
  name: string
  highlight: boolean
}

export interface AmethystHomepageTradeBoardTickerItem {
  name: string
  type: string
  collection: string
}

export interface AmethystHomepageTemplateData {
  visibility?: PublicSiteVisibility
  publicSiteVariant?: 'mile_high_fizz_hybrid' | 'britt_with_bling_hybrid' | 'bling_kitchen_hybrid'
  repName: string
  businessName: string
  teamName: string
  /** The upline or other team this rep belongs to, shown in the public footer. */
  memberTeamName?: string
  tagline: string
  heroEyebrow: string
  heroHeadline: string
  heroHeadlineOverride?: string
  heroSub: string
  heroVideoUrl?: string
  heroImageUrl?: string
  announcementText?: string
  announcementLinkLabel?: string
  announcementHref?: string
  promoTickerText?: string
  shopCtaLabel?: string
  pantryPageUrl?: string
  liveQueueState?: AmethystHomepageLiveQueueState
  liveQueueSummary?: string
  liveQueueLastUpdated?: string | null
  liveQueueEntries?: AmethystHomepageLiveQueueEntry[]
  tradeBoardSummary?: string
  tradeBoardTickerItems?: AmethystHomepageTradeBoardTickerItem[]
  featuredReveal?: AmethystHomepageFeaturedReveal
  revealExplainer?: AmethystHomepageRevealExplainer
  heroMotion: string
  tickerTopText: string
  aboutHeadline: string
  aboutSubheading?: string
  aboutParagraphs: [string, string, string]
  aboutMediaSlots: AmethystHomepageMediaSlot[]
  signupTitle: string
  signupSub: string
  signupConsent: string
  joinTeamTitle: string
  joinTeamSub: string
  joinTeamUrl: string
  footerTagline: string
  legalDisclaimer: string
  showcaseVideoCaption: string
  showcaseVideoUrl: string
  showcaseVideoVisible?: boolean
  /** Brittany-only publication switch for her restored About/Sparkle Moments section. */
  showAboutSection?: boolean
  /** True once Brittany's About media has been saved from Site Settings. */
  aboutMediaManaged?: boolean
  showcaseImageUrl?: string
  showJoinPage: boolean
  streamLinks: {
    shop: string
    watch: string
    tiktok: string
    facebook: string
    whatnot?: string
  }
  socialLinks: AmethystHomepageSocialLink[]
  footerLinks: {
    home?: string
    tradeBoard: string
    joinTeam?: string
    catalog: string
    preOrders: string
    pastShows: string
    faq: string
    contact: string
    privacy: string
    terms: string
    accessibility: string
  }
}

export interface AmethystHomepageTweakDefaults {
  repName: string
  businessName: string
  tagline: string
  heroHeadline: string
  heroSub: string
  heroMotion: string
  buttonStyle: string
  tickerVariant: string
  nicNacStyle: string
  showTicker: boolean
  showLrq: boolean
  showHero: boolean
  showEvents: boolean
  showWibp: boolean
  showAbout: boolean
  showSignup: boolean
  showFooter: boolean
  showNicNac: boolean
  eventCount: number
  lrqState: string
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

export const defaultAmethystHomepageTemplateData: AmethystHomepageTemplateData = {
  repName: 'Sasha',
  businessName: 'Sparkle by Sasha',
  teamName: 'Sparkle by Sasha',
  tagline: 'Live jewelry reveals every Tuesday - joy you can hold.',
  heroEyebrow: 'Live Tuesdays - 8pm CST',
  heroHeadline: 'Real jewelry. Live reveals. Pure sparkle.',
  heroSub:
    "I'm Sasha - every Tuesday at 8pm CST I open Bomb Party boxes live and you watch what's inside, real time.",
  heroMotion: 'sparkle_rise',
  tickerTopText:
    'Live tonight - 8pm CST | Use code AMETHYST15 | Pre-orders close Friday | New Unicorn drops Tuesday',
  aboutHeadline: 'Meet Sasha and the story behind the sparkle.',
  aboutParagraphs: [
    'Share how you got started, what customers can expect in your live reveals, and why this business matters to you. This should feel personal, warm, and easy for new shoppers to connect with.',
    'Talk about your community, your favorite kinds of reveals, or the energy you bring to show nights. Nic-Nac can rewrite this to match your voice while keeping the section polished and on-brand.',
    'Add a final paragraph about your schedule, what makes your page special, or what you love most about helping customers find pieces they get excited to wear.',
  ],
  aboutMediaSlots: [
    {
      typeLabel: 'Portrait photo',
      caption:
        'Your portrait photo appears beside your About story in a clean, subject-focused 4:5 crop.',
      href: '#',
    },
    {
      typeLabel: 'Short video 1',
      caption:
        'Add a TikTok or YouTube Short below your About story.',
      href: '#',
    },
    {
      typeLabel: 'Short video 2',
      caption: 'Add another TikTok or YouTube Short.',
      href: '#',
    },
    {
      typeLabel: 'Short video 3',
      caption: 'Add a third TikTok or YouTube Short.',
      href: '#',
    },
  ],
  signupTitle: 'Never miss a show.',
  signupSub: 'Get a heads-up when Sasha goes live, plus first dibs on new drops.',
  signupConsent:
    'Choose SMS, email, or both. Marketing consent stays separate from reminders and updates from Sparkle by Sasha. Msg & data rates may apply. Reply STOP to unsubscribe.',
  joinTeamTitle: 'Want to do this too?',
  joinTeamSub:
    "Join my team. I'll show you how I built a real business doing live jewelry reveals on my own schedule - and Sparkle Suite gives you the site to run it.",
  joinTeamUrl: '/amethyst/Join.html',
  footerTagline:
    'Live jewelry reveals every Tuesday at 8pm CST. Real pieces, real sparkle.',
  legalDisclaimer:
    'Sparkle by Sasha is operated by an independent Bomb Party Representative. Bomb Party is a registered trademark of Bomb Party LLC. This site is not endorsed by, directly affiliated with, maintained, authorized, or sponsored by Bomb Party LLC. All product names, trademarks, and registered trademarks are property of their respective owners. Live show schedules subject to change. Dance Floor listings are sold by the rep and not by Bomb Party LLC.',
  showcaseVideoCaption: '@sparklebysasha - "When the box hits different..."',
  showcaseVideoUrl: '#',
  showcaseImageUrl: '',
  showJoinPage: true,
  streamLinks: {
    shop: 'https://bombparty.com',
    watch: '#',
    tiktok: '#',
    facebook: '#',
    whatnot: '#',
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
    pastShows: '#events',
    faq: '#',
    contact: '#',
    privacy: '#',
    terms: '#',
    accessibility: '#',
  },
}

function normalizeTickerPart(value: string | null | undefined) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function formatTradeBoardTickerItem(
  listing: AmethystTradeBoardListing,
): AmethystHomepageTradeBoardTickerItem {
  return {
    name: listing.name,
    type: listing.type,
    collection: listing.collection,
  }
}

function mapLiveQueueEntries(
  snapshot: LiveQueueSnapshot | null | undefined,
): AmethystHomepageLiveQueueEntry[] {
  if (!snapshot?.isFresh) return []

  return snapshot.queue.map((name, index) => ({
    position: index + 1,
    label:
      index === 0
        ? 'Currently Unboxing'
        : index === 1
          ? 'On Deck'
          : index === 2
            ? 'Up Next'
            : 'In Lineup',
    name,
    highlight: index === 0,
  }))
}

function liveQueueStateFromSnapshot(
  snapshot: LiveQueueSnapshot | null | undefined,
): AmethystHomepageLiveQueueState {
  if (!snapshot) return 'offline'
  if (!snapshot.isFresh) return 'offline'
  return snapshot.queueLength > 0 ? 'live' : 'empty'
}

function liveQueueSummaryFromSnapshot(
  snapshot: LiveQueueSnapshot | null | undefined,
) {
  if (!snapshot) return 'Live Lineup will open closer to the next show.'
  if (!snapshot.isFresh) return 'Live Lineup is waiting for an update.'
  if (snapshot.currentCustomer) {
    return `Live Lineup: ${snapshot.currentCustomer} is currently unboxing`
  }
  return 'Live Lineup connected and ready'
}

function tradeBoardSummaryFromListings(listings: AmethystTradeBoardListing[]) {
  if (listings.length === 0) return 'Dance Floor ready for new listings'
  return `Dance Floor: ${listings.length} available ${listings.length === 1 ? 'piece' : 'pieces'}`
}

const CUSTOMER_READY_LIVE_QUEUE_SUMMARY =
  'Live Lineup is ready. Customer names appear here when a live show is connected.'

export function enrichAmethystHomepageFeatureData(
  homepage: AmethystHomepageTemplateData,
  options: {
    liveQueueSnapshot?: LiveQueueSnapshot | null
    tradeBoardListings?: AmethystTradeBoardListing[]
  } = {},
): AmethystHomepageTemplateData {
  const tradeBoardListings = options.tradeBoardListings ?? []
  const tradeBoardSummary = tradeBoardSummaryFromListings(tradeBoardListings)
  const liveQueueSnapshot = options.liveQueueSnapshot
  const scrubStaleBrittQueue =
    homepage.publicSiteVariant === 'britt_with_bling_hybrid' &&
    liveQueueSnapshot &&
    !liveQueueSnapshot.isFresh
  const liveQueueSummary = scrubStaleBrittQueue
    ? CUSTOMER_READY_LIVE_QUEUE_SUMMARY
    : liveQueueSummaryFromSnapshot(liveQueueSnapshot)
  return {
    ...homepage,
    tickerTopText: normalizeTickerPart(homepage.tickerTopText),
    tradeBoardSummary,
    tradeBoardTickerItems: tradeBoardListings
      .slice(0, 8)
      .map(formatTradeBoardTickerItem),
    liveQueueState: scrubStaleBrittQueue
      ? 'empty'
      : liveQueueStateFromSnapshot(liveQueueSnapshot),
    liveQueueSummary,
    liveQueueEntries: scrubStaleBrittQueue
      ? []
      : mapLiveQueueEntries(liveQueueSnapshot),
    ...(homepage.publicSiteVariant === 'britt_with_bling_hybrid'
      ? buildPublicLiveLineup(liveQueueSnapshot) : {}),
  }
}

const lockedTweakDefaults: Omit<
  AmethystHomepageTweakDefaults,
  | 'repName'
  | 'businessName'
  | 'tagline'
  | 'heroHeadline'
  | 'heroSub'
  | 'heroMotion'
  | 'tickerTopText'
> = {
  buttonStyle: 'sparkle',
  tickerVariant: 'dual',
  nicNacStyle: 'square',
  showTicker: true,
  showLrq: true,
  showHero: true,
  showEvents: true,
  showWibp: true,
  showAbout: true,
  showSignup: true,
  showFooter: true,
  showNicNac: true,
  eventCount: 2,
  lrqState: 'live',
  primaryColor: '#5C0EFF',
  accentColor: '#FF1AC2',
  bgTone: 'lavender',
  headingFont: 'italiana',
  bodyFont: 'inter',
  headingWeight: 600,
  shapeRadius: 'soft',
  density: 'regular',
  saturation: 130,
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

export function buildAmethystHomepageTweakDefaults(
  data: AmethystHomepageTemplateData,
  appearancePreset?: AmethystAppearancePresetId | string | null,
): AmethystHomepageTweakDefaults {
  const presetDefaults = applyAmethystAppearancePreset({
    repName: getPublicRepName(data.repName),
    businessName: data.businessName,
    tagline: data.tagline,
    heroHeadline: data.heroHeadline,
    heroSub: redactPublicRepFullName(data.heroSub, data.repName),
    tickerTopText: data.tickerTopText,
    ...lockedTweakDefaults,
  }, appearancePreset)

  // Hero motion is a saved Site Settings choice. The selected skin supplies
  // the other visual defaults, but must never overwrite a rep's saved motion
  // while the public bootstrap is being assembled.
  return {
    ...presetDefaults,
    heroMotion: data.heroMotion,
  }
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

export function buildAmethystHomepageBootstrapScript(
  data: AmethystHomepageTemplateData = defaultAmethystHomepageTemplateData,
  events: AmethystHomepageEventCard[] = defaultAmethystHomepageEvents,
  appearancePreset?: AmethystAppearancePresetId | string | null,
  runtimeContext: AmethystRuntimeContext = { targeted: false },
) {
  const publicRuntimeContext = buildPublicRuntimeContext(runtimeContext)
  const targeted = publicRuntimeContext.targeted
  const publicData: AmethystHomepageTemplateData = {
    ...data,
    repName: getPublicRepName(data.repName),
    heroSub: redactPublicRepFullName(data.heroSub, data.repName),
    aboutHeadline: redactPublicRepFullName(data.aboutHeadline, data.repName),
    aboutSubheading: data.aboutSubheading
      ? redactPublicRepFullName(data.aboutSubheading, data.repName)
      : undefined,
    aboutParagraphs: data.aboutParagraphs.map((paragraph) =>
      redactPublicRepFullName(paragraph, data.repName),
    ) as [string, string, string],
    signupSub: redactPublicRepFullName(data.signupSub, data.repName),
  }
  const defaults = {
    ...buildAmethystHomepageTweakDefaults(publicData, appearancePreset),
    ...(targeted
      ? {
          showEvents: events.length > 0,
          eventCount: events.length,
          lrqState: 'empty',
        }
      : {}),
  }

  return [
    `window.AMETHYST_RUNTIME_CONTEXT = ${safeScriptJson(publicRuntimeContext)};`,
    buildPublicSiteVisibilityScript(publicData.visibility),
    `window.AMETHYST_HOMEPAGE_TEMPLATE_DATA = ${safeScriptJson(publicData)};`,
    `window.HOMEPAGE_TWEAK_DEFAULTS = ${safeScriptJson(defaults)};`,
    `window.AMETHYST_HOMEPAGE_EVENTS = ${safeScriptJson(events)};`,
    `window.AMETHYST_APPLY_HOMEPAGE_TEMPLATE = function applyHomepageTemplate(currentTweaks) {`,
    `  var content = window.AMETHYST_HOMEPAGE_TEMPLATE_DATA || {};`,
    `  var tweaks = currentTweaks || window.HOMEPAGE_TWEAK_DEFAULTS || {};`,
    `  var footerLinks = content.footerLinks || {};`,
    `  var streamLinks = content.streamLinks || {};`,
    `  var socialLinks = content.socialLinks || [];`,
    `  function text(selector, value) { var node = document.querySelector(selector); if (node && typeof value === 'string' && value.length > 0) node.textContent = value; }`,
    `  function html(selector, value) { var node = document.querySelector(selector); if (node && typeof value === 'string' && value.length > 0) node.innerHTML = value; }`,
    `  function href(selector, value) { var node = document.querySelector(selector); if (node && value) node.setAttribute('href', value); }`,
    `  function all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }`,
    `  function bindButton(selector, value) { var node = document.querySelector(selector); if (!node || !value) return; node.style.cursor = 'pointer'; node.onclick = function () { if (/^https?:\\/\\//.test(value)) window.open(value, '_blank', 'noopener,noreferrer'); else window.location.href = value; }; }`,
    `  text('.hp-wibp-video-caption', content.showcaseVideoCaption);`,
    `  var showcase = document.querySelector('[data-slot="showcase video"]'); var showcaseSurface = showcase && (showcase.querySelector('.hp-customer-media-empty') || showcase.querySelector('.hp-customer-media-viewport') || showcase); if (showcaseSurface && content.showcaseImageUrl) { showcaseSurface.style.backgroundImage = 'linear-gradient(rgba(14, 8, 32, 0.2), rgba(14, 8, 32, 0.48)), url("' + content.showcaseImageUrl + '")'; showcaseSurface.style.backgroundPosition = 'center'; showcaseSurface.style.backgroundSize = 'cover'; }`,
    `  text('[data-slot="about headline"]', content.aboutHeadline);`,
    `  text('[data-slot="about subheading"]', content.aboutSubheading);`,
    `  text('[data-slot="about paragraph 1"]', content.aboutParagraphs && content.aboutParagraphs[0]);`,
    `  text('[data-slot="about paragraph 2"]', content.aboutParagraphs && content.aboutParagraphs[1]);`,
    `  text('[data-slot="about paragraph 3"]', content.aboutParagraphs && content.aboutParagraphs[2]);`,
    `  text('.hp-signup-title', content.signupTitle);`,
    `  text('.hp-signup-sub', content.signupSub);`,
    `  html('.hp-signup-consent', (content.signupConsent || '') + ' <a href="' + (footerLinks.privacy || '#') + '">Privacy policy</a>.');`,
    `  text('.hp-footer-tag', content.footerTagline);`,
    `  html('.hp-footer-bottom p', content.legalDisclaimer);`,
    `  href('.hp-shop-btn', streamLinks.shop || '#');`,
    `  href('.hp-hero-ctas .hp-btn-outline', streamLinks.shop || '#');`,
    `  href('.hp-hero-ctas .hp-btn-watch', streamLinks.watch || streamLinks.tiktok || '#');`,
    `  href('.hp-signup-consent a', footerLinks.privacy || '#');`,
    `  all('.hp-footer-col:nth-of-type(2) a').forEach(function (node) { var label = (node.textContent || '').trim(); var value = label === 'Home' ? (footerLinks.home || '/amethyst/Homepage.html') : label === 'Dance Floor' ? (footerLinks.tradeBoard || '/amethyst/Trade.html') : label === 'In the Pantry' ? (content.pantryPageUrl || '') : label === 'Join Team' ? (footerLinks.joinTeam || '') : ''; if (value) node.setAttribute('href', value); if (!value) { var item = node.closest('li'); if (item) item.style.display = 'none'; } });`,
    `  [footerLinks.privacy, footerLinks.terms, footerLinks.accessibility].forEach(function (value, index) { var node = all('.legal-row a')[index]; if (node && value) node.setAttribute('href', value); });`,
    `};`,
  ].join('\n')
}
