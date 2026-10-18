import { randomBytes } from 'node:crypto'

import { PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL } from '@/lib/prelaunch/waitlist-owner-alert'
import { getResendConfig, isResendEnabled } from '@/lib/resend/config'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { getAppUrl, getSparkleSuitePriceIds, getStripeConfig } from '@/lib/stripe/config'
import { resolveSparkleSuitePriceIds } from '@/lib/stripe/sparkle-suite-price-resolution'
import {
  FOUNDER_RATE_MONTHS,
  type SparkleSuitePriceIds,
  type SparkleSuitePricingTier,
} from '@/lib/stripe/sparkle-suite-pricing'

type AdminClient = ReturnType<typeof createAdminClient>

export const PAYMENT_LINK_MAX_EXPIRY_SECONDS = 23 * 60 * 60

export type PaymentLinkStatus = 'open' | 'paid' | 'expired' | 'duplicate' | 'needs_attention'

const PERMANENT_ATTENTION_REASONS = new Set([
  'missing_payment_link',
  'missing_email',
  'missing_subscription',
  'not_subscription',
  'not_paid',
  'subscription_not_active',
  'trial_present',
  'missing_monthly_price',
  'setup_fee_present',
  'missing_setup_fee',
])

export class PaymentLinkError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'PaymentLinkError'
    this.statusCode = statusCode
  }
}

export interface OperatorPaymentLinkView {
  id: string
  launchBuildId: string | null
  leadName: string | null
  leadEmail: string | null
  status: PaymentLinkStatus
  buildFeeWaived: boolean
  pricingTier: SparkleSuitePricingTier | null
  expiresAt: string | null
  repId: string | null
  checkoutUrl: string | null
  paymentEmailDraft: string | null
  welcomeEmailDraft: string | null
  welcomeEmailStatus: 'not_queued' | 'draft'
  attentionReason: string | null
  returningRep: boolean
}

export interface PaymentLinkCheckoutLine {
  price: string
  quantity: 1
}

interface PaymentLinkRow {
  id: string
  launch_build_id: string | null
  lead_name: string | null
  lead_email: string | null
  status: PaymentLinkStatus
  build_fee_waived: boolean
  pricing_tier: SparkleSuitePricingTier | null
  founder_sequence: number | null
  monthly_price_id: string | null
  build_fee_price_id: string | null
  stripe_checkout_session_id: string | null
  stripe_subscription_id: string | null
  expires_at: string | null
  rep_id: string | null
  payment_email_draft: string | null
  welcome_email_draft: string | null
  welcome_email_status: 'not_queued' | 'draft'
  attention_reason: string | null
  returning_rep: boolean | null
}

export function buildPaymentLinkCheckoutParams({
  paymentLinkId,
  tier,
  founderSequence,
  waiveSetupFee,
  priceIds,
  origin,
  now = new Date(),
}: {
  paymentLinkId: string
  tier: SparkleSuitePricingTier
  founderSequence: number | null
  waiveSetupFee: boolean
  priceIds: SparkleSuitePriceIds
  origin: string
  now?: Date
}) {
  const monthlyPriceId =
    tier === 'founder' ? priceIds.founderMonthly : priceIds.standardMonthly
  if (!monthlyPriceId || (!waiveSetupFee && !priceIds.buildFee)) {
    throw new Error('Sparkle Suite checkout prices are not configured.')
  }

  const lineItems: PaymentLinkCheckoutLine[] = waiveSetupFee
    ? [{ price: monthlyPriceId, quantity: 1 }]
    : [
        { price: priceIds.buildFee as string, quantity: 1 },
        { price: monthlyPriceId, quantity: 1 },
      ]
  const metadata = {
    sparkle_suite_payment_first: 'true',
    payment_link_id: paymentLinkId,
    pricing_tier: tier,
    founder_sequence: founderSequence ? String(founderSequence) : '',
    founder_rate_months: tier === 'founder' ? String(FOUNDER_RATE_MONTHS) : '',
    build_fee_waived: waiveSetupFee ? 'true' : 'false',
    build_fee_charged: waiveSetupFee ? 'false' : 'true',
    build_fee_price_id: waiveSetupFee ? '' : (priceIds.buildFee as string),
    monthly_price_id: monthlyPriceId,
    plan_type: 'monthly',
  }

  return {
    mode: 'subscription' as const,
    line_items: lineItems,
    expires_at: Math.floor(now.getTime() / 1000) + PAYMENT_LINK_MAX_EXPIRY_SECONDS,
    success_url: `${origin}/payment/received?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment/cancelled`,
    name_collection: { individual: { enabled: true, optional: true } },
    metadata,
    subscription_data: { metadata },
  }
}

