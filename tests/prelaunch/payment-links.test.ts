import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import {
  buildPaymentLinkAttentionAlert,
  buildPaymentLinkCheckoutParams,
  collectedCheckoutIdentity,
  createOperatorPaymentLink,
  expirePaymentLinkFromSession,
  fulfillPaidPaymentLink,
  PAYMENT_LINK_MAX_EXPIRY_SECONDS,
  resendOperatorPaymentLink,
  verifyPaidSubscriptionCheckout,
} from '@/lib/prelaunch/payment-links'

const PRICE_IDS = {
  buildFee: 'price_build',
  founderMonthly: 'price_founder',
  standardMonthly: 'price_standard',
}

const MIGRATION = 'supabase/migrations/20261018010000_ss_payment_first_links.sql'

function createAdminDouble() {
  const calls: Array<{ table: string; action: string; payload?: unknown }> = []
  const handlers: Array<{ table: string; action: string; result: unknown }> = []

  function queue(table: string, action: string, result: unknown) {
    handlers.push({ table, action, result })
  }

  const admin = {
    calls,
    queue,
    auth: {
      admin: {
        listUsers: vi.fn(),
        createUser: vi.fn(),
        generateLink: vi.fn(),
      },
    },
    rpc: vi.fn(),
    from(table: string) {
      const state: { action: string; payload?: unknown } = { action: 'select' }
      const run = async () => {
        calls.push({ table, action: state.action, payload: state.payload })
        const index = handlers.findIndex(
          (item) => item.table === table && item.action === state.action,
        )
        if (index < 0) {
          throw new Error(`unexpected ${state.action} on ${table}`)
        }
        const [handler] = handlers.splice(index, 1)
        return handler.result
      }
      const query = {
        select: () => query,
        insert: (payload: unknown) => {
          state.action = 'insert'
          state.payload = payload
          return query
        },
        update: (payload: unknown) => {
          state.action = 'update'
          state.payload = payload
          return query
        },
        upsert: (payload: unknown) => {
          state.action = 'upsert'
          state.payload = payload
          return query
        },
        delete: () => {
          state.action = 'delete'
          return query
        },
        eq: () => query,
        ilike: () => query,
        is: () => query,
        in: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: () => run(),
        single: () => run(),
        then: (
          resolve: (value: unknown) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(run()).then(resolve, reject),
      }
      return query
    },
  }

  return admin
}

function stripeDouble() {
  return {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
        expire: vi.fn(),
      },
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  }
}

function openLink(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link-1',
    launch_build_id: null,
    lead_name: null,
    lead_email: null,
    status: 'open',
    build_fee_waived: false,
    pricing_tier: 'standard',
    founder_sequence: null,
    monthly_price_id: 'price_standard',
    build_fee_price_id: 'price_build',
    stripe_checkout_session_id: 'cs_123',
    stripe_subscription_id: null,
    expires_at: '2026-10-18T12:00:00.000Z',
    rep_id: null,
    payment_email_draft: 'draft',
    welcome_email_draft: null,
    welcome_email_status: 'not_queued',
    ...overrides,
  }
}

function paidSession(linePriceIds: string[], email = 'New.Rep@example.com') {
  return {
    id: 'cs_123',
    mode: 'subscription',
    payment_status: 'paid',
    customer_details: {
      email,
      individual_name: 'New Rep',
      name: 'New Rep',
    },
    line_items: {
      data: linePriceIds.map((id) => ({ price: { id } })),
    },
  }
}

function activeSubscription(id = 'sub_123') {
  return {
    id,
    status: 'active',
    trial_end: null,
    customer: 'cus_123',
    items: {
      data: [{ current_period_start: 1_700_000_000, current_period_end: 1_702_592_000 }],
    },
    start_date: 1_700_000_000,
    billing_cycle_anchor: 1_702_592_000,
    cancel_at_period_end: false,
    schedule: null,
  }
}

