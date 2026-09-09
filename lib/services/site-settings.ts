import type { SupabaseClient } from '@supabase/supabase-js'
import { ServiceError, errors } from '@/lib/services/errors'
import {
  normalizeAmethystAppearancePreset,
  normalizeCustomerSiteTemplate,
} from '@/lib/amethyst/appearance-presets'
import {
  isSupportedPublicVideoUrl,
  normalizePublicMediaUrl,
} from '@/lib/public-site/media-url'
import type {
  HeroAnimationType,
  PublicSiteMediaSlot,
  PublicSiteMediaSlotKey,
  SiteSettingsDashboardResult,
  UpdateSiteSettingsDashboardInput,
} from '@/lib/services/types'
import {
  ABOUT_NARRATIVE_MAX_LENGTH,
  ABOUT_TITLE_MAX_LENGTH,
} from '@/lib/public-site/about-section'

type SiteSettingsRow = {
  banner_text: string | null
  banner_visible: boolean | null
  ticker_text: string | null
  ticker_visible: boolean | null
  tagline: string | null
  hero_headline: string | null
  hero_subtitle: string | null
  hero_image_url: string | null
  hero_animation_type: string | null
  team_name: string | null
  member_team_name: string | null
  join_team_access_enabled: boolean | null
  show_join_page: boolean | null
  customer_site_template: string | null
  appearance_preset: string | null
  about_heading: string | null
  about_subheading: string | null
  about_narrative: string | null
  homepage_media_slots: unknown
}

type RepProfileRow = {
  display_name: string
  business_name: string
  email: string
  phone: string | null
  shop_link: string | null
  social_handles: Record<string, string> | null
}

const SITE_SETTINGS_SELECT =
  'banner_text, banner_visible, ticker_text, ticker_visible, tagline, hero_headline, hero_subtitle, hero_image_url, hero_animation_type, team_name, member_team_name, join_team_access_enabled, show_join_page, customer_site_template, appearance_preset, about_heading, about_subheading, about_narrative, homepage_media_slots'
const REP_PROFILE_SELECT =
  'display_name, business_name, email, phone, shop_link, social_handles'

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableText(value: string | undefined) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function normalizePhone(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value: string | undefined) {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.toLowerCase() : ''
}

function normalizeHeroAnimationType(
  value: string | null | undefined,
): HeroAnimationType {
  if (value === 'still' || value === 'sparkle_rise' || value === 'soft_glow') {
    return value
  }
  if (value === 'pan') return 'soft_glow'
  return 'sparkle_rise'
}

function normalizeAboutNarrative(value: string) {
  const normalized = normalizeNullableText(value)
  if (normalized && normalized.length > ABOUT_NARRATIVE_MAX_LENGTH) {
    throw errors.INVALID_INPUT(
      'aboutNarrative exceeds the maximum length',
      `About narrative can be up to ${ABOUT_NARRATIVE_MAX_LENGTH} characters.`,
    )
  }
  return normalized
}

function normalizeShopLink(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw errors.INVALID_INPUT(
      'shopLink must be a string',
      'Bomb Party rep store link needs a complete https:// or http:// URL.',
    )
  }
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('unsupported protocol')
    }
    return url.toString()
  } catch {
    throw errors.INVALID_INPUT(
      'shopLink must be a complete http(s) URL',
      'Bomb Party rep store link needs a complete https:// or http:// URL.',
    )
  }
}

function normalizeSocialHandles(
  value: Record<string, string> | null | undefined,
): Record<string, string> {
  if (!value) return {}

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, handle]) => [key.trim(), handle.trim()] as const)
      .filter(([key, handle]) => key.length > 0 && handle.length > 0),
  )
}

const PUBLIC_SITE_MEDIA_SLOT_KEYS: PublicSiteMediaSlotKey[] = [
  'showcase',
  'about_1',
  'about_2',
  'about_3',
  'about_4',
]

export function getDefaultPublicSiteMediaSlots(): PublicSiteMediaSlot[] {
  return PUBLIC_SITE_MEDIA_SLOT_KEYS.map((key) => ({
    key,
    caption: '',
    imageUrl: '',
    videoUrl: '',
  }))
}

function normalizePortraitFramingValue(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, Math.round(parsed * 100) / 100))
}