export function paymentLinkEmailDraft({
  checkoutUrl,
  waiveSetupFee,
  tier,
  expiresAt,
}: {
  checkoutUrl: string
  waiveSetupFee: boolean
  tier: SparkleSuitePricingTier
  expiresAt: string
}) {
  const charge = waiveSetupFee
    ? 'This payment covers the first month and starts the monthly plan. The setup fee is waived on this link.'
    : 'This payment covers the setup fee and the first month, and it starts the monthly plan.'
  const pricing = tier === 'founder' ? 'Founder pricing.' : 'Standard pricing.'
  return [
    'Hello,',
    '',
    'We are sending this Sparkle Suite payment link.',
    '',
    checkoutUrl,
    '',
    pricing,
    charge,
    'Enter the email at checkout. The account is created after the payment goes through.',
    `This link expires ${expiresAt}.`,
    '',
    'Sparkle Suite',
  ].join('\n')
}

export function paymentLinkSignInUrl(origin: string, email: string) {
  const url = new URL('/login', origin)
  url.searchParams.set('email', email.trim().toLowerCase())
  return url.toString()
}

export function welcomeEmailDraft({
  leadName,
  signInUrl,
}: {
  leadName: string | null
  signInUrl: string
}) {
  const greeting = leadName ? `Hello ${leadName},` : 'Hello,'
  return [
    greeting,
    '',
    'The Sparkle Suite payment went through. The account is ready.',
    '',
    'Sign in at:',
    signInUrl,
    '',
    'Use the email from checkout. A fresh sign-in link can be requested from that page.',
    '',
    'Sparkle Suite',
  ].join('\n')
}

export function normalizePaymentEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

export function buildPaymentLinkAttentionAlert({
  sessionId,
  paymentLinkId,
  reason,
  email,
  name,
}: {
  sessionId: string
  paymentLinkId: string | null
  reason: string
  email: string | null
  name: string | null
}) {
  return {
    to: [PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL],
    subject: 'Sparkle Suite payment needs attention',
    text: [
      'A paid Sparkle Suite checkout could not create the account.',
      '',
      `Session: ${sessionId}`,
      `Payment link: ${paymentLinkId ?? '(none)'}`,
      `Reason: ${reason}`,
      `Email: ${email || '(none)'}`,
      `Name: ${name || '(none)'}`,
      '',
      'The intake page shows this link as needs attention.',
    ].join('\n'),
  }
}

export function collectedCheckoutIdentity(
  customerDetails:
    | {
        email?: string | null
        name?: string | null
        individual_name?: string | null
      }
    | null
    | undefined,
) {
  const email = normalizePaymentEmail(customerDetails?.email)
  const name = (customerDetails?.individual_name || customerDetails?.name || '').trim()
  return { email, name }
}

export function verifyPaidSubscriptionCheckout({
  mode,
  paymentStatus,
  subscriptionStatus,
  trialEnd,
  linePriceIds,
  monthlyPriceId,
  buildFeePriceId,
  buildFeeWaived,
}: {
  mode: string | null
  paymentStatus: string | null
  subscriptionStatus: string | null
  trialEnd: number | null
  linePriceIds: string[]
  monthlyPriceId: string
  buildFeePriceId: string
  buildFeeWaived: boolean
}) {
  if (mode !== 'subscription') return { ok: false as const, reason: 'not_subscription' }
  if (paymentStatus !== 'paid') return { ok: false as const, reason: 'not_paid' }
  if (trialEnd) return { ok: false as const, reason: 'trial_present' }
  if (subscriptionStatus !== 'active') return { ok: false as const, reason: 'subscription_not_active' }
  if (!linePriceIds.includes(monthlyPriceId)) {
    return { ok: false as const, reason: 'missing_monthly_price' }
  }
  const hasSetupFee = Boolean(buildFeePriceId) && linePriceIds.includes(buildFeePriceId)
  if (buildFeeWaived && hasSetupFee) return { ok: false as const, reason: 'setup_fee_present' }
  if (!buildFeeWaived && !hasSetupFee) return { ok: false as const, reason: 'missing_setup_fee' }
  return { ok: true as const }
}