describe('payment-link migration', () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), 'utf8')

  it('keys pending links by checkout session and holds founder slots for service role only', () => {
    expect(sql).toContain('create table if not exists public.sparkle_suite_payment_links')
    expect(sql).not.toContain('lead_email text not null')
    expect(sql).not.toContain('launch_build_id uuid not null')
    expect(sql).toContain('idx_payment_links_checkout_session')
    expect(sql).toContain('idx_payment_links_founder_sequence_held')
    expect(sql).toContain("status in ('open', 'paid', 'needs_attention')")
    expect(sql).toContain('attention_reason text')
    expect(sql).toContain('returning_rep boolean not null default false')
    expect(sql).toContain('assign_sparkle_suite_payment_link_pricing')
    expect(sql).toContain('p_pricing_tier text')
    expect(sql).toContain('release_sparkle_suite_payment_link_pricing')
    expect(sql).toContain("hashtext('sparkle_suite_founder_pricing')")
    expect(sql).toContain('grant select, insert, update, delete on table public.sparkle_suite_payment_links to service_role')
    expect(sql).toContain('from public, anon, authenticated')
    expect(sql).not.toMatch(/unique[^\n]*lead_email/i)
  })
})

describe('payment link attention', () => {
  it('emails the owner inbox and does not include a sign-in token', () => {
    const alert = buildPaymentLinkAttentionAlert({
      sessionId: 'cs_123',
      paymentLinkId: 'link-1',
      reason: 'missing_email',
      email: 'new.rep@example.com',
      name: 'New Rep',
    })
    expect(alert.to).toEqual(['louis@neonrabbit.net'])
    expect(alert.text).toContain('missing_email')
    expect(alert.text).not.toMatch(/token|magic/i)
  })
})

describe('payment link checkout', () => {
  const now = new Date('2026-10-18T12:00:00.000Z')

  it('charges the setup fee and monthly price without collecting an email up front', () => {
    const params = buildPaymentLinkCheckoutParams({
      paymentLinkId: 'link-1',
      tier: 'founder',
      founderSequence: 4,
      waiveSetupFee: false,
      priceIds: PRICE_IDS,
      origin: 'https://smoke.example',
      now,
    })

    expect(params.mode).toBe('subscription')
    expect(params).not.toHaveProperty('customer_email')
    expect(params.line_items).toEqual([
      { price: 'price_build', quantity: 1 },
      { price: 'price_founder', quantity: 1 },
    ])
    expect(params.expires_at).toBe(
      Math.floor(now.getTime() / 1000) + PAYMENT_LINK_MAX_EXPIRY_SECONDS,
    )
    expect(params.metadata.build_fee_waived).toBe('false')
    expect(params.metadata.build_fee_charged).toBe('true')
    expect(params.subscription_data.metadata.pricing_tier).toBe('founder')
    expect(JSON.stringify(params)).not.toContain('trial_period')
    expect(params.name_collection.individual.enabled).toBe(true)
  })

  it('omits the setup fee when the operator waives it', () => {
    const params = buildPaymentLinkCheckoutParams({
      paymentLinkId: 'link-1',
      tier: 'standard',
      founderSequence: null,
      waiveSetupFee: true,
      priceIds: PRICE_IDS,
      origin: 'https://smoke.example',
      now,
    })

    expect(params.line_items).toEqual([{ price: 'price_standard', quantity: 1 }])
    expect(params.metadata.build_fee_waived).toBe('true')
    expect(params.metadata.build_fee_charged).toBe('false')
    expect(params.metadata.monthly_price_id).toBe('price_standard')
  })

  it('reads the email and name Stripe collected', () => {
    expect(
      collectedCheckoutIdentity({
        email: ' New.Rep@example.com ',
        individual_name: 'New Rep',
        name: 'Backup',
      }),
    ).toEqual({ email: 'new.rep@example.com', name: 'New Rep' })
    expect(collectedCheckoutIdentity({ email: 'rep@example.com', name: 'Backup' })).toEqual({
      email: 'rep@example.com',
      name: 'Backup',
    })
    expect(collectedCheckoutIdentity(null)).toEqual({ email: '', name: '' })
  })

  it.each([
    ['subscription', 'paid', 'active', null, ['price_standard', 'price_build'], false, true],
    ['payment', 'paid', 'active', null, ['price_standard', 'price_build'], false, false],
    ['subscription', 'unpaid', 'active', null, ['price_standard', 'price_build'], false, false],
    ['subscription', 'paid', 'trialing', null, ['price_standard', 'price_build'], false, false],
    ['subscription', 'paid', 'active', 1_700_000_100, ['price_standard', 'price_build'], false, false],
    ['subscription', 'paid', 'active', null, ['price_standard'], true, true],
    ['subscription', 'paid', 'active', null, ['price_standard', 'price_build'], true, false],
    ['subscription', 'paid', 'active', null, ['price_standard'], false, false],
  ] as const)(
    'verifies mode %s payment %s status %s waived %s',
    (mode, paymentStatus, subscriptionStatus, trialEnd, linePriceIds, waived, ok) => {
      expect(
        verifyPaidSubscriptionCheckout({
          mode,
          paymentStatus,
          subscriptionStatus,
          trialEnd,
          linePriceIds: [...linePriceIds],
          monthlyPriceId: 'price_standard',
          buildFeePriceId: 'price_build',
          buildFeeWaived: waived,
        }).ok,
      ).toBe(ok)
    },
  )
})