export function normalizePublicSiteMediaSlots(
  value: unknown,
  options: { rejectInvalidUrls?: boolean } = {},
): PublicSiteMediaSlot[] {
  const rows = Array.isArray(value) ? value : []
  const byKey = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const record = row as Record<string, unknown>
    if (typeof record.key === 'string') byKey.set(record.key, record)
  }

  return PUBLIC_SITE_MEDIA_SLOT_KEYS.map((key) => {
    const row = byKey.get(key)
    const imageUrl = normalizePublicMediaUrl(row?.imageUrl)
    const videoUrl = normalizePublicMediaUrl(row?.videoUrl)
    const mediaLabel =
      key === 'showcase'
        ? 'Showcase video'
        : key === 'about_1'
          ? 'About portrait photo'
          : `About short video ${Number(key.slice(-1)) - 1}`

    if (
      options.rejectInvalidUrls &&
      typeof row?.imageUrl === 'string' &&
      row.imageUrl.trim() &&
      !imageUrl
    ) {
      throw errors.INVALID_INPUT(
        `${key} image URL is invalid`,
        `${mediaLabel} needs a valid photo URL.`,
      )
    }

    if (
      options.rejectInvalidUrls &&
      typeof row?.videoUrl === 'string' &&
      row.videoUrl.trim() &&
      (!videoUrl || !isSupportedPublicVideoUrl(videoUrl))
    ) {
      throw errors.INVALID_INPUT(
        `${key} video URL or embed code is invalid`,
        `${mediaLabel} needs a public TikTok, YouTube, Instagram, or Facebook video URL or embed code.`,
      )
    }

    const caption =
      typeof row?.caption === 'string' ? row.caption.trim().slice(0, 240) : ''

    const hasPortraitFraming =
      key === 'about_1' &&
      ['portraitFocusX', 'portraitFocusY', 'portraitZoom'].some(
        (framingKey) => row?.[framingKey] !== undefined,
      )
    const portraitFraming =
      hasPortraitFraming
        ? {
            portraitFocusX: normalizePortraitFramingValue(row?.portraitFocusX, 50, 0, 100),
            portraitFocusY: normalizePortraitFramingValue(row?.portraitFocusY, 20, 0, 100),
            portraitZoom: normalizePortraitFramingValue(row?.portraitZoom, 1.18, 1, 1.5),
          }
        : {}
    const visibility =
      typeof row?.isVisible === 'boolean' ? { isVisible: row.isVisible } : {}
    const sectionVisibility =
      key === 'about_1' && typeof row?.sectionVisible === 'boolean'
        ? { sectionVisible: row.sectionVisible }
        : {}

    return {
      key,
      caption: key === 'about_1' ? caption : '',
      // Keep legacy images in About short video 1 stored rather than silently
      // deleting them on a settings save. New UI only exposes images for the
      // portrait card, and the public template never renders these legacy URLs.
      imageUrl: key === 'showcase' ? '' : imageUrl,
      videoUrl: key === 'about_1' ? '' : videoUrl,
      ...visibility,
      ...sectionVisibility,
      ...portraitFraming,
    }
  })
}

function buildDashboardResult(args: {
  siteSettings: SiteSettingsRow | null
  repProfile: RepProfileRow
}): SiteSettingsDashboardResult {
  return {
    displayName: args.repProfile.display_name,
    businessName: args.repProfile.business_name,
    email: args.repProfile.email,
    phone: normalizePhone(args.repProfile.phone),
    shopLink: normalizeText(args.repProfile.shop_link),
    bannerText: normalizeText(args.siteSettings?.banner_text),
    bannerVisible: args.siteSettings?.banner_visible ?? false,
    tickerText: normalizeText(args.siteSettings?.ticker_text),
    tickerVisible: args.siteSettings?.ticker_visible ?? false,
    tagline: normalizeText(args.siteSettings?.tagline),
    heroHeadline: normalizeText(args.siteSettings?.hero_headline),
    heroSubtitle: normalizeText(args.siteSettings?.hero_subtitle),
    heroImageUrl: normalizeText(args.siteSettings?.hero_image_url),
    heroAnimationType: normalizeHeroAnimationType(
      args.siteSettings?.hero_animation_type,
    ),
    teamName: normalizeText(args.siteSettings?.team_name),
    memberTeamName: normalizeText(args.siteSettings?.member_team_name),
    joinTeamAccessEnabled: args.siteSettings?.join_team_access_enabled === true,
    showJoinPage: args.siteSettings?.show_join_page ?? true,
    customerSiteTemplate: normalizeCustomerSiteTemplate(
      args.siteSettings?.customer_site_template,
    ),
    appearancePreset: normalizeAmethystAppearancePreset(
      args.siteSettings?.appearance_preset,
    ),
    socialHandles: normalizeSocialHandles(args.repProfile.social_handles),
    aboutHeading: normalizeText(args.siteSettings?.about_heading),
    aboutSubheading: normalizeText(args.siteSettings?.about_subheading),
    aboutNarrative: normalizeText(args.siteSettings?.about_narrative),
    homepageMediaSlots: normalizePublicSiteMediaSlots(
      args.siteSettings?.homepage_media_slots,
    ),
  }
}

