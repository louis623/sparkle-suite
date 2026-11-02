import type { AmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'
import { createAdminClient } from '@/lib/supabase/admin'

import {
  normalizeSignupDiscountOffer,
  presentSignupDiscount,
} from './signup-discount'

export type SavedSignupDiscount = {
  code: string | null
  offer: string | null
}

type SignupDiscountClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: { signup_discount_code?: string | null; signup_discount_offer?: string | null } | null
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
      .select('signup_discount_code, signup_discount_offer')
      .eq('rep_id', repId)
      .maybeSingle()
    if (error || !data) return null
    return {
      code: data.signup_discount_code ?? null,
      offer: data.signup_discount_offer ?? null,
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
  if (!repId) return homepage
  try {
    const saved = await load(repId)
    const discount = presentSignupDiscount({
      signupDiscountCode: saved?.code,
      signupDiscountOffer: saved?.offer,
    })
    if (!discount) return homepage
    const offer = normalizeSignupDiscountOffer(saved?.offer)
    return {
      ...homepage,
      signupDiscountCode: discount.code,
      ...(offer ? { signupDiscountOffer: offer } : {}),
    }
  } catch {
    return homepage
  }
}
