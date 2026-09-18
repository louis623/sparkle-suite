import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { getSparkleSuitePriceIds, getStripeConfig } from '@/lib/stripe/config'
import { stripeCentsToWalletMils } from '@/lib/services/wallet-units'
import { createAdminClient } from '@/lib/supabase/admin'
import { upsertPrelaunchLaunchGate } from '@/lib/prelaunch/launch-gates'
import {
  createRequiredSetupCheckoutFulfillment,
  isRequiredNicNacSetupCheckout,
  transitionSetupSessionAfterCheckout,
} from '@/lib/self-serve/required-setup-checkout'
import {
  createPendingReferralAfterPaidCheckout,
  processReferralPaidSubscriptionInvoice,
} from '@/lib/services/sparkle-suite-referral-rewards'

const GRANDFATHERED_PAYMENT_LINK_ACCOUNTS = {
  '2b5a27c5-9c05-4014-8d0b-754e19815bf6': 'williams.brianna19@yahoo.com',
} as const

function getGrandfatheredPaymentLinkRepId(
  session: Stripe.Checkout.Session,
): string | null {
  const repId = session.client_reference_id
  const expectedEmail = repId
    ? GRANDFATHERED_PAYMENT_LINK_ACCOUNTS[
        repId as keyof typeof GRANDFATHERED_PAYMENT_LINK_ACCOUNTS
      ]
    : null
  if (!repId || !expectedEmail) return null

  const email = session.customer_details?.email?.trim().toLowerCase()
  return email === expectedEmail ? repId : null
}

export const dynamic = 'force-dynamic'

function logStripeEvent(
  level: 'info' | 'warn' | 'error',
  event: Stripe.Event,
  context: Record<string, unknown>
) {
  console[level](JSON.stringify({
    stripe_event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    timestamp: new Date().toISOString(),
    ...context,
  }))
}

/** In Stripe v22 (dahlia), current_period_start/end live on subscription items, not the subscription. */
function getSubscriptionPeriod(subscription: Stripe.Subscription): { start: number; end: number } {
  const item = subscription.items.data[0]
  if (item) {
    return { start: item.current_period_start, end: item.current_period_end }
  }
  // Fallback: use subscription start_date and billing_cycle_anchor
  return { start: subscription.start_date, end: subscription.billing_cycle_anchor }
}

/** In Stripe v22, Invoice.subscription is replaced by Invoice.parent.subscription_details */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subDetails = invoice.parent?.subscription_details
  if (!subDetails) return null
  return typeof subDetails.subscription === 'string'
    ? subDetails.subscription
    : subDetails.subscription?.id ?? null
}

function getInvoiceCustomerId(invoice: Stripe.Invoice): string | null {
  if (!invoice.customer) return null
  return typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer.id
}

function mapStripeStatus(s: string): string {
  if (s === 'active') return 'active'
  if (s === 'past_due') return 'past_due'
  if (s === 'canceled') return 'cancelled'
  if (s === 'trialing') return 'trialing'
  if (s === 'paused') return 'paused'
  return 'active'
}

function parsePositiveIntMetadata(
  value: string | undefined,
): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function getSubscriptionScheduleId(subscription: Stripe.Subscription): string | null {
  if (!subscription.schedule) return null
  return typeof subscription.schedule === 'string'
    ? subscription.schedule
    : subscription.schedule.id
}

