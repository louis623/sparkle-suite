import type { AmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { createAdminClient } from '@/lib/supabase/admin'

import {
  normalizeSignupDiscountOffer,
  normalizeSignupDiscountMessage,
  presentSignupDiscount,
} from './signup-discount'

export type SavedSignupDiscount = {
  code: string | null
  offer: string | null
  enabled: boolean
  message: string | null
}

type SignupDiscountClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: { signup_discount_code?: string | null; signup_discount_offer?: string | null; signup_discount_enabled?: boolean; signup_discount_message?: string | null } | null
          error: { message?: string } | null
        }>
      }
    }
  }
}

export async function loadSavedSignupDiscount(
  repId: string,
  supabase?: SignupDiscountClient,
): Promise<SavedSignupDiscount | null> {
  try {
    if (!supabase && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      return null
    }
    const client = supabase ?? (createAdminClient() as unknown as SignupDiscountClient)
    const { data, error } = await client
      .from('site_settings')
      .select('signup_discount_code, signup_discount_offer, signup_discount_enabled, signup_discount_message')
      .eq('rep_id', repId)
      .maybeSingle()
    if (error || !data) return null
    return {
      code: data.signup_discount_code ?? null,
      offer: data.signup_discount_offer ?? null,
      enabled: data.signup_discount_enabled === true,
      message: data.signup_discount_message ?? null,
    }
  } catch {
    return null
  }
}

export async function applySavedSignupDiscount<T extends AmethystHomepageTemplateData>(
  homepage: T,
  repId: string | null,
  load: (repId: string) => Promise<SavedSignupDiscount | null> = loadSavedSignupDiscount,
): Promise<T> {
  // Never carry a stale discount through an off setting or a failed lookup.
  const { signupDiscountCode: _code, signupDiscountOffer: _offer,
    signupDiscountEnabled: _enabled, signupDiscountMessage: _message, ...withoutDiscount } = homepage
  const cleanHomepage = (_code === undefined && _offer === undefined && _enabled === undefined && _message === undefined)
    ? homepage : withoutDiscount as T
  if (!repId) return cleanHomepage
  try {
    const saved = await load(repId)
    if (saved?.enabled !== true) return cleanHomepage
    const discount = presentSignupDiscount({
      signupDiscountCode: saved?.code,
      signupDiscountOffer: saved?.offer,
      signupDiscountMessage: saved?.message,
    })
    if (!discount) return cleanHomepage
    const offer = normalizeSignupDiscountOffer(saved?.offer)
    const message = normalizeSignupDiscountMessage(saved?.message)
    return {
      ...cleanHomepage,
      signupDiscountEnabled: true,
      signupDiscountCode: discount.code,
      ...(offer ? { signupDiscountOffer: offer } : {}),
      ...(message ? { signupDiscountMessage: message } : {}),
    }
  } catch {
    return cleanHomepage
  }
}