function mapPaymentLink(row: PaymentLinkRow, checkoutUrl: string | null = null): OperatorPaymentLinkView {
  return {
    id: row.id,
    launchBuildId: row.launch_build_id,
    leadName: row.lead_name,
    leadEmail: row.lead_email,
    status: row.status,
    buildFeeWaived: row.build_fee_waived,
    pricingTier: row.pricing_tier,
    expiresAt: row.expires_at,
    repId: row.rep_id,
    checkoutUrl,
    paymentEmailDraft: row.payment_email_draft,
    welcomeEmailDraft: row.welcome_email_draft,
    welcomeEmailStatus: row.welcome_email_status,
    attentionReason: row.attention_reason,
    returningRep: row.returning_rep === true,
  }
}

function isMissingPaymentLinkTable(error: { code?: string; message?: string } | null) {
  const message = error?.message ?? ''
  return error?.code === '42P01' || error?.code === 'PGRST205' || /sparkle_suite_payment_links/i.test(message)
}

function formatExpiry(expiresAt: string) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(expiresAt))
  return `${formatted} ET`
}

function escapeIlikeExact(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

async function listSparkleSuitePrices(
  stripe: ReturnType<typeof getStripe>,
  lookupKeys: string[],
) {
  const listed = await stripe.prices.list({
    lookup_keys: lookupKeys,
    active: true,
    limit: 10,
  })
  return listed.data
}

async function resolvePaymentLinkPriceIds({
  stripe,
  secretKey,
  priceIds,
}: {
  stripe: ReturnType<typeof getStripe>
  secretKey?: string | null
  priceIds?: SparkleSuitePriceIds
}) {
  return resolveSparkleSuitePriceIds({
    envPriceIds: priceIds ?? getSparkleSuitePriceIds(),
    secretKey: secretKey ?? getStripeConfig()?.STRIPE_SECRET_KEY,
    listPrices: (lookupKeys) => listSparkleSuitePrices(stripe, lookupKeys),
  })
}

export async function sendPaymentLinkAttentionAlert(input: {
  sessionId: string
  paymentLinkId: string | null
  reason: string
  email: string | null
  name: string | null
}) {
  const alert = buildPaymentLinkAttentionAlert(input)
  if (
    alert.to.length !== 1 ||
    alert.to[0] !== PRELAUNCH_WAITLIST_OWNER_ALERT_EMAIL
  ) {
    throw new Error('Owner alert recipient must stay the owner inbox.')
  }
  if (!isResendEnabled()) {
    console.warn('[payment-link] Owner alert skipped because Resend is not configured.')
    return
  }
  const resendConfig = getResendConfig()
  if (!resendConfig) {
    console.warn('[payment-link] Owner alert skipped because Resend is not configured.')
    return
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendConfig.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendConfig.RESEND_FROM_EMAIL,
      to: alert.to,
      subject: alert.subject,
      text: alert.text,
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    throw new Error(`Owner alert failed: ${response.status}`)
  }
}

export async function loadOperatorPaymentLinks() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sparkle_suite_payment_links')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(25)
  if (error) {
    if (isMissingPaymentLinkTable(error)) return { ready: false, links: [] as OperatorPaymentLinkView[] }
    throw error
  }
  return {
    ready: true,
    links: ((data ?? []) as PaymentLinkRow[]).map((row) => mapPaymentLink(row)),
  }
}

async function discardUnissuedLink(admin: AdminClient, paymentLinkId: string) {
  await admin.from('sparkle_suite_payment_links').delete().eq('id', paymentLinkId)
}

