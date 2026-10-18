import { randomBytes } from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/client'
import { getAppUrl, getSparkleSuitePriceIds } from '@/lib/stripe/config'
import {
  FOUNDER_RATE_MONTHS,
  type SparkleSuitePriceIds,
  type SparkleSuitePricingTier,
} from '@/lib/stripe/sparkle-suite-pricing'

type AdminClient = ReturnType<typeof createAdminClient>

export const PAYMENT_LINK_MAX_EXPIRY_SECONDS = 23 * 60 * 60

export type PaymentLinkStatus = 'open' | 'paid' | 'expired' | 'duplicate'

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

export function welcomeEmailDraft({
  leadName,
  signInUrl,
}: {
  leadName: string | null
  signInUrl: string | null
}) {
  const greeting = leadName ? `Hello ${leadName},` : 'Hello,'
  const signIn = signInUrl
    ? `Sign in with this link:\n${signInUrl}`
    : 'A sign-in link still needs to be prepared before this draft can be sent.'
  return [
    greeting,
    '',
    'The Sparkle Suite payment went through. The account is ready.',
    '',
    signIn,
    '',
    'Sparkle Suite',
  ].join('\n')
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
  const email = customerDetails?.email?.trim().toLowerCase() ?? ''
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
  if (subscriptionStatus !== 'active') return { ok: false as const, reason: 'subscription_not_active' }
  if (trialEnd) return { ok: false as const, reason: 'trial_present' }
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
}: {
  operatorRepId: string
  pricingTier: SparkleSuitePricingTier
  waiveSetupFee: boolean
  origin?: string
  now?: Date
  admin?: AdminClient
  stripe?: ReturnType<typeof getStripe>
  priceIds?: SparkleSuitePriceIds
}) {
  if (pricingTier !== 'founder' && pricingTier !== 'standard') {
    throw new PaymentLinkError('Choose founder or standard pricing.')
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
    priceIds,
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
      build_fee_price_id: waiveSetupFee ? null : priceIds.buildFee,
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
}: {
  paymentLinkId: string
  operatorRepId: string
  origin?: string
  now?: Date
  admin?: AdminClient
  stripe?: ReturnType<typeof getStripe>
  priceIds?: SparkleSuitePriceIds
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
}) {
  if (session.metadata?.sparkle_suite_payment_first !== 'true') {
    return { created: false, reason: 'not_payment_first' as const }
  }

  const { data: bySession, error: sessionLookupError } = await admin
    .from('sparkle_suite_payment_links')
    .select('*')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle()
  if (sessionLookupError) throw sessionLookupError
  let link = bySession as PaymentLinkRow | null
  if (!link && session.metadata.payment_link_id) {
    const { data: byId, error: idError } = await admin
      .from('sparkle_suite_payment_links')
      .select('*')
      .eq('id', session.metadata.payment_link_id)
      .maybeSingle()
    if (idError) throw idError
    link = byId as PaymentLinkRow | null
  }
  if (!link) return { created: false, reason: 'missing_payment_link' as const }
  if (link.status === 'paid' && link.rep_id) {
    return { created: false, reason: 'already_created' as const, repId: link.rep_id }
  }
  if (link.status === 'duplicate') {
    return { created: false, reason: 'duplicate_account' as const, repId: link.rep_id }
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (!subscriptionId) return { created: false, reason: 'missing_subscription' as const }

  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price'],
  })
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const identity = collectedCheckoutIdentity(fullSession.customer_details ?? session.customer_details)
  if (!identity.email) return { created: false, reason: 'missing_email' as const }

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
  if (!verification.ok) return { created: false, reason: verification.reason }

  const { data: existingRep, error: existingRepError } = await admin
    .from('reps')
    .select('id, auth_user_id')
    .eq('email', identity.email)
    .maybeSingle()
  if (existingRepError) throw existingRepError

  let repId = existingRep?.id as string | undefined
  if (repId) {
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
      return { created: false, reason: 'duplicate_account' as const, repId }
    }
  } else {
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

  await admin
    .from('reps')
    .update({
      stripe_customer_id: customerId,
      pricing_tier: link.pricing_tier,
      founder_sequence: link.founder_sequence,
    })
    .eq('id', repId)

  const signInUrl = await createSignInLink(admin, identity.email)
  const welcome = welcomeEmailDraft({ leadName: identity.name || null, signInUrl })
  const { error: paidError } = await admin
    .from('sparkle_suite_payment_links')
    .update({
      status: 'paid',
      lead_email: identity.email,
      lead_name: identity.name || null,
      rep_id: repId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      paid_at: new Date().toISOString(),
      welcome_email_draft: welcome,
      welcome_email_status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', link.id)
  if (paidError) throw paidError
  return { created: true as const, repId, welcomeEmailStatus: 'draft' as const }
}

async function findOrCreateAuthUser(admin: AdminClient, email: string) {
  const perPage = 200
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const existing = data.users.find((user) => user.email?.trim().toLowerCase() === email)
    if (existing?.id) return existing.id
    if (data.users.length < perPage) break
  }
  const password = `${randomBytes(24).toString('base64url')}Aa1!`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  if (!data.user?.id) throw new Error('Auth user was not created.')
  return data.user.id
}

async function createSignInLink(admin: AdminClient, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (error) return null
  return data.properties?.action_link ?? null
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
  const standardMonthlyPriceId = getSparkleSuitePriceIds().standardMonthly
  if (!standardMonthlyPriceId) return null
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
