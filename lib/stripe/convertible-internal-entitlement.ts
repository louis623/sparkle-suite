const NEON_RABBIT_MAIL_DOMAIN = 'neonrabbit.net'

const PROTECTED_INTERNAL_DEMO_EMAILS = new Set([
  'louis@neonrabbit.net',
  'louis+sparkle-demo@neonrabbit.net',
  'louis+sparkle-demo-2@neonrabbit.net',
  'louis+sparkle-beta-demo@neonrabbit.net',
  'louis+sparkle-customer-flow@neonrabbit.net',
  'testrep@neonrabbit.net',
  'sparkle-reviewer+preview@neonrabbit.net',
  'sparkle-reviewer+local@neonrabbit.net',
  'sparkle-reviewer+loc@example.test',
])

const INTERNAL_STRIPE_ID_PREFIXES = [
  'cus_internal_',
  'sub_internal_',
  'cus_reviewer_',
  'sub_reviewer_',
] as const

export interface ConvertibleInternalEntitlementInput {
  accountClassification?: string | null
  email?: string | null
  pricingTier?: string | null
  founderSequence?: number | null
  stripeSubscriptionId?: string | null
  stripeCustomerId?: string | null
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? ''
}

function parseEmailParts(email: string) {
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) return null
  return {
    local: email.slice(0, at),
    domain: email.slice(at + 1),
  }
}

export function isProtectedInternalDemoEmail(email?: string | null) {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  if (PROTECTED_INTERNAL_DEMO_EMAILS.has(normalized)) return true

  const parts = parseEmailParts(normalized)
  if (!parts) return false
  // Reviewer-smoke identities are always demo, including plus-tags on any domain.
  if (
    parts.local === 'sparkle-reviewer' ||
    parts.local.startsWith('sparkle-reviewer+')
  ) {
    return true
  }
  if (parts.domain !== NEON_RABBIT_MAIL_DOMAIN) return false
  if (parts.local === 'louis') return true
  // Durable Louis demo/smoke plus-tag pattern used across Suite scripts.
  if (parts.local.startsWith('louis+sparkle-')) return true
  if (parts.local === 'testrep') return true
  return false
}

export function isProtectedInternalDemoAccount(args: {
  email?: string | null
  accountClassification?: string | null
}) {
  if (isProtectedInternalDemoEmail(args.email)) return true
  return args.accountClassification === 'demo'
}

export function isInternalPlaceholderStripeId(id?: string | null) {
  const value = id?.trim() ?? ''
  return INTERNAL_STRIPE_ID_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function isRealStripeProviderId(id?: string | null) {
  const value = id?.trim() ?? ''
  if (!value) return false
  if (isInternalPlaceholderStripeId(value)) return false
  return value.startsWith('cus_') || value.startsWith('sub_')
}

export function isAssignedFounderPricing(args: {
  pricingTier?: string | null
  founderSequence?: number | null
}) {
  if (args.pricingTier === 'founder') return true
  const sequence = args.founderSequence
  return (
    typeof sequence === 'number' &&
    Number.isInteger(sequence) &&
    sequence >= 1 &&
    sequence <= 20
  )
}

export function isConvertibleInternalEntitlement(
  args: ConvertibleInternalEntitlementInput,
) {
  if (isProtectedInternalDemoAccount(args)) return false
  if (args.accountClassification !== 'customer') return false
  if (!isAssignedFounderPricing(args)) return false
  if (isInternalPlaceholderStripeId(args.stripeSubscriptionId)) return false
  if (isInternalPlaceholderStripeId(args.stripeCustomerId)) return false
  if (isRealStripeProviderId(args.stripeSubscriptionId)) return false
  if (isRealStripeProviderId(args.stripeCustomerId)) return false
  return true
}