export async function createOperatorPaymentLink({
  operatorRepId,
  pricingTier,
  waiveSetupFee,
  origin,
  now = new Date(),
  admin = createAdminClient(),
  stripe = getStripe(),
  priceIds = getSparkleSuitePriceIds(),
  secretKey,
}: {
  operatorRepId: string
  pricingTier: SparkleSuitePricingTier
  waiveSetupFee: boolean
  origin?: string
  now?: Date
  admin?: AdminClient
  stripe?: ReturnType<typeof getStripe>
  priceIds?: SparkleSuitePriceIds
  secretKey?: string | null
}) {
  if (pricingTier !== 'founder' && pricingTier !== 'standard') {
    throw new PaymentLinkError('Choose founder or standard pricing.')
  }

  const resolvedPriceIds = await resolvePaymentLinkPriceIds({ stripe, secretKey, priceIds })
  const monthlyPriceId =
    pricingTier === 'founder' ? resolvedPriceIds.founderMonthly : resolvedPriceIds.standardMonthly
  if (!monthlyPriceId || (!waiveSetupFee && !resolvedPriceIds.buildFee)) {
    throw new PaymentLinkError('Sparkle Suite checkout prices are not configured.', 503)
  }

  const { data: inserted, error: insertError } = await admin
    .from('sparkle_suite_payment_links')
    .insert({
      operator_rep_id: operatorRepId,
      status: 'open',
      build_fee_waived: waiveSetupFee,
      welcome_email_status: 'not_queued',
    })
    .select('*')
    .single()
  if (insertError) throw insertError
  const link = inserted as PaymentLinkRow

  const { data: pricingData, error: pricingError } = await admin.rpc(
    'assign_sparkle_suite_payment_link_pricing',
    { p_payment_link_id: link.id, p_pricing_tier: pricingTier },
  )
  if (pricingError) {
    await discardUnissuedLink(admin, link.id)
    if (/not open for another link/i.test(pricingError.message ?? '')) {
      throw new PaymentLinkError(
        'Founder pricing is not open for another link right now.',
        409,
      )
    }
    throw pricingError
  }
  const pricingRow = (Array.isArray(pricingData) ? pricingData[0] : pricingData) as
    | { pricing_tier?: string; founder_sequence?: number | null }
    | undefined
  const tier: SparkleSuitePricingTier = pricingRow?.pricing_tier === 'founder' ? 'founder' : 'standard'
  const founderSequence =
    tier === 'founder' && typeof pricingRow?.founder_sequence === 'number'
      ? pricingRow.founder_sequence
      : null
  const checkoutOrigin = origin ?? getAppUrl()
  const params = buildPaymentLinkCheckoutParams({
    paymentLinkId: link.id,
    tier,
    founderSequence,
    waiveSetupFee,
    priceIds: resolvedPriceIds,
    origin: checkoutOrigin,
    now,
  })

  let session: { id: string; url: string | null }
  try {
    session = await stripe.checkout.sessions.create(params)
  } catch (error) {
    await admin.rpc('release_sparkle_suite_payment_link_pricing', {
      p_payment_link_id: link.id,
    })
    await admin
      .from('sparkle_suite_payment_links')
      .update({
        status: 'expired',
        pricing_tier: null,
        founder_sequence: null,
        expired_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', link.id)
      .eq('status', 'open')
    throw error
  }
  if (!session.url) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined)
    await admin.rpc('release_sparkle_suite_payment_link_pricing', {
      p_payment_link_id: link.id,
    })
    await admin
      .from('sparkle_suite_payment_links')
      .update({
        status: 'expired',
        pricing_tier: null,
        founder_sequence: null,
        expired_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', link.id)
      .eq('status', 'open')
    throw new Error('Stripe did not return a payment link.')
  }

  const expiresAtIso = new Date(params.expires_at * 1000).toISOString()
  const draft = paymentLinkEmailDraft({
    checkoutUrl: session.url,
    waiveSetupFee,
    tier,
    expiresAt: formatExpiry(expiresAtIso),
  })
  const { data: saved, error: saveError } = await admin
    .from('sparkle_suite_payment_links')
    .update({
      pricing_tier: tier,
      founder_sequence: founderSequence,
      monthly_price_id: params.metadata.monthly_price_id,
      build_fee_price_id: waiveSetupFee ? null : resolvedPriceIds.buildFee,
      stripe_checkout_session_id: session.id,
      expires_at: expiresAtIso,
      payment_email_draft: draft,
      updated_at: now.toISOString(),
    })
    .eq('id', link.id)
    .select('*')
    .single()
  if (saveError) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined)
    await admin.rpc('release_sparkle_suite_payment_link_pricing', {
      p_payment_link_id: link.id,
    })
    throw saveError
  }
  return mapPaymentLink(saved as PaymentLinkRow, session.url)
}

