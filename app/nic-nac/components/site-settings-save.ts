import { resolveSocialPlatformUrl } from '@/lib/public-site/social-hero'
import {
  normalizeSignupDiscountCode,
  normalizeSignupDiscountMessage,
} from '@/lib/public-site/signup-discount'
import {
  SOCIAL_PLATFORMS,
  type SocialPlatformKey,
} from '@/lib/public-site/social-visibility'
import type { SiteSettingsDraft } from '@/app/nic-nac/components/DashboardPlaceholder'
import type { PublicSiteMediaSlot } from '@/lib/services/types'

export const SITE_FIELD_IDS = {
  discountCode: 'my-website-discount-code',
  discountMessage: 'my-website-discount-message',
  email: 'my-website-email',
  shopLink: 'my-website-shop-link',
  social: (platform: string) => `my-website-social-${platform}`,
} as const

export const SHOP_LINK_ERROR =
  'Bomb Party rep store link needs a complete https:// or http:// URL.'
export const EMAIL_ERROR = 'Enter an email address in the format you@example.com.'
export const DISCOUNT_CODE_ERROR = 'Use 1 to 40 letters, numbers, or hyphens.'
export const DISCOUNT_MESSAGE_ERROR =
  'Use up to 140 characters of plain text, without < or >.'
export const SAVED_LABEL = 'Saved'

const HTML_EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export type SiteSettingsFieldError = {
  id: string
  label: string
  message: string
}

export function unsavedChangesLabel(count: number) {
  return `${count} unsaved ${count === 1 ? 'change' : 'changes'}`
}

export function discardConfirmMessage(count: number) {
  return `Discard ${count} unsaved changes? Photos you uploaded stay uploaded but won't show on your site; removed videos stay removed.`
}

export function formatSiteSaveFailure(message: string) {
  const text = message.replace(/\s+/g, ' ').trim() || 'Try again in a moment.'
  if (/^couldn't save\./i.test(text)) return text
  return `Couldn't save. ${text}`
}

export function shopLinkFieldError(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return SHOP_LINK_ERROR
    return null
  } catch {
    return SHOP_LINK_ERROR
  }
}

export function emailFieldError(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  return HTML_EMAIL.test(trimmed) ? null : EMAIL_ERROR
}

export function discountCodeFieldError(code: string | null | undefined, enabled: boolean | undefined) {
  const value = code ?? ''
  if ((value.trim() || enabled === true) && !normalizeSignupDiscountCode(value)) {
    return DISCOUNT_CODE_ERROR
  }
  return null
}

export function discountMessageFieldError(message: string | null | undefined) {
  const value = message ?? ''
  if (value.trim() && !normalizeSignupDiscountMessage(value)) return DISCOUNT_MESSAGE_ERROR
  return null
}

export function socialLinkFieldError(platform: SocialPlatformKey, value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return null
  if (resolveSocialPlatformUrl(platform, trimmed)) return null
  const label = SOCIAL_PLATFORMS.find((item) => item.key === platform)?.label ?? 'social'
  return `Use a real ${label} link to choose footer and hero.`
}

export function collectSiteSettingsFieldErrors(draft: SiteSettingsDraft): SiteSettingsFieldError[] {
  const errors: SiteSettingsFieldError[] = []
  const discountCode = discountCodeFieldError(draft.signupDiscountCode, draft.signupDiscountEnabled)
  if (discountCode) {
    errors.push({ id: SITE_FIELD_IDS.discountCode, label: 'Discount code', message: discountCode })
  }
  const discountMessage = discountMessageFieldError(draft.signupDiscountMessage)
  if (discountMessage) {
    errors.push({
      id: SITE_FIELD_IDS.discountMessage,
      label: 'Discount message',
      message: discountMessage,
    })
  }
  const email = emailFieldError(draft.email)
  if (email) errors.push({ id: SITE_FIELD_IDS.email, label: 'Email', message: email })
  const shopLink = shopLinkFieldError(draft.shopLink)
  if (shopLink) {
    errors.push({ id: SITE_FIELD_IDS.shopLink, label: 'Bomb Party rep store link', message: shopLink })
  }
  for (const platform of SOCIAL_PLATFORMS) {
    const social = socialLinkFieldError(platform.key, draft.socialHandles?.[platform.key])
    if (social) {
      errors.push({
        id: SITE_FIELD_IDS.social(platform.key),
        label: platform.label,
        message: social,
      })
    }
  }
  return errors
}

