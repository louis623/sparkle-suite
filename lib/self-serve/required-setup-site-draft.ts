import {
  firstRequiredSetupDraftText as firstText,
  normalizeRequiredSetupDraftState,
} from './required-setup-draft'
import { DEFAULT_AMETHYST_APPEARANCE_PRESET } from '@/lib/amethyst/appearance-presets'
import { isAmethystSkinSelectionAvailableToRep } from '@/lib/amethyst/skin-cards'
import type { RequiredSetupState } from './required-setup'
import { trustedReviewerSetupIdentity } from '@/lib/reviewer-smoke/identity'

type RequiredSetupDraftAdminClient = {
  from(table: string): unknown
}

function withoutEmptyValues(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (typeof value === 'string') return value.trim().length > 0
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value).length > 0
      }
      return value !== undefined && value !== null
    }),
  )
}

export function buildRequiredSetupCustomerSiteDraft(state: RequiredSetupState) {
  const draft = normalizeRequiredSetupDraftState(state)

  return {
    conversationName: draft.conversationName,
    customerFacingDisplayName: draft.customerFacingDisplayName,
    liveShowName: draft.liveShowName,
    bestContactEmail: draft.bestContactEmail,
    bombPartyRepStoreLink: draft.bombPartyRepStoreLink,
    primaryLiveShowOrSocialLink: draft.primaryLiveShowOrSocialLink,
    primarySocialLinks: draft.primarySocialLinks,
    appearancePreset: draft.appearancePreset,
    welcomeHeadline: draft.welcomeHeadline,
    welcomeSupportingLine: draft.welcomeSupportingLine,
  }
}

export async function publishRequiredSetupCustomerSiteDraft(
  admin: RequiredSetupDraftAdminClient,
  state: RequiredSetupState,
) {
  if (!state.repId) return
  const draft = buildRequiredSetupCustomerSiteDraft(state)
  if (
    draft.appearancePreset &&
    !isAmethystSkinSelectionAvailableToRep(draft.appearancePreset, state.repId)
  ) {
    throw new Error('That customer-facing site theme is not available to this account.')
  }
  const reviewer = await trustedReviewerSetupIdentity(
    admin as Parameters<typeof trustedReviewerSetupIdentity>[0], state.repId,
  )
  const hasSiteDraft =
    Boolean(draft.welcomeHeadline) ||
    Boolean(draft.welcomeSupportingLine) ||
    Boolean(draft.liveShowName) ||
    Boolean(draft.customerFacingDisplayName) ||
    Boolean(draft.appearancePreset)
  const repPatch = withoutEmptyValues({
    display_name: draft.conversationName,
    business_name: draft.customerFacingDisplayName,
    // A reviewer's contact answer is synthetic draft content, not authority to
    // reassign its reset/login identity. Ordinary customer behavior is unchanged.
    email: reviewer ? undefined : draft.bestContactEmail,
    shop_link: draft.bombPartyRepStoreLink,
    streaming_links: draft.primarySocialLinks,
    social_handles: draft.primarySocialLinks,
  })
  const siteSettingsPatch = withoutEmptyValues({
    rep_id: state.repId,
    banner_text: draft.welcomeHeadline,
    banner_visible: Boolean(draft.welcomeHeadline) || undefined,
    tagline: draft.welcomeSupportingLine,
    team_name: firstText(draft.liveShowName, draft.customerFacingDisplayName),
    customer_site_template: 'amethyst',
    appearance_preset: draft.appearancePreset ?? DEFAULT_AMETHYST_APPEARANCE_PRESET,
  })

  if (Object.keys(repPatch).length > 0) {
    const query = (admin.from('reps') as {
      update(patch: Record<string, unknown>): {
        eq(column: string, value: string): Promise<{ error: unknown }>
      }
    }).update(repPatch)
    const { error } = await query.eq('id', state.repId)
    if (error) throw error
  }

  if (!hasSiteDraft) return

  const { error } = await (admin.from('site_settings') as {
    upsert(
      patch: Record<string, unknown>,
      options: { onConflict: string },
    ): Promise<{ error: unknown }>
  }).upsert(siteSettingsPatch, { onConflict: 'rep_id' })
  if (error) throw error
}