async function ensureFounderStepUpSchedule({
  stripe,
  subscription,
  repId,
  founderSequence,
  founderRateMonths,
  founderMonthlyPriceId,
  periodStart,
}: {
  stripe: Stripe
  subscription: Stripe.Subscription
  repId: string
  founderSequence: number | null
  founderRateMonths: number | null
  founderMonthlyPriceId: string | null
  periodStart: number
}): Promise<string | null> {
  if (!founderRateMonths) return null
  if (!founderMonthlyPriceId) {
    throw new Error('Founder checkout is missing monthly price metadata.')
  }

  const standardMonthlyPriceId = getSparkleSuitePriceIds().standardMonthly
  if (!standardMonthlyPriceId) {
    throw new Error('STRIPE_PRICE_STANDARD_MONTHLY is required for founder step-up scheduling.')
  }

  const metadata = {
    rep_id: repId,
    pricing_tier: 'founder',
    founder_sequence: founderSequence ? String(founderSequence) : '',
    founder_rate_months: String(founderRateMonths),
  }
  const existingScheduleId = getSubscriptionScheduleId(subscription)
  const schedule = existingScheduleId
    ? await stripe.subscriptionSchedules.retrieve(existingScheduleId)
    : await stripe.subscriptionSchedules.create({
        from_subscription: subscription.id,
        metadata,
      })
  const phaseStart = schedule.current_phase?.start_date ?? periodStart

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    phases: [
      {
        start_date: phaseStart,
        duration: {
          interval: 'month',
          interval_count: founderRateMonths,
        },
        items: [{ price: founderMonthlyPriceId, quantity: 1 }],
        metadata,
      },
      {
        items: [{ price: standardMonthlyPriceId, quantity: 1 }],
        metadata: {
          ...metadata,
          pricing_tier: 'standard',
          founder_step_up_from: 'founder',
        },
      },
    ],
    metadata,
  })

  return schedule.id
}

async function claimStripeEvent(eventId: string, eventType: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('claim_stripe_event', {
    p_event_id: eventId,
    p_event_type: eventType,
  })
  if (error) throw error
  return data === true
}

async function markStripeEventProcessed(eventId: string, eventType: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.rpc('mark_stripe_event_processed', {
    p_event_id: eventId,
    p_event_type: eventType,
  })
  if (error) throw error
}

async function markStripeEventFailed(
  eventId: string,
  eventType: string,
  errorMessage: string,
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.rpc('mark_stripe_event_failed', {
    p_event_id: eventId,
    p_event_type: eventType,
    p_error: errorMessage,
  })
  if (error) {
    console.error('[stripe/webhook] Failed to mark Stripe event failed:', error)
  }
}

/**
 * Resolve the Stripe processing fee for a PaymentIntent from its latest charge's
 * balance transaction. Returns null if the balance transaction isn't yet available â€”
 * callers should pass null to the credit RPC (we never invent fees).
 */
async function resolveStripeFeeCents(
  stripe: Stripe,
  pi: Stripe.PaymentIntent
): Promise<number | null> {
  const latestCharge = pi.latest_charge
  if (!latestCharge) return null

  let charge: Stripe.Charge | null = null
  if (typeof latestCharge === 'string') {
    charge = await stripe.charges.retrieve(latestCharge, { expand: ['balance_transaction'] })
  } else if (latestCharge.balance_transaction) {
    charge = latestCharge
  } else {
    charge = await stripe.charges.retrieve(latestCharge.id, { expand: ['balance_transaction'] })
  }

  const bt = charge?.balance_transaction
  if (!bt) return null
  if (typeof bt === 'string') return null
  return bt.fee ?? null
}