export function requestSiteSettingsSave(draft: SiteSettingsDraft, save: () => void) {
  const errors = collectSiteSettingsFieldErrors(draft)
  if (errors.length > 0) {
    if (typeof document !== 'undefined') {
      document.getElementById(errors[0].id)?.focus()
    }
    return { ok: false as const, errors }
  }
  save()
  return { ok: true as const, errors }
}

function sameText(left: unknown, right: unknown) {
  return String(left ?? '') === String(right ?? '')
}

function mediaLabel(key: string, isBrittWithBling: boolean) {
  if (key === 'showcase') {
    return isBrittWithBling ? 'What is a Bomb Party? showcase video' : 'Live reveal video'
  }
  if (key === 'about_1') {
    return isBrittWithBling ? 'About Brittany portrait' : 'About portrait photo'
  }
  const index = Number(String(key).slice(-1)) - 1
  return isBrittWithBling ? `Sparkle moment ${index}` : `About short video ${index}`
}

const TEXT_FIELDS: Array<[keyof SiteSettingsDraft, string]> = [
  ['displayName', 'Display name'],
  ['businessName', 'Show name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['shopLink', 'Bomb Party rep store link'],
  ['recruitingLink', 'Recruiting link'],
  ['bannerText', 'Banner'],
  ['tickerText', 'Announcement ticker'],
  ['teamName', 'Team I manage'],
  ['memberTeamName', 'Team I belong to'],
  ['tagline', 'Site tagline'],
  ['heroHeadline', 'Hero title'],
  ['heroSubtitle', 'Hero subtitle'],
  ['heroImageUrl', 'Hero image'],
  ['aboutHeading', 'About title'],
  ['aboutSubheading', 'About subtitle'],
  ['aboutNarrative', 'About narrative'],
  ['signupDiscountCode', 'Discount code'],
  ['signupDiscountMessage', 'Discount message'],
  ['signupDiscountOffer', 'Discount offer'],
  ['profilePhotoUrl', 'Profile photo'],
]

const OFF_SWITCHES: Array<[keyof SiteSettingsDraft, string]> = [
  ['bannerVisible', 'Banner visibility'],
  ['tickerVisible', 'Announcements'],
  ['showJoinPage', 'Join Team'],
  ['signupDiscountEnabled', 'Signup discount'],
]

const ON_SWITCHES: Array<[keyof SiteSettingsDraft, string]> = [
  ['danceFloorVisible', 'Dance Floor'],
  ['liveLineupVisible', 'Live Lineup'],
]

function sameOffSwitch(left: unknown, right: unknown) {
  return Boolean(left) === Boolean(right)
}

function sameOnSwitch(left: unknown, right: unknown) {
  return (left !== false) === (right !== false)
}

function slotMap(slots: PublicSiteMediaSlot[] | undefined) {
  return new Map((slots ?? []).map((slot) => [slot.key, slot]))
}

export function listSiteSettingsChanges(
  saved: SiteSettingsDraft,
  draft: SiteSettingsDraft,
  options: { isBrittWithBling?: boolean } = {},
) {
  const labels: string[] = []
  if (saved.appearancePreset !== draft.appearancePreset) labels.push('Theme')
  for (const [key, label] of TEXT_FIELDS) {
    if (!sameText(saved[key], draft[key])) labels.push(label)
  }
  for (const [key, label] of OFF_SWITCHES) {
    if (!sameOffSwitch(saved[key], draft[key])) labels.push(label)
  }
  for (const [key, label] of ON_SWITCHES) {
    if (!sameOnSwitch(saved[key], draft[key])) labels.push(label)
  }
  if (saved.heroAnimationType !== draft.heroAnimationType) labels.push('Hero motion')
  if (JSON.stringify(saved.profilePhotoFraming ?? null) !== JSON.stringify(draft.profilePhotoFraming ?? null)) {
    labels.push('Profile photo framing')
  }
  if (JSON.stringify(saved.socialVisibility ?? null) !== JSON.stringify(draft.socialVisibility ?? null)) {
    labels.push('Social visibility')
  }

  const savedHandles = saved.socialHandles ?? {}
  const draftHandles = draft.socialHandles ?? {}
  const handleKeys = new Set([...Object.keys(savedHandles), ...Object.keys(draftHandles)])
  for (const platform of SOCIAL_PLATFORMS) {
    if (!sameText(savedHandles[platform.key], draftHandles[platform.key])) labels.push(platform.label)
    handleKeys.delete(platform.key)
  }
  for (const key of handleKeys) {
    if (!sameText(savedHandles[key], draftHandles[key])) labels.push(key)
  }

  const savedSlots = slotMap(saved.homepageMediaSlots)
  const draftSlots = slotMap(draft.homepageMediaSlots)
  const slotKeys = new Set([...savedSlots.keys(), ...draftSlots.keys()])
  for (const key of slotKeys) {
    const before = savedSlots.get(key)
    const after = draftSlots.get(key)
    const name = mediaLabel(key, options.isBrittWithBling === true)
    if (!sameText(before?.imageUrl, after?.imageUrl)) {
      labels.push(/photo|portrait/i.test(name) ? name : `${name} photo`)
    }
    if (!sameText(before?.videoUrl, after?.videoUrl)) {
      labels.push(/video/i.test(name) ? name : `${name} video`)
    }
    if (!sameText(before?.caption, after?.caption)) labels.push(`${name} caption`)
    if (!sameOnSwitch(before?.isVisible, after?.isVisible)) labels.push(`${name} visibility`)
    if ((before?.sectionVisible === true) !== (after?.sectionVisible === true)) {
      labels.push(`${name} section`)
    }
  }

  return labels
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sameLeaf(left: unknown, right: unknown) {
  if (isRecord(left) || isRecord(right) || Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
  }
  return sameText(left, right) || left === right
}

/**
 * Keeps leaves the rep has edited. Leaves that still match the previous
 * saved snapshot take the newly saved value.
 */
export function mergePreparedSiteSettingsDraft(
  draft: SiteSettingsDraft,
  previousSaved: SiteSettingsDraft,
  nextSaved: SiteSettingsDraft,
): SiteSettingsDraft {
  return mergeDirty(draft, previousSaved, nextSaved) as SiteSettingsDraft
}

function mergeDirty(draft: unknown, previous: unknown, next: unknown): unknown {
  if (Array.isArray(next)) {
    const draftRows = Array.isArray(draft) ? draft : []
    const previousRows = Array.isArray(previous) ? previous : []
    return next.map((nextRow) => {
      if (!isRecord(nextRow)) return nextRow
      const key = nextRow.key
      const draftRow = draftRows.find((row) => isRecord(row) && row.key === key) ?? {}
      const previousRow = previousRows.find((row) => isRecord(row) && row.key === key) ?? {}
      return mergeDirty(draftRow, previousRow, nextRow)
    })
  }
  if (isRecord(next)) {
    const draftRecord = isRecord(draft) ? draft : {}
    const previousRecord = isRecord(previous) ? previous : {}
    const merged: Record<string, unknown> = {}
    const keys = new Set([...Object.keys(next), ...Object.keys(draftRecord)])
    for (const key of keys) {
      merged[key] = mergeDirty(draftRecord[key], previousRecord[key], next[key])
    }
    return merged
  }
  return sameLeaf(draft, previous) ? next : draft
}

/** A Nic-Nac settings GET may apply only if no save is in flight and nothing newer has landed. */
export function shouldApplyNicNacSiteRefresh(input: {
  startedVersion: number
  currentVersion: number
  savePending: boolean
}) {
  return !input.savePending && input.startedVersion === input.currentVersion
}

export function workspaceLeaveHref(input: {
  href: string | null | undefined
  currentHref: string
  target?: string | null
  download?: boolean
}) {
  if (!input.href || input.download || input.target === '_blank') return null
  let next: URL
  let current: URL
  try {
    current = new URL(input.currentHref)
    next = new URL(input.href, current)
  } catch {
    return null
  }
  if (next.origin !== current.origin) return null
  if (next.pathname === '/nic-nac' || next.pathname.startsWith('/nic-nac/')) return null
  return `${next.pathname}${next.search}${next.hash}`
}