function toServiceError(
  code: string,
  message: string,
  userMessage: string,
  cause: unknown,
  statusCode = 500,
) {
  return new ServiceError({
    code,
    message,
    userMessage,
    cause,
    statusCode,
  })
}

export async function getSiteSettingsDashboard(
  supabase: SupabaseClient,
  repId: string,
): Promise<SiteSettingsDashboardResult> {
  const [siteSettingsResult, repProfileResult] = await Promise.all([
    supabase
      .from('site_settings')
      .select(SITE_SETTINGS_SELECT)
      .eq('rep_id', repId)
      .maybeSingle(),
    supabase
      .from('reps')
      .select(REP_PROFILE_SELECT)
      .eq('id', repId)
      .single(),
  ])

  if (siteSettingsResult.error) {
    throw toServiceError(
      'SITE_SETTINGS_LOOKUP_FAILED',
      'failed to load site settings',
      "I couldn't load your site settings right now.",
      siteSettingsResult.error,
    )
  }

  if (repProfileResult.error || !repProfileResult.data) {
    throw toServiceError(
      'REP_PROFILE_LOOKUP_FAILED',
      'failed to load rep profile',
      "I couldn't load your profile right now.",
      repProfileResult.error ?? new Error('rep profile row missing'),
    )
  }

  return buildDashboardResult({
    siteSettings: (siteSettingsResult.data as SiteSettingsRow | null) ?? null,
    repProfile: repProfileResult.data as RepProfileRow,
  })
}

export async function getTargetedJoinPageAccessFlags(
  supabase: SupabaseClient,
  repId: string,
) {
  const { data, error } = await supabase
    .from('site_settings')
    .select('join_team_access_enabled, show_join_page')
    .eq('rep_id', repId)
    .maybeSingle<
      Pick<SiteSettingsRow, 'join_team_access_enabled' | 'show_join_page'>
    >()

  if (error) {
    throw toServiceError(
      'SITE_SETTINGS_LOOKUP_FAILED',
      'failed to load targeted Join page access settings',
      "I couldn't load this Join page right now.",
      error,
    )
  }

  return {
    joinTeamAccessEnabled: data?.join_team_access_enabled === true,
    showJoinPage: data?.show_join_page === true,
  }
}

