import type { SiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'
import {
  collectSiteSettingsFieldErrors,
  shopLinkFieldError,
  SITE_FIELD_IDS,
} from '@/app/nic-nac/components/site-settings-save'
import { SOCIAL_PLATFORMS } from '@/lib/public-site/social-visibility'

export const SITE_SECTION_ORDER = [
  'top-bar',
  'hero',
  'upcoming-shows',
  'bomb-party',
  'about',
  'signup',
  'footer',
  'other-pages',
] as const

export type SiteSectionId = (typeof SITE_SECTION_ORDER)[number]

export const SETUP_FIELD_IDS = {
  businessName: 'my-website-business-name',
  displayName: 'my-website-display-name',
  shopLink: SITE_FIELD_IDS.shopLink,
  headline: 'my-website-hero-headline',
  aboutStory: 'my-website-about-narrative',
  aboutPhoto: 'my-website-about-photo',
  social: SITE_FIELD_IDS.social('instagram'),
} as const

export const SHOWS_ON = {
  businessName: 'The name at the top of every page',
  displayName: 'Your name in the hero, About, and Join',
  shopLink: 'Every Shop button on your site',
  ticker: 'The scrolling announcements at the top of your site',
  showAnnouncements: 'The announcements bar at the top of your site',
  heroTitle: 'The big headline on your homepage',
  heroSubtitle: 'The line under your headline',
  heroSocials: 'Hero buttons',
  heroMotion: 'Your hero animation',
  upcomingShows: 'Homepage, under the hero',
  revealVideo: "The “It's a live jewelry reveal” block",
  revealCaption: 'Under the live reveal video',
  aboutTitle: 'The About heading',
  aboutStory: 'The About story',
  aboutPhoto: 'The About photo',
  smartFrame: 'The crop of your About photo',
  photoCaption: 'Under your About photo',
  aboutVideo: 'Short videos in your About section',
  videoCaption: 'Under each About video',
  brittSection: 'The About Brittany and Sparkle Moments section',
  signupSwitch: 'The sign-up confirmation',
  discountCode: 'The discount code after customers sign up',
  discountMessage: 'The line shown with your discount code',
  tagline: 'The footer of every page',
  email: 'Join page Contact',
  social: 'Footer icons on every page; hero buttons when Show in hero is on',
  memberTeam: 'Small print on your homepage, Join, and Dance Floor',
  managedTeam: 'The Join page and New Rep Onboarding',
  danceFloor: 'Your Dance Floor page and its links',
  joinTeam: 'Your Join page and its links',
  liveLineup: 'The live lineup on your pages',
} as const

const FIELD_SECTION: Record<string, SiteSectionId> = {
  [SITE_FIELD_IDS.shopLink]: 'top-bar',
  [SITE_FIELD_IDS.email]: 'footer',
  [SITE_FIELD_IDS.discountCode]: 'signup',
  [SITE_FIELD_IDS.discountMessage]: 'signup',
  ...Object.fromEntries(
    SOCIAL_PLATFORMS.map((platform) => [SITE_FIELD_IDS.social(platform.key), 'footer' as const]),
  ),
}

export type SiteSetupItem = {
  id: string
  label: string
  section: SiteSectionId
  fieldId: string
  done: boolean
}

function filled(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function aboutPhotoReady(draft: SiteSettingsDraft) {
  const slot = draft.homepageMediaSlots?.find((item) => item.key === 'about_1')
  return Boolean(slot?.imageUrl?.trim()) && slot?.isVisible !== false
}

function socialReady(draft: SiteSettingsDraft) {
  return SOCIAL_PLATFORMS.some((platform) => filled(draft.socialHandles?.[platform.key]))
}

export function buildSiteSetupChecklist(
  draft: SiteSettingsDraft | null | undefined,
): SiteSetupItem[] {
  const current = draft
  return [
    {
      id: 'business-name',
      label: 'Business name',
      section: 'top-bar',
      fieldId: SETUP_FIELD_IDS.businessName,
      done: filled(current?.businessName),
    },
    {
      id: 'first-name',
      label: 'Your first name',
      section: 'top-bar',
      fieldId: SETUP_FIELD_IDS.displayName,
      done: filled(current?.displayName),
    },
    {
      id: 'store-link',
      label: 'Store link',
      section: 'top-bar',
      fieldId: SETUP_FIELD_IDS.shopLink,
      done: filled(current?.shopLink) && !shopLinkFieldError(current?.shopLink),
    },
    {
      id: 'headline',
      label: 'Big headline',
      section: 'hero',
      fieldId: SETUP_FIELD_IDS.headline,
      done: filled(current?.heroHeadline),
    },
    {
      id: 'about-story',
      label: 'About story',
      section: 'about',
      fieldId: SETUP_FIELD_IDS.aboutStory,
      done: filled(current?.aboutNarrative),
    },
    {
      id: 'about-photo',
      label: 'About photo',
      section: 'about',
      fieldId: SETUP_FIELD_IDS.aboutPhoto,
      done: current ? aboutPhotoReady(current) : false,
    },
    {
      id: 'social-link',
      label: 'At least one social link',
      section: 'footer',
      fieldId: SETUP_FIELD_IDS.social,
      done: current ? socialReady(current) : false,
    },
  ]
}

export function siteSetupRemaining(items: SiteSetupItem[]) {
  return items.filter((item) => !item.done)
}

export function siteSetupRemainingLabel(count: number) {
  return count === 1 ? '1 thing left to finish' : `${count} things left to finish`
}

export function siteSectionStatus({
  section,
  checklist,
  draft,
}: {
  section: SiteSectionId
  checklist: SiteSetupItem[]
  draft: SiteSettingsDraft | null | undefined
}) {
  const fieldErrors = draft ? collectSiteSettingsFieldErrors(draft) : []
  const gaps = checklist.filter((item) => item.section === section && !item.done)
  const gapFields = new Set(gaps.map((item) => item.fieldId))
  const extraErrors = fieldErrors.filter(
    (error) => FIELD_SECTION[error.id] === section && !gapFields.has(error.id),
  )
  const total = gaps.length + extraErrors.length
  if (section === 'about' && total === 1 && gaps.length === 1 && gaps[0]?.id === 'about-photo') {
    return 'Add photo'
  }
  if (total > 0) return `Fix ${total}`
  if (section === 'signup' && draft?.signupDiscountEnabled !== true) return 'Off'
  if (section === 'top-bar' && draft?.tickerVisible === false) return 'Off'
  if (section === 'other-pages' && draft) {
    const danceOff = draft.danceFloorVisible === false
    const lineupOff = draft.liveLineupVisible === false
    const joinAvailable = draft.joinTeamAccessEnabled === true
    const joinOff = !joinAvailable || draft.showJoinPage !== true
    if (danceOff && lineupOff && joinOff) return 'Off'
  }
  return 'Done'
}

export function openWorkspaceSection(href: string) {
  if (typeof window === 'undefined') return
  const url = new URL(href, window.location.origin)
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