async function handleWalletLoad(event: Stripe.Event, session: Stripe.Checkout.Session): Promise<void> {
  const walletId = session.metadata?.wallet_id
  const repId = session.metadata?.rep_id
  const intendedStr = session.metadata?.intended_cents
  if (!walletId || !repId || !intendedStr) {
    logStripeEvent('error', event, {
      phase: 'wallet_load',
      reason: 'missing_wallet_metadata',
      session_id: session.id,
    })
    return
  }

  if (session.payment_status !== 'paid') {
    logStripeEvent('info', event, {
      phase: 'wallet_load',
      skipped: true,
      reason: 'not_paid',
      session_id: session.id,
      payment_status: session.payment_status,
    })
    return
  }

  const intended = Number.parseInt(intendedStr, 10)
  if (!Number.isInteger(intended) || intended <= 0) {
    logStripeEvent('error', event, {
      phase: 'wallet_load',
      reason: 'invalid_intended_cents',
      intendedStr,
    })
    return
  }

  if (!session.payment_intent) {
    logStripeEvent('error', event, {
      phase: 'wallet_load',
      reason: 'missing_payment_intent',
      session_id: session.id,
    })
    return
  }

  const stripe = getStripe()
  const piId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent.id
  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ['latest_charge.balance_transaction'],
  })

  if (pi.amount_received < intended || session.amount_total !== intended) {
    logStripeEvent('error', event, {
      phase: 'wallet_load',
      reason: 'amount_mismatch',
      intended,
      session_total: session.amount_total,
      pi_received: pi.amount_received,
    })
    return
  }

  const feeCents = await resolveStripeFeeCents(stripe, pi)
  if (feeCents === null) {
    logStripeEvent('warn', event, {
      phase: 'wallet_load',
      reason: 'balance_transaction_not_ready',
      pi_id: pi.id,
    })
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc('credit_wallet', {
    p_wallet_id: walletId,
    p_rep_id: repId,
    p_amount: stripeCentsToWalletMils(intended),
    p_type: 'load',
    p_stripe_pi: pi.id,
    p_stripe_fee: feeCents === null ? null : stripeCentsToWalletMils(feeCents),
    p_description: 'Wallet load',
    p_attempt_id: null,
  })
  if (error) throw error

  logStripeEvent('info', event, {
    phase: 'wallet_load',
    wallet_id: walletId,
    rep_id: repId,
    credited_mils: stripeCentsToWalletMils(intended),
    fee_mils: feeCents === null ? null : stripeCentsToWalletMils(feeCents),
    pi_id: pi.id,
  })
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent
  if (pi.metadata?.auto_recharge !== 'true') return

  const walletId = pi.metadata.wallet_id
  const repId = pi.metadata.rep_id
  const attemptId = pi.metadata.attempt_id
  if (!walletId || !repId || !attemptId) {
    logStripeEvent('error', event, {
      phase: 'auto_recharge_succeeded',
      reason: 'missing_metadata',
      pi_id: pi.id,
    })
    return
  }

  const stripe = getStripe()
  const feeCents = await resolveStripeFeeCents(stripe, pi)
  if (feeCents === null) {
    logStripeEvent('warn', event, {
      phase: 'auto_recharge_succeeded',
      reason: 'balance_transaction_not_ready',
      pi_id: pi.id,
    })
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc('credit_wallet', {
    p_wallet_id: walletId,
    p_rep_id: repId,
    p_amount: stripeCentsToWalletMils(pi.amount_received),
    p_type: 'auto_recharge',
    p_stripe_pi: pi.id,
    p_stripe_fee: feeCents === null ? null : stripeCentsToWalletMils(feeCents),
    p_description: 'Auto-recharge',
    p_attempt_id: attemptId,
  })
  if (error) throw error

  logStripeEvent('info', event, {
    phase: 'auto_recharge_succeeded',
    wallet_id: walletId,
    rep_id: repId,
    credited_mils: stripeCentsToWalletMils(pi.amount_received),
    fee_mils: feeCents === null ? null : stripeCentsToWalletMils(feeCents),
    pi_id: pi.id,
  })
}

async function releaseAutoRechargeLock(event: Stripe.Event, pi: Stripe.PaymentIntent, phase: string): Promise<void> {
  const walletId = pi.metadata?.wallet_id
  const attemptId = pi.metadata?.attempt_id
  if (!walletId || !attemptId) {
    logStripeEvent('error', event, { phase, reason: 'missing_metadata', pi_id: pi.id })
    return
  }
  const admin = createAdminClient()
  const { error } = await admin.rpc('release_wallet_recharge_lock', {
    p_wallet_id: walletId,
    p_attempt_id: attemptId,
  })
  if (error) throw error
  logStripeEvent('warn', event, {
    phase,
    wallet_id: walletId,
    pi_id: pi.id,
    last_payment_error: pi.last_payment_error?.message ?? null,
  })
}

async function handlePaymentIntentFailed(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent
  if (pi.metadata?.auto_recharge !== 'true') return
  await releaseAutoRechargeLock(event, pi, 'auto_recharge_failed')
}

async function handlePaymentIntentCanceled(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent
  if (pi.metadata?.auto_recharge !== 'true') return
  await releaseAutoRechargeLock(event, pi, 'auto_recharge_canceled')
}

/**
 * requires_action is NON-terminal â€” do NOT release the lock here; otherwise the next
 * SMS deduct could kick off a second off-session PI while the first awaits 3DS.
 * The eventual terminal event (succeeded / payment_failed / canceled) will settle it.
 */
async function handlePaymentIntentRequiresAction(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent
  if (pi.metadata?.auto_recharge !== 'true') return
  logStripeEvent('warn', event, {
    phase: 'auto_recharge_requires_action',
    wallet_id: pi.metadata.wallet_id ?? null,
    pi_id: pi.id,
    last_payment_error: pi.last_payment_error?.message ?? null,
  })
}

// --- Event Handlers ---

function getCheckoutPaymentIntentId(session: Stripe.Checkout.Session) {
  if (!session.payment_intent) return null
  return typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent.id
}

async function handlePrelaunchPaymentGateCheckout(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
) {
  const launchBuildId = session.metadata?.launch_build_id ?? null
  const gateType = session.metadata?.payment_gate ?? 'start_work_fee'
  const now = new Date().toISOString()
  const admin = createAdminClient()

  if (session.payment_status !== 'paid') {
    await admin
      .from('sparkle_suite_payment_gates')
      .update({
        status: 'failed',
        failed_at: now,
        updated_at: now,
      })
      .eq('stripe_checkout_session_id', session.id)

    logStripeEvent('warn', event, {
      phase: 'prelaunch_payment_gate_checkout',
      checkout_session_id: session.id,
      payment_status: session.payment_status,
    })
    return
  }

  const { error } = await admin
    .from('sparkle_suite_payment_gates')
    .update({
      status: 'paid',
      stripe_payment_intent_id: getCheckoutPaymentIntentId(session),
      stripe_customer_id:
        typeof session.customer === 'string' ? session.customer : null,
      amount_cents: session.amount_total,
      currency: session.currency ?? 'usd',
      livemode: session.livemode,
      paid_at: now,
      updated_at: now,
    })
    .eq('stripe_checkout_session_id', session.id)

  if (error) throw error

  if (launchBuildId) {
    await upsertPrelaunchLaunchGate(
      {
        launchBuildId,
        gateKey: 'payment',
        status: 'ready',
        notes: `Stripe checkout ${session.id} paid for ${gateType}.`,
        operatorRepId: null,
      },
      admin,
    )
  }

  logStripeEvent('info', event, {
    phase: 'prelaunch_payment_gate_checkout',
    checkout_session_id: session.id,
    launch_build_id: launchBuildId,
  })
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session

  // Wallet loads are mode='payment', so they must be handled BEFORE the subscription-only early return.
  if (session.metadata?.wallet_load === 'true') {
    await handleWalletLoad(event, session)
    return
  }

  if (session.metadata?.sparkle_suite_payment_gate === 'true') {
    await handlePrelaunchPaymentGateCheckout(event, session)
    return
  }

  if (session.mode !== 'subscription' || !session.subscription) return

  if (session.payment_status !== 'paid') {
    logStripeEvent('info', event, {
      phase: 'checkout_completed',
      skipped: true,
      reason: 'not_paid',
      session_id: session.id,
      payment_status: session.payment_status,
    })
    return
  }

  const grandfatheredRepId = getGrandfatheredPaymentLinkRepId(session)
  const repId = session.metadata?.rep_id ?? grandfatheredRepId
  const planType = session.metadata?.plan_type ?? (grandfatheredRepId ? 'monthly' : undefined)
  const pricingTier =
    session.metadata?.pricing_tier ??
    (grandfatheredRepId ? 'grandfathered' : undefined)
  const founderSequence = parsePositiveIntMetadata(
    session.metadata?.founder_sequence,
  )
  const founderRateMonths = parsePositiveIntMetadata(
    session.metadata?.founder_rate_months,
  )
  const buildFeeCharged = session.metadata?.build_fee_charged === 'true'
  if (!repId) {
    logStripeEvent('error', event, { phase: 'checkout_completed', error: 'Missing rep_id in metadata' })
    return
  }

  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
    { expand: ['items'] }
  )
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const period = getSubscriptionPeriod(subscription)
  const subscriptionScheduleId =
    pricingTier === 'founder'
      ? await ensureFounderStepUpSchedule({
          stripe,
          subscription,
          repId,
          founderSequence,
          founderRateMonths,
          founderMonthlyPriceId: session.metadata?.monthly_price_id ?? null,
          periodStart: period.start,
        })
      : null
  const admin = createAdminClient()

  await admin
    .from('reps')
    .update({
      stripe_customer_id: customerId,
      ...(pricingTier ? { pricing_tier: pricingTier } : {}),
      ...(founderSequence ? { founder_sequence: founderSequence } : {}),
    })
    .eq('id', repId)

  const { error } = await admin
    .from('subscriptions')
    .upsert({
      rep_id: repId,
      stripe_subscription_id: subscription.id,
      stripe_subscription_schedule_id: subscriptionScheduleId,
      stripe_customer_id: customerId,
      plan_tier: planType ?? 'monthly',
      pricing_tier: pricingTier ?? null,
      founder_sequence: founderSequence,
      build_fee_charged: buildFeeCharged,
      founder_rate_months: founderRateMonths,
      build_fee_price_id: session.metadata?.build_fee_price_id ?? null,
      monthly_price_id: session.metadata?.monthly_price_id ?? null,
      status: mapStripeStatus(subscription.status),
      current_period_start: new Date(period.start * 1000).toISOString(),
      current_period_end: new Date(period.end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_livemode: event.livemode,
      stripe_event_timestamp: event.created,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'rep_id',
    })

  if (error) throw error

  if (session.metadata?.first_run_setup === 'operator_trial_conversion') {
    const now = new Date().toISOString()
    const { error: workspaceTrialError } = await admin
      .from('workspace_trials')
      .update({
        status: 'revoked',
        revoked_at: now,
        updated_at: now,
      })
      .eq('rep_id', repId)

    if (workspaceTrialError) throw workspaceTrialError
  }

  await createPendingReferralAfterPaidCheckout({
    supabase: admin,
    referrerRepId: session.metadata?.referrer_rep_id,
    referredRepId: repId,
    referralCodeUsed: session.metadata?.referral_code_used,
  })

  if (!isRequiredNicNacSetupCheckout(session)) {
    logStripeEvent('info', event, {
      phase: 'checkout_completed',
      skipped_required_setup: true,
      reason: 'not_required_nic_nac_setup_checkout',
      rep_id: repId,
      subscription_id: subscription.id,
    })
    return
  }

  const now = new Date().toISOString()
  await transitionSetupSessionAfterCheckout(admin, repId, now)
  await createRequiredSetupCheckoutFulfillment({
    admin,
    repId,
    session,
    subscription,
    paidAtIso: new Date(event.created * 1000).toISOString(),
  })

  logStripeEvent('info', event, {
    phase: 'checkout_completed',
    rep_id: repId,
    subscription_id: subscription.id,
    customer_id: customerId,
  })
}

async function handleCheckoutExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  if (session.mode !== 'subscription') return
  if (session.metadata?.pricing_tier !== 'founder') return

  const repId = session.metadata?.rep_id
  const founderSequence = parsePositiveIntMetadata(
    session.metadata?.founder_sequence,
  )
  if (!repId || !founderSequence) {
    logStripeEvent('warn', event, {
      phase: 'checkout_expired',
      skipped: true,
      reason: 'missing_founder_reservation_metadata',
      session_id: session.id,
    })
    return
  }

  const admin = createAdminClient()
  const { data: released, error } = await admin.rpc(
    'release_sparkle_suite_checkout_pricing',
    {
      p_rep_id: repId,
      p_founder_sequence: founderSequence,
    },
  )
  if (error) throw error

  logStripeEvent('info', event, {
    phase: 'checkout_expired',
    rep_id: repId,
    founder_sequence: founderSequence,
    reservation_released: released === true,
  })
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const admin = createAdminClient()

  // Race condition protection: only overwrite if this event is newer (Finding 4)
  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_event_timestamp')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (existing?.stripe_event_timestamp && existing.stripe_event_timestamp >= event.created) {
    logStripeEvent('info', event, {
      phase: 'subscription_updated',
      skipped: true,
      reason: 'older_event',
    })
    return
  }

  const period = getSubscriptionPeriod(subscription)

  const { error } = await admin
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id,
      status: mapStripeStatus(subscription.status),
      current_period_start: new Date(period.start * 1000).toISOString(),
      current_period_end: new Date(period.end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      stripe_livemode: event.livemode,
      stripe_event_timestamp: event.created,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id',
    })

  if (error) throw error

  logStripeEvent('info', event, {
    phase: 'subscription_updated',
    subscription_id: subscription.id,
    status: subscription.status,
  })
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const admin = createAdminClient()

  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_at_period_end: false,
      stripe_event_timestamp: event.created,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) throw error

  logStripeEvent('info', event, {
    phase: 'subscription_deleted',
    subscription_id: subscription.id,
  })
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return

  const admin = createAdminClient()
  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) throw error

  const stripe = getStripe()
  await processReferralPaidSubscriptionInvoice({
    supabase: admin,
    stripe,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: getInvoiceCustomerId(invoice),
    amountPaidCents: invoice.amount_paid ?? 0,
    paidAtIso: new Date(
      (invoice.status_transitions?.paid_at ?? event.created) * 1000,
    ).toISOString(),
  })

  logStripeEvent('info', event, {
    phase: 'invoice_payment_succeeded',
    subscription_id: subscriptionId,
  })
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return

  const admin = createAdminClient()
  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) throw error

  logStripeEvent('info', event, {
    phase: 'invoice_payment_failed',
    subscription_id: subscriptionId,
  })
}

// --- Main Handler ---

const EVENT_HANDLERS: Record<string, (event: Stripe.Event) => Promise<void>> = {
  'checkout.session.completed': handleCheckoutCompleted,
  'checkout.session.expired': handleCheckoutExpired,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.paid': handleInvoicePaymentSucceeded,
  'invoice.payment_succeeded': handleInvoicePaymentSucceeded,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'payment_intent.canceled': handlePaymentIntentCanceled,
  'payment_intent.requires_action': handlePaymentIntentRequiresAction,
}

export async function POST(request: Request) {
  const stripeConfig = getStripeConfig()
  if (!stripeConfig) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, stripeConfig.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe/webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const handler = EVENT_HANDLERS[event.type]
  if (!handler) {
    return NextResponse.json({ received: true })
  }

  try {
    const claimed = await claimStripeEvent(event.id, event.type)
    if (!claimed) {
      return NextResponse.json({ received: true, deduplicated: true })
    }

    await handler(event)
    await markStripeEventProcessed(event.id, event.type)
    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await markStripeEventFailed(event.id, event.type, message)
    logStripeEvent('error', event, {
      phase: 'handler_error',
      error: message,
    })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