export async function updateSiteSettingsDashboard(
  supabase: SupabaseClient,
  repId: string,
  input: UpdateSiteSettingsDashboardInput,
): Promise<SiteSettingsDashboardResult> {
  const siteSettingsPatch: Record<string, unknown> = {}
  const repPatch: Record<string, unknown> = {}

  if (input.bannerText !== undefined) {
    siteSettingsPatch.banner_text = normalizeNullableText(input.bannerText)
  }
  if (input.bannerVisible !== undefined) {
    siteSettingsPatch.banner_visible = input.bannerVisible
  }
  if (input.tickerText !== undefined) {
    siteSettingsPatch.ticker_text = normalizeNullableText(input.tickerText)
  }
  if (input.tickerVisible !== undefined) {
    siteSettingsPatch.ticker_visible = input.tickerVisible
  }
  if (input.tagline !== undefined) {
    siteSettingsPatch.tagline = normalizeNullableText(input.tagline)
  }
  if (input.heroImageUrl !== undefined) {
    siteSettingsPatch.hero_image_url = normalizeNullableText(input.heroImageUrl)
  }
  if (input.heroAnimationType !== undefined) {
    if (
      input.heroAnimationType !== 'still' &&
      input.heroAnimationType !== 'sparkle_rise' &&
      input.heroAnimationType !== 'soft_glow'
    ) {
      throw errors.INVALID_INPUT(
        'heroAnimationType must be still, sparkle_rise, or soft_glow',
        'Hero motion must be Still, Sparkle rise, or Soft glow.',
      )
    }
    siteSettingsPatch.hero_animation_type = input.heroAnimationType
  }
  if (input.teamName !== undefined) {
    siteSettingsPatch.team_name = normalizeNullableText(input.teamName)
  }
  if (input.memberTeamName !== undefined) {
    siteSettingsPatch.member_team_name = normalizeNullableText(input.memberTeamName)
  }
  if (input.showJoinPage !== undefined) {
    siteSettingsPatch.show_join_page = input.showJoinPage
  }
  if (input.customerSiteTemplate !== undefined) {
    siteSettingsPatch.customer_site_template = normalizeCustomerSiteTemplate(
      input.customerSiteTemplate,
    )
  }
  if (input.heroHeadline !== undefined) {
    siteSettingsPatch.hero_headline = normalizeNullableText(input.heroHeadline.slice(0, 180))
  }
  if (input.heroSubtitle !== undefined) {
    siteSettingsPatch.hero_subtitle = normalizeNullableText(input.heroSubtitle.slice(0, 240))
  }
  if (input.appearancePreset !== undefined) {
    siteSettingsPatch.appearance_preset = normalizeAmethystAppearancePreset(
      input.appearancePreset,
    )
  }
  if (input.aboutHeading !== undefined) {
    siteSettingsPatch.about_heading = normalizeNullableText(
      input.aboutHeading.slice(0, ABOUT_TITLE_MAX_LENGTH),
    )
  }
  if (input.aboutSubheading !== undefined) {
    siteSettingsPatch.about_subheading = normalizeNullableText(input.aboutSubheading.slice(0, 240))
  }
  if (input.aboutNarrative !== undefined) {
    siteSettingsPatch.about_narrative = normalizeAboutNarrative(input.aboutNarrative)
  }
  if (input.homepageMediaSlots !== undefined) {
    siteSettingsPatch.homepage_media_slots = normalizePublicSiteMediaSlots(
      input.homepageMediaSlots,
      { rejectInvalidUrls: true },
    )
  }

  if (input.displayName !== undefined) {
    repPatch.display_name = normalizeText(input.displayName)
  }
  if (input.businessName !== undefined) {
    repPatch.business_name = normalizeText(input.businessName)
  }
  if (input.email !== undefined) {
    repPatch.email = normalizeEmail(input.email)
  }
  if (input.phone !== undefined) {
    repPatch.phone = normalizeNullableText(input.phone)
  }
  if (input.shopLink !== undefined) {
    repPatch.shop_link = normalizeShopLink(input.shopLink)
  }
  if (input.socialHandles !== undefined) {
    repPatch.social_handles = normalizeSocialHandles(input.socialHandles)
  }

  if (
    Object.keys(siteSettingsPatch).length === 0 &&
    Object.keys(repPatch).length === 0
  ) {
    throw errors.INVALID_INPUT(
      'no site settings fields provided',
      'Tell me what you want to change on your site.',
    )
  }

  let siteSettingsRow: SiteSettingsRow | null = null
  let repProfileRow: RepProfileRow | null = null

  if (Object.keys(siteSettingsPatch).length > 0) {
    const { data, error } = await supabase
      .from('site_settings')
      .upsert(
        {
          rep_id: repId,
          ...siteSettingsPatch,
        },
        { onConflict: 'rep_id' },
      )
      .select(SITE_SETTINGS_SELECT)
      .single()

    if (error || !data) {
      throw toServiceError(
        'SITE_SETTINGS_UPDATE_FAILED',
        'failed to save site settings',
        "I couldn't save your site settings right now.",
        error ?? new Error('site settings upsert returned no row'),
      )
    }

    siteSettingsRow = data as SiteSettingsRow
  }

  if (Object.keys(repPatch).length > 0) {
    const { data, error } = await supabase
      .from('reps')
      .update(repPatch)
      .eq('id', repId)
      .select(REP_PROFILE_SELECT)
      .single()

    if (error || !data) {
      throw toServiceError(
        'REP_PROFILE_UPDATE_FAILED',
        'failed to save rep profile',
        "I couldn't save your profile right now.",
        error ?? new Error('rep update returned no row'),
      )
    }

    repProfileRow = data as RepProfileRow
  }

  if (!repProfileRow) {
    const { data, error } = await supabase
      .from('reps')
      .select(REP_PROFILE_SELECT)
      .eq('id', repId)
      .single()

    if (error || !data) {
      throw toServiceError(
        'REP_PROFILE_LOOKUP_FAILED',
        'failed to load rep profile after site settings save',
        "I couldn't reload your profile after saving.",
        error ?? new Error('rep profile row missing after site settings save'),
      )
    }

    repProfileRow = data as RepProfileRow
  }

  return buildDashboardResult({
    siteSettings: siteSettingsRow,
    repProfile: repProfileRow,
  })
}