describe('operator payment links', () => {
  it('creates a checkout link without an email, intake record, or auth user', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    admin.queue('sparkle_suite_payment_links', 'insert', {
      data: openLink({ stripe_checkout_session_id: null, monthly_price_id: null, build_fee_price_id: null }),
      error: null,
    })
    admin.queue('sparkle_suite_payment_links', 'update', {
      data: openLink(),
      error: null,
    })
    admin.rpc.mockResolvedValueOnce({
      data: [{ pricing_tier: 'standard', founder_sequence: null }],
      error: null,
    })
    stripe.checkout.sessions.create.mockResolvedValueOnce({
      id: 'cs_123',
      url: 'https://checkout.stripe.test/cs_123',
    })

    const link = await createOperatorPaymentLink({
      operatorRepId: 'operator-1',
      pricingTier: 'standard',
      waiveSetupFee: false,
      origin: 'https://smoke.example',
      now: new Date('2026-10-18T12:00:00.000Z'),
      admin: admin as never,
      stripe: stripe as never,
      priceIds: PRICE_IDS,
    })

    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
    expect(admin.calls[0]).toEqual({
      table: 'sparkle_suite_payment_links',
      action: 'insert',
      payload: {
        operator_rep_id: 'operator-1',
        status: 'open',
        build_fee_waived: false,
        welcome_email_status: 'not_queued',
      },
    })
    expect(admin.rpc).toHaveBeenCalledWith('assign_sparkle_suite_payment_link_pricing', {
      p_payment_link_id: 'link-1',
      p_pricing_tier: 'standard',
    })
    const created = stripe.checkout.sessions.create.mock.calls[0][0]
    expect(created.customer_email).toBeUndefined()
    expect(created.mode).toBe('subscription')
    expect(JSON.stringify(created)).not.toContain('trial_period')
    const savedDraft = admin.calls.find((call) => call.action === 'update')?.payload as {
      payment_email_draft?: string
      stripe_checkout_session_id?: string
    }
    expect(savedDraft.stripe_checkout_session_id).toBe('cs_123')
    expect(savedDraft.payment_email_draft).toContain('https://checkout.stripe.test/cs_123')
    expect(savedDraft.payment_email_draft).not.toMatch(/trial|Louis/i)
    expect(link.checkoutUrl).toBe('https://checkout.stripe.test/cs_123')
  })

  it('replaces an open link and releases the held founder slot', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    admin.queue('sparkle_suite_payment_links', 'select', {
      data: openLink({ pricing_tier: 'founder', founder_sequence: 3, build_fee_waived: true }),
      error: null,
    })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    admin.queue('sparkle_suite_payment_links', 'insert', {
      data: openLink({ id: 'link-2', stripe_checkout_session_id: null }),
      error: null,
    })
    admin.queue('sparkle_suite_payment_links', 'update', {
      data: openLink({ id: 'link-2', build_fee_waived: true, pricing_tier: 'founder' }),
      error: null,
    })
    admin.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: [{ pricing_tier: 'founder', founder_sequence: 3 }],
        error: null,
      })
    stripe.checkout.sessions.expire.mockResolvedValueOnce({})
    stripe.checkout.sessions.create.mockResolvedValueOnce({
      id: 'cs_new',
      url: 'https://checkout.stripe.test/cs_new',
    })

    await resendOperatorPaymentLink({
      paymentLinkId: 'link-1',
      operatorRepId: 'operator-1',
      origin: 'https://smoke.example',
      admin: admin as never,
      stripe: stripe as never,
      priceIds: PRICE_IDS,
    })

    expect(admin.rpc).toHaveBeenCalledWith('release_sparkle_suite_payment_link_pricing', {
      p_payment_link_id: 'link-1',
    })
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith('cs_123')
    expect(admin.calls.find((call) => call.action === 'update')?.payload).toEqual(
      expect.objectContaining({
        status: 'expired',
        pricing_tier: null,
        founder_sequence: null,
      }),
    )
    expect(stripe.checkout.sessions.create.mock.calls[0][0].line_items).toEqual([
      { price: 'price_founder', quantity: 1 },
    ])
  })
})

