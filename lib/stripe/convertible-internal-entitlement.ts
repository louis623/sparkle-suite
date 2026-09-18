const PROTECTED_INTERNAL_DEMO_EMAILS = new Set(['louis@neonrabbit.net'])

const INTERNAL_STRIPE_ID_PREFIXES = [
  'cus_internal_',
  'sub_internal_',
  'cus_reviewer_',
  'sub_reviewer_',
] as const

export interface ConvertibleInternalEntitlementInput {
  accountClassification?: string | null
  email?: string | null
  stripeSubscriptionId?: string | null
  stripeCustomerId?: string | null
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? ''
}

export function isProtectedInternalDemoEmail(email?: string | null) {
  const normalized = normalizeEmail(email)
  return Boolean(normalized) && PROTECTED_INTERNAL_DEMO_EMAILS.has(normalized)
}

export function isProtectedInternalDemoAccount(args: {
  email?: string | null
  accountClassification?: string | null
}) {
  if (isProtectedInternalDemoEmail(args.email)) return true
  return args.accountClassification === 'demo'
}

export function isRealStripeProviderId(id?: string | null) {
  const value = id?.trim() ?? ''
  if (!value) return false
  if (INTERNAL_STRIPE_ID_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return false
  }
  return value.startsWith('cus_') || value.startsWith('sub_')
}

export function isConvertibleInternalEntitlement(
  args: ConvertibleInternalEntitlementInput,
) {
  if (isProtectedInternalDemoAccount(args)) return false
  if (args.accountClassification !== 'customer') return false
  if (isRealStripeProviderId(args.stripeSubscriptionId)) return false
  if (isRealStripeProviderId(args.stripeCustomerId)) return false
  return true
}