export async function resendOperatorPaymentLink({
  paymentLinkId,
  operatorRepId,
  origin,
  now = new Date(),
  admin = createAdminClient(),
  stripe = getStripe(),
  priceIds = getSparkleSuitePriceIds(),
  secretKey,
}: {
  paymentLinkId: string
  operatorRepId: string
  origin?: string
  now?: Date
  admin?: AdminClient
  stripe?: ReturnType<typeof getStripe>
  priceIds?: SparkleSuitePriceIds
  secretKey?: string | null
}) {
  const { data: openLink, error } = await admin
    .from('sparkle_suite_payment_links')
    .select('*')
    .eq('id', paymentLinkId)
    .maybeSingle()
  if (error) throw error
  const row = openLink as PaymentLinkRow | null
  if (!row || row.status !== 'open') {
    throw new PaymentLinkError('That payment link is no longer open.')
  }
  if (row.pricing_tier !== 'founder' && row.pricing_tier !== 'standard') {
    throw new PaymentLinkError('That payment link has no pricing tier.')
  }
  await admin.rpc('release_sparkle_suite_payment_link_pricing', {
    p_payment_link_id: row.id,
  })
  if (row.stripe_checkout_session_id) {
    await stripe.checkout.sessions.expire(row.stripe_checkout_session_id).catch(() => undefined)
  }
  const { error: expireError } = await admin
    .from('sparkle_suite_payment_links')
    .update({
      status: 'expired',
      pricing_tier: null,
      founder_sequence: null,
      expired_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', row.id)
    .eq('status', 'open')
  if (expireError) throw expireError
  return createOperatorPaymentLink({
    operatorRepId,
    pricingTier: row.pricing_tier,
    waiveSetupFee: row.build_fee_waived,
    origin,
    now,
    admin,
    stripe,
    priceIds,
    secretKey,
  })
}

function linePriceIds(session: {
  line_items?: { data?: Array<{ price?: { id?: string } | string | null }> } | null
}) {
  return (session.line_items?.data ?? [])
    .map((item) => (typeof item.price === 'string' ? item.price : item.price?.id))
    .filter((id): id is string => Boolean(id))
}

function isLiveSubscriptionStatus(status: string | null | undefined) {
  return status === 'active' || status === 'trialing'
}

export async function fulfillPaidPaymentLink({
  session,
  livemode,
  eventCreated,
  admin = createAdminClient(),
  stripe = getStripe(),
  origin = getAppUrl(),
  notifyAttention = sendPaymentLinkAttentionAlert,
}: {
  session: {
    id: string
    mode: string | null
    payment_status: string | null
    subscription: string | { id: string } | null
    metadata: Record<string, string> | null
    customer?: string | { id: string } | null
    customer_details?: {
      email?: string | null
      name?: string | null
      individual_name?: string | null
    } | null
  }
  livemode: boolean
  eventCreated: number
  admin?: AdminClient
  stripe?: ReturnType<typeof getStripe>
  origin?: string
  notifyAttention?: typeof sendPaymentLinkAttentionAlert
}) {
  if (session.metadata?.sparkle_suite_payment_first !== 'true') {
    return { created: false, reason: 'not_payment_first' as const, retryable: false as const }
  }

  let link: PaymentLinkRow | null = null
  let identity = { email: '', name: '' }
  try {
    const { data: bySession, error: sessionLookupError } = await admin
      .from('sparkle_suite_payment_links')
      .select('*')
      .eq('stripe_checkout_session_id', session.id)
      .maybeSingle()
    if (sessionLookupError) throw sessionLookupError
    link = bySession as PaymentLinkRow | null
    if (!link && session.metadata.payment_link_id) {
      const { data: byId, error: idError } = await admin
        .from('sparkle_suite_payment_links')
        .select('*')
        .eq('id', session.metadata.payment_link_id)
        .maybeSingle()
      if (idError) throw idError
      link = byId as PaymentLinkRow | null
    }
    if (!link) {
      await recordPaymentLinkAttention({
        admin,
        link: null,
        sessionId: session.id,
        reason: 'missing_payment_link',
        email: null,
        name: null,
        notifyAttention,
      })
      return { created: false, reason: 'missing_payment_link' as const, retryable: false as const }
    }
    if (link.status === 'paid' && link.rep_id) {
      return { created: false, reason: 'already_created' as const, retryable: false as const, repId: link.rep_id }
    }
    if (link.status === 'duplicate') {
      return { created: false, reason: 'duplicate_account' as const, retryable: false as const, repId: link.rep_id }
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
    if (!subscriptionId) {
      await recordPaymentLinkAttention({
        admin,
        link,
        sessionId: session.id,
        reason: 'missing_subscription',
        email: null,
        name: null,
        notifyAttention,
      })
      return { created: false, reason: 'missing_subscription' as const, retryable: false as const }
    }

    const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items.data.price'],
    })
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    identity = collectedCheckoutIdentity(fullSession.customer_details ?? session.customer_details)
    if (!identity.email) {
      await recordPaymentLinkAttention({
        admin,
        link,
        sessionId: session.id,
        reason: 'missing_email',
        email: null,
        name: identity.name || null,
        notifyAttention,
      })
      return { created: false, reason: 'missing_email' as const, retryable: false as const }
    }

    const monthlyPriceId = link.monthly_price_id || session.metadata.monthly_price_id || ''
    const buildFeePriceId = link.build_fee_price_id || session.metadata.build_fee_price_id || ''
    const verification = verifyPaidSubscriptionCheckout({
      mode: fullSession.mode,
      paymentStatus: fullSession.payment_status,
      subscriptionStatus: subscription.status,
      trialEnd: subscription.trial_end ?? null,
      linePriceIds: linePriceIds(fullSession),
      monthlyPriceId,
      buildFeePriceId,
      buildFeeWaived: link.build_fee_waived,
    })
    if (!verification.ok) {
      await recordPaymentLinkAttention({
        admin,
        link,
        sessionId: session.id,
        reason: verification.reason,
        email: identity.email,
        name: identity.name || null,
        notifyAttention,
      })
      return { created: false, reason: verification.reason, retryable: false as const }
    }

    const { data: existingRep, error: existingRepError } = await admin
      .from('reps')
      .select('id, auth_user_id, status')
      .ilike('email', escapeIlikeExact(identity.email))
      .maybeSingle()
    if (existingRepError) throw existingRepError

    let repId = existingRep?.id as string | undefined
    let returningRep = link.returning_rep === true
    if (repId && repId !== link.rep_id) {
      const { data: existingSubscription, error: subscriptionLookupError } = await admin
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('rep_id', repId)
        .maybeSingle()
      if (subscriptionLookupError) throw subscriptionLookupError
      const existingSubscriptionId = existingSubscription?.stripe_subscription_id as string | undefined
      const existingStatus = existingSubscription?.status as string | undefined
      if (
        existingSubscriptionId &&
        existingSubscriptionId !== subscription.id &&
        isLiveSubscriptionStatus(existingStatus)
      ) {
        await admin.rpc('release_sparkle_suite_payment_link_pricing', {
          p_payment_link_id: link.id,
        })
        await admin
          .from('sparkle_suite_payment_links')
          .update({
            status: 'duplicate',
            lead_email: identity.email,
            lead_name: identity.name || null,
            stripe_subscription_id: subscription.id,
            rep_id: repId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', link.id)
        return { created: false, reason: 'duplicate_account' as const, retryable: false as const, repId }
      }
      returningRep = true
    } else if (!repId) {
      const authUserId = await findOrCreateAuthUser(admin, identity.email)
      const businessName = identity.name || identity.email
      const { data: repData, error: repInsertError } = await admin
        .from('reps')
        .insert({
          auth_user_id: authUserId,
          account_classification: 'customer',
          email: identity.email,
          display_name: businessName,
          business_name: businessName,
          phone: null,
          social_handles: {},
          template_id: 'default',
          status: 'active',
          finder_directory_visible: true,
          pricing_tier: link.pricing_tier,
          founder_sequence: link.founder_sequence,
        })
        .select('id')
        .single()
      if (repInsertError) throw repInsertError
      repId = (repData as { id: string }).id
      const nowIso = new Date().toISOString()
      const { error: siteError } = await admin.from('site_settings').upsert(
        {
          rep_id: repId,
          tagline: '',
          banner_text: `Welcome to ${businessName}`,
          banner_visible: true,
          ticker_visible: false,
          team_name: businessName,
          show_join_page: true,
          hero_animation_type: 'sparkle_rise',
        },
        { onConflict: 'rep_id' },
      )
      if (siteError) throw siteError
      const { error: onboardingError } = await admin.from('onboarding_status').upsert(
        {
          rep_id: repId,
          current_stage: 'intake_completed',
          completed_steps: ['waitlist', 'conversation', 'setup_profile', 'payment_received'],
        },
        { onConflict: 'rep_id' },
      )
      if (onboardingError) throw onboardingError
      const { error: setupError } = await admin.from('self_serve_setup_sessions').upsert(
        {
          rep_id: repId,
          status: 'dashboard_unlocked',
          current_step: 'account_basics',
          completed_steps: ['operator_account_provisioned'],
          answers: { displayName: businessName, businessName, email: identity.email },
          dashboard_unlocked_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'rep_id' },
      )
      if (setupError) throw setupError
    }
    if (!repId) throw new Error('The paid checkout did not resolve a rep.')

    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    const periodItem = subscription.items.data[0]
    const periodStart = periodItem?.current_period_start ?? subscription.start_date
    const periodEnd = periodItem?.current_period_end ?? subscription.billing_cycle_anchor
    let scheduleId: string | null = null
    if (link.pricing_tier === 'founder' && link.founder_sequence && monthlyPriceId) {
      scheduleId = await ensureFounderStepUp({
        stripe,
        subscription,
        repId,
        founderSequence: link.founder_sequence,
        founderMonthlyPriceId: monthlyPriceId,
        periodStart,
      })
    }
    const { error: subscriptionError } = await admin.from('subscriptions').upsert(
      {
        rep_id: repId,
        stripe_subscription_id: subscription.id,
        stripe_subscription_schedule_id: scheduleId,
        stripe_customer_id: customerId,
        plan_tier: 'monthly',
        pricing_tier: link.pricing_tier,
        founder_sequence: link.founder_sequence,
        build_fee_charged: !link.build_fee_waived,
        founder_rate_months: link.pricing_tier === 'founder' ? FOUNDER_RATE_MONTHS : null,
        build_fee_price_id: link.build_fee_waived ? null : buildFeePriceId,
        monthly_price_id: monthlyPriceId,
        status: 'active',
        current_period_start: new Date(periodStart * 1000).toISOString(),
        current_period_end: new Date(periodEnd * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        stripe_livemode: livemode,
        stripe_event_timestamp: eventCreated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'rep_id' },
    )
    if (subscriptionError) throw subscriptionError

    const { error: repUpdateError } = await admin
      .from('reps')
      .update({
        email: identity.email,
        status: 'active',
        stripe_customer_id: customerId,
        pricing_tier: link.pricing_tier,
        founder_sequence: link.founder_sequence,
      })
      .eq('id', repId)
    if (repUpdateError) throw repUpdateError

    const signInUrl = paymentLinkSignInUrl(origin, identity.email)
    const welcome = welcomeEmailDraft({ leadName: identity.name || null, signInUrl })
    const { error: paidError } = await admin
      .from('sparkle_suite_payment_links')
      .update({
        status: 'paid',
        lead_email: identity.email,
        lead_name: identity.name || null,
        rep_id: repId,
        returning_rep: returningRep,
        attention_reason: null,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        paid_at: new Date().toISOString(),
        welcome_email_draft: welcome,
        welcome_email_status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id)
    if (paidError) throw paidError
    return {
      created: true as const,
      repId,
      returningRep,
      welcomeEmailStatus: 'draft' as const,
      retryable: false as const,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'fulfillment_error'
    const retryable = !PERMANENT_ATTENTION_REASONS.has(reason)
    if (link?.status !== 'paid' && link?.status !== 'duplicate') {
      await recordPaymentLinkAttention({
        admin,
        link,
        sessionId: session.id,
        reason,
        email: identity.email || null,
        name: identity.name || null,
        notifyAttention,
      }).catch((alertError) => {
        console.error('[payment-link] Could not record the payment failure.', alertError)
      })
    }
    if (!retryable) {
      return { created: false as const, reason, retryable: false as const }
    }
    throw error
  }
}

async function recordPaymentLinkAttention({
  admin,
  link,
  sessionId,
  reason,
  email,
  name,
  notifyAttention,
}: {
  admin: AdminClient
  link: PaymentLinkRow | null
  sessionId: string
  reason: string
  email: string | null
  name: string | null
  notifyAttention: typeof sendPaymentLinkAttentionAlert
}) {
  const attentionReason = reason.slice(0, 300)
  const alreadyRecorded =
    link?.status === 'needs_attention' && link.attention_reason === attentionReason
  if (link) {
    const { error } = await admin
      .from('sparkle_suite_payment_links')
      .update({
        status: 'needs_attention',
        attention_reason: attentionReason,
        lead_email: email || link.lead_email,
        lead_name: name || link.lead_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.id)
    if (error) throw error
  }
  if (alreadyRecorded) return
  try {
    await notifyAttention({
      sessionId,
      paymentLinkId: link?.id ?? null,
      reason: attentionReason,
      email,
      name,
    })
  } catch (error) {
    console.error('[payment-link] Owner alert failed.', error)
  }
}

async function findOrCreateAuthUser(admin: AdminClient, email: string) {
  const normalized = normalizePaymentEmail(email)
  const perPage = 200
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const existing = data.users.find((user) => normalizePaymentEmail(user.email) === normalized)
    if (existing?.id) return existing.id
    if (data.users.length < perPage) break
  }
  const password = `${randomBytes(24).toString('base64url')}Aa1!`
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  })
  if (error) throw error
  if (!data.user?.id) throw new Error('Auth user was not created.')
  return data.user.id
}

async function ensureFounderStepUp({
  stripe,
  subscription,
  repId,
  founderSequence,
  founderMonthlyPriceId,
  periodStart,
}: {
  stripe: ReturnType<typeof getStripe>
  subscription: Awaited<ReturnType<ReturnType<typeof getStripe>['subscriptions']['retrieve']>>
  repId: string
  founderSequence: number
  founderMonthlyPriceId: string
  periodStart: number
}) {
  const priceIds = await resolveSparkleSuitePriceIds({
    secretKey: getStripeConfig()?.STRIPE_SECRET_KEY,
    listPrices: (lookupKeys) => listSparkleSuitePrices(stripe, lookupKeys),
  })
  const standardMonthlyPriceId = priceIds.standardMonthly
  if (!standardMonthlyPriceId) {
    throw new Error('The standard monthly price could not be resolved.')
  }
  const metadata = {
    rep_id: repId,
    pricing_tier: 'founder',
    founder_sequence: String(founderSequence),
    founder_rate_months: String(FOUNDER_RATE_MONTHS),
  }
  const existingScheduleId =
    typeof subscription.schedule === 'string' ? subscription.schedule : subscription.schedule?.id
  const schedule = existingScheduleId
    ? await stripe.subscriptionSchedules.retrieve(existingScheduleId)
    : await stripe.subscriptionSchedules.create({ from_subscription: subscription.id, metadata })
  const phaseStart = schedule.current_phase?.start_date ?? periodStart
  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    metadata,
    phases: [
      {
        start_date: phaseStart,
        duration: { interval: 'month', interval_count: FOUNDER_RATE_MONTHS },
        items: [{ price: founderMonthlyPriceId, quantity: 1 }],
        metadata,
      },
      {
        items: [{ price: standardMonthlyPriceId, quantity: 1 }],
        metadata: { ...metadata, pricing_tier: 'standard', founder_step_up_from: 'founder' },
      },
    ],
  })
  return schedule.id
}

export async function expirePaymentLinkFromSession({
  sessionId,
  paymentLinkId,
  admin = createAdminClient(),
}: {
  sessionId?: string | null
  paymentLinkId?: string | null
  admin?: AdminClient
}) {
  let id = paymentLinkId ?? null
  if (!id && sessionId) {
    const { data, error } = await admin
      .from('sparkle_suite_payment_links')
      .select('id, status')
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle()
    if (error) throw error
    if (!data || data.status !== 'open') return { expired: false }
    id = data.id as string
  }
  if (!id) return { expired: false }
  await admin.rpc('release_sparkle_suite_payment_link_pricing', { p_payment_link_id: id })
  const { error } = await admin
    .from('sparkle_suite_payment_links')
    .update({
      status: 'expired',
      pricing_tier: null,
      founder_sequence: null,
      expired_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'open')
  if (error) throw error
  return { expired: true }
}