describe('paid payment link fulfillment', () => {
  function eventSession() {
    return {
      id: 'cs_123',
      mode: 'subscription',
      payment_status: 'paid',
      subscription: 'sub_123',
      metadata: {
        sparkle_suite_payment_first: 'true',
        payment_link_id: 'link-1',
        monthly_price_id: 'price_standard',
        build_fee_price_id: 'price_build',
      },
    }
  }

  it('creates one account from the email Stripe collected', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    admin.queue('sparkle_suite_payment_links', 'select', { data: openLink(), error: null })
    admin.queue('reps', 'select', { data: null, error: null })
    admin.queue('reps', 'insert', { data: { id: 'rep-new' }, error: null })
    admin.queue('site_settings', 'upsert', { error: null })
    admin.queue('onboarding_status', 'upsert', { error: null })
    admin.queue('self_serve_setup_sessions', 'upsert', { error: null })
    admin.queue('subscriptions', 'upsert', { error: null })
    admin.queue('reps', 'update', { error: null })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(
      paidSession(['price_build', 'price_standard']),
    )
    stripe.subscriptions.retrieve.mockResolvedValueOnce(activeSubscription())
    admin.auth.admin.listUsers.mockResolvedValueOnce({ data: { users: [] }, error: null })
    admin.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'auth-new' } },
      error: null,
    })
    const notifyAttention = vi.fn()
    const result = await fulfillPaidPaymentLink({
      session: eventSession(),
      livemode: false,
      eventCreated: 1_700_000_000,
      origin: 'https://smoke.example',
      notifyAttention,
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(result).toEqual({
      created: true,
      repId: 'rep-new',
      returningRep: false,
      welcomeEmailStatus: 'draft',
      retryable: false,
    })
    expect(admin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new.rep@example.com', email_confirm: true }),
    )
    expect(admin.calls.find((call) => call.table === 'reps' && call.action === 'insert')?.payload).toEqual(
      expect.objectContaining({
        email: 'new.rep@example.com',
        display_name: 'New Rep',
        status: 'active',
      }),
    )
    const paidUpdate = admin.calls.find(
      (call) => call.table === 'sparkle_suite_payment_links' && call.action === 'update',
    )?.payload as { status: string; welcome_email_status: string; lead_email: string; welcome_email_draft: string; returning_rep: boolean }
    expect(paidUpdate.status).toBe('paid')
    expect(paidUpdate.welcome_email_status).toBe('draft')
    expect(paidUpdate.lead_email).toBe('new.rep@example.com')
    expect(paidUpdate.returning_rep).toBe(false)
    expect(paidUpdate.welcome_email_draft).toContain('https://smoke.example/login?email=new.rep%40example.com')
    expect(paidUpdate.welcome_email_draft).not.toMatch(/magic|token|action_link/i)
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled()
    expect(notifyAttention).not.toHaveBeenCalled()
    expect(JSON.stringify(admin.calls)).not.toContain('workspace_trials')
  })

  it('creates the account for a waived setup fee only when that price is absent', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    admin.queue('sparkle_suite_payment_links', 'select', {
      data: openLink({
        build_fee_waived: true,
        build_fee_price_id: null,
        pricing_tier: 'standard',
        founder_sequence: null,
        monthly_price_id: 'price_standard',
      }),
      error: null,
    })
    admin.queue('reps', 'select', { data: null, error: null })
    admin.queue('reps', 'insert', { data: { id: 'rep-waived' }, error: null })
    admin.queue('site_settings', 'upsert', { error: null })
    admin.queue('onboarding_status', 'upsert', { error: null })
    admin.queue('self_serve_setup_sessions', 'upsert', { error: null })
    admin.queue('subscriptions', 'upsert', { error: null })
    admin.queue('reps', 'update', { error: null })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(paidSession(['price_standard']))
    stripe.subscriptions.retrieve.mockResolvedValueOnce(activeSubscription())
    admin.auth.admin.listUsers.mockResolvedValueOnce({ data: { users: [] }, error: null })
    admin.auth.admin.createUser.mockResolvedValueOnce({
      data: { user: { id: 'auth-waived' } },
      error: null,
    })
    const result = await fulfillPaidPaymentLink({
      session: {
        ...eventSession(),
        metadata: {
          sparkle_suite_payment_first: 'true',
          payment_link_id: 'link-1',
          monthly_price_id: 'price_standard',
          build_fee_price_id: '',
        },
      },
      livemode: false,
      eventCreated: 1_700_000_000,
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(result.created).toBe(true)
    expect(
      admin.calls.find((call) => call.table === 'subscriptions' && call.action === 'upsert')?.payload,
    ).toEqual(expect.objectContaining({ build_fee_charged: false, status: 'active' }))
  })

  it('does not create an account for a trialing subscription', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    admin.queue('sparkle_suite_payment_links', 'select', { data: openLink(), error: null })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(
      paidSession(['price_build', 'price_standard']),
    )
    stripe.subscriptions.retrieve.mockResolvedValueOnce({
      ...activeSubscription(),
      status: 'trialing',
      trial_end: 1_700_000_100,
    })
    const notifyAttention = vi.fn()

    const result = await fulfillPaidPaymentLink({
      session: eventSession(),
      livemode: false,
      eventCreated: 1_700_000_000,
      notifyAttention,
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(result).toEqual({ created: false, reason: 'trial_present', retryable: false })
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
    expect(admin.calls.some((call) => call.table === 'reps')).toBe(false)
    expect(admin.calls.find((call) => call.action === 'update')?.payload).toEqual(
      expect.objectContaining({ status: 'needs_attention', attention_reason: 'trial_present' }),
    )
    expect(notifyAttention).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'trial_present',
        paymentLinkId: 'link-1',
        sessionId: 'cs_123',
      }),
    )
  })

  it('does nothing when the same paid session is delivered again', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    admin.queue('sparkle_suite_payment_links', 'select', {
      data: openLink({ status: 'paid', rep_id: 'rep-existing' }),
      error: null,
    })

    const result = await fulfillPaidPaymentLink({
      session: eventSession(),
      livemode: false,
      eventCreated: 1_700_000_000,
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(result).toEqual({
      created: false,
      reason: 'already_created',
      retryable: false,
      repId: 'rep-existing',
    })
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled()
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('flags an email that already has an active subscription and does not create a second account', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    admin.queue('sparkle_suite_payment_links', 'select', { data: openLink(), error: null })
    admin.queue('reps', 'select', { data: { id: 'rep-paying', auth_user_id: 'auth-paying' }, error: null })
    admin.queue('subscriptions', 'select', {
      data: { stripe_subscription_id: 'sub_existing', status: 'active' },
      error: null,
    })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    admin.rpc.mockResolvedValueOnce({ data: true, error: null })
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(
      paidSession(['price_build', 'price_standard'], 'paying@example.com'),
    )
    stripe.subscriptions.retrieve.mockResolvedValueOnce(activeSubscription('sub_new'))

    const result = await fulfillPaidPaymentLink({
      session: eventSession(),
      livemode: false,
      eventCreated: 1_700_000_000,
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(result).toEqual({
      created: false,
      reason: 'duplicate_account',
      retryable: false,
      repId: 'rep-paying',
    })
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
    expect(admin.calls.some((call) => call.table === 'reps' && call.action === 'insert')).toBe(false)
    expect(admin.calls.some((call) => call.table === 'reps' && call.action === 'update')).toBe(false)
    expect(admin.calls.some((call) => call.table === 'subscriptions' && call.action === 'upsert')).toBe(false)
    expect(admin.rpc).toHaveBeenCalledWith('release_sparkle_suite_payment_link_pricing', {
      p_payment_link_id: 'link-1',
    })
    expect(admin.calls.find((call) => call.action === 'update')?.payload).toEqual(
      expect.objectContaining({
        status: 'duplicate',
        lead_email: 'paying@example.com',
        rep_id: 'rep-paying',
      }),
    )
  })

  it('records a price mismatch and alerts without asking Stripe to retry', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    const notifyAttention = vi.fn()
    admin.queue('sparkle_suite_payment_links', 'select', { data: openLink(), error: null })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(paidSession(['price_other']))
    stripe.subscriptions.retrieve.mockResolvedValueOnce(activeSubscription())

    const result = await fulfillPaidPaymentLink({
      session: eventSession(),
      livemode: false,
      eventCreated: 1_700_000_000,
      notifyAttention,
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(result).toEqual({
      created: false,
      reason: 'missing_monthly_price',
      retryable: false,
    })
    expect(notifyAttention).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'missing_monthly_price', email: 'new.rep@example.com' }),
    )
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('alerts when the paid session has no payment link and does not throw', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    const notifyAttention = vi.fn()
    admin.queue('sparkle_suite_payment_links', 'select', { data: null, error: null })
    admin.queue('sparkle_suite_payment_links', 'select', { data: null, error: null })

    const result = await fulfillPaidPaymentLink({
      session: eventSession(),
      livemode: false,
      eventCreated: 1_700_000_000,
      notifyAttention,
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(result).toEqual({
      created: false,
      reason: 'missing_payment_link',
      retryable: false,
    })
    expect(notifyAttention).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'missing_payment_link', paymentLinkId: null }),
    )
  })

  it('rethrows a Stripe read failure after recording it so Stripe can retry', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    const notifyAttention = vi.fn()
    admin.queue('sparkle_suite_payment_links', 'select', { data: openLink(), error: null })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    stripe.checkout.sessions.retrieve.mockRejectedValueOnce(new Error('stripe unavailable'))

    await expect(
      fulfillPaidPaymentLink({
        session: eventSession(),
        livemode: false,
        eventCreated: 1_700_000_000,
        notifyAttention,
        admin: admin as never,
        stripe: stripe as never,
      }),
    ).rejects.toThrow('stripe unavailable')
    expect(admin.calls.find((call) => call.action === 'update')?.payload).toEqual(
      expect.objectContaining({
        status: 'needs_attention',
        attention_reason: 'stripe unavailable',
      }),
    )
    expect(notifyAttention).toHaveBeenCalledOnce()
  })

  it('reactivates a returning rep who has no live subscription', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    admin.queue('sparkle_suite_payment_links', 'select', { data: openLink(), error: null })
    admin.queue('reps', 'select', {
      data: { id: 'rep-returning', auth_user_id: 'auth-old', status: 'inactive' },
      error: null,
    })
    admin.queue('subscriptions', 'select', {
      data: { stripe_subscription_id: 'sub_old', status: 'cancelled' },
      error: null,
    })
    admin.queue('subscriptions', 'upsert', { error: null })
    admin.queue('reps', 'update', { error: null })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(
      paidSession(['price_build', 'price_standard'], 'Returning.Rep@example.com'),
    )
    stripe.subscriptions.retrieve.mockResolvedValueOnce(activeSubscription('sub_new'))

    const result = await fulfillPaidPaymentLink({
      session: eventSession(),
      livemode: false,
      eventCreated: 1_700_000_000,
      origin: 'https://smoke.example',
      notifyAttention: vi.fn(),
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(result).toEqual({
      created: true,
      repId: 'rep-returning',
      returningRep: true,
      welcomeEmailStatus: 'draft',
      retryable: false,
    })
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
    expect(admin.calls.find((call) => call.table === 'reps' && call.action === 'update')?.payload).toEqual(
      expect.objectContaining({
        email: 'returning.rep@example.com',
        status: 'active',
      }),
    )
    expect(admin.calls.find((call) => call.table === 'sparkle_suite_payment_links' && call.action === 'update')?.payload).toEqual(
      expect.objectContaining({
        status: 'paid',
        returning_rep: true,
        lead_email: 'returning.rep@example.com',
      }),
    )
  })

  it('resolves test lookup keys when price env vars are absent', async () => {
    const admin = createAdminDouble()
    const stripe = stripeDouble()
    stripe.prices = {
      list: vi.fn(async () => ({
        data: [
          { id: 'price_build_lookup', lookup_key: 'sparkle_suite_launch_demo_build_fee_test' },
          { id: 'price_founder_lookup', lookup_key: 'sparkle_suite_launch_demo_founder_monthly_test' },
          { id: 'price_standard_lookup', lookup_key: 'sparkle_suite_launch_demo_standard_monthly_test' },
        ],
      })),
    }
    admin.queue('sparkle_suite_payment_links', 'insert', {
      data: openLink({ stripe_checkout_session_id: null, pricing_tier: null }),
      error: null,
    })
    admin.queue('sparkle_suite_payment_links', 'update', { data: openLink(), error: null })
    admin.rpc.mockResolvedValueOnce({
      data: [{ pricing_tier: 'standard', founder_sequence: null }],
      error: null,
    })
    stripe.checkout.sessions.create.mockResolvedValueOnce({
      id: 'cs_lookup',
      url: 'https://checkout.stripe.test/cs_lookup',
    })

    await createOperatorPaymentLink({
      operatorRepId: 'operator-1',
      pricingTier: 'standard',
      waiveSetupFee: false,
      origin: 'https://smoke.example',
      secretKey: 'sk_test_prices',
      priceIds: {},
      admin: admin as never,
      stripe: stripe as never,
    })

    expect(stripe.prices.list).toHaveBeenCalledWith({
      lookup_keys: [
        'sparkle_suite_launch_demo_build_fee_test',
        'sparkle_suite_launch_demo_founder_monthly_test',
        'sparkle_suite_launch_demo_standard_monthly_test',
      ],
      active: true,
      limit: 10,
    })
    expect(stripe.checkout.sessions.create.mock.calls[0][0].line_items).toEqual([
      { price: 'price_build_lookup', quantity: 1 },
      { price: 'price_standard_lookup', quantity: 1 },
    ])
  })

  it('releases the founder slot when the checkout session expires', async () => {
    const admin = createAdminDouble()
    admin.queue('sparkle_suite_payment_links', 'select', {
      data: { id: 'link-1', status: 'open' },
      error: null,
    })
    admin.queue('sparkle_suite_payment_links', 'update', { error: null })
    admin.rpc.mockResolvedValueOnce({ data: true, error: null })

    const result = await expirePaymentLinkFromSession({
      sessionId: 'cs_123',
      admin: admin as never,
    })

    expect(result).toEqual({ expired: true })
    expect(admin.rpc).toHaveBeenCalledWith('release_sparkle_suite_payment_link_pricing', {
      p_payment_link_id: 'link-1',
    })
    expect(admin.calls.find((call) => call.action === 'update')?.payload).toEqual(
      expect.objectContaining({
        status: 'expired',
        pricing_tier: null,
        founder_sequence: null,
      }),
    )
  })
})
