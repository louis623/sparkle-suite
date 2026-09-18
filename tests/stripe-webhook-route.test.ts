import { beforeEach, describe, expect, it, vi } from 'vitest'

const getStripeConfigMock = vi.fn()
const getSparkleSuitePriceIdsMock = vi.fn()
const getStripeMock = vi.fn()
const createAdminClientMock = vi.fn()
const upsertPrelaunchLaunchGateMock = vi.fn()
const createLightBoxFulfillmentTaskMock = vi.fn()

vi.mock('@/lib/stripe/config', () => ({
  getStripeConfig: (...args: unknown[]) => getStripeConfigMock(...args),
  getSparkleSuitePriceIds: (...args: unknown[]) =>
    getSparkleSuitePriceIdsMock(...args),
}))

vi.mock('@/lib/stripe/client', () => ({
  getStripe: (...args: unknown[]) => getStripeMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClientMock(...args),
}))

vi.mock('@/lib/prelaunch/launch-gates', () => ({
  upsertPrelaunchLaunchGate: (...args: unknown[]) =>
    upsertPrelaunchLaunchGateMock(...args),
}))

vi.mock('@/lib/self-serve/light-box-fulfillment', () => ({
  createLightBoxFulfillmentTask: (...args: unknown[]) =>
    createLightBoxFulfillmentTaskMock(...args),
}))

import { POST } from '@/app/api/stripe/webhook/route'

function createStripeEventRpcMock(claimed = true) {
  return vi.fn((functionName: string, args: Record<string, unknown>) => {
    if (functionName === 'claim_stripe_event') {
      return Promise.resolve({ data: claimed, error: null })
    }
    if (functionName === 'mark_stripe_event_processed') {
      return Promise.resolve({ data: null, error: null })
    }
    if (functionName === 'mark_stripe_event_failed') {
      return Promise.resolve({ data: null, error: null })
    }
    throw new Error(`unexpected rpc ${functionName} ${JSON.stringify(args)}`)
  })
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    getStripeConfigMock.mockReset()
    getSparkleSuitePriceIdsMock.mockReset()
    getStripeMock.mockReset()
    createAdminClientMock.mockReset()
    upsertPrelaunchLaunchGateMock.mockReset()
    createLightBoxFulfillmentTaskMock.mockReset()
    getStripeConfigMock.mockReturnValue({
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    })
    getSparkleSuitePriceIdsMock.mockReturnValue({
      buildFee: 'price_build_fee',
      founderMonthly: 'price_founder_monthly',
      standardMonthly: 'price_standard_monthly',
    })
  })

  it('does not mutate subscription state when Stripe signature verification fails', async () => {
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error('bad signature')
        }),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'bad_sig' },
        body: JSON.stringify({ type: 'customer.subscription.deleted' }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Invalid signature' })
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('updates subscription status only after a verified Stripe event is constructed', async () => {
    const updateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }))
    const rpcMock = createStripeEventRpcMock()
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            update: updateMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_verified',
      type: 'customer.subscription.deleted',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'sub_verified',
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_verified' }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        cancel_at_period_end: false,
        stripe_event_timestamp: event.created,
      }),
    )
    expect(rpcMock).toHaveBeenCalledWith('claim_stripe_event', {
      p_event_id: 'evt_verified',
      p_event_type: 'customer.subscription.deleted',
    })
    expect(rpcMock).toHaveBeenCalledWith('mark_stripe_event_processed', {
      p_event_id: 'evt_verified',
      p_event_type: 'customer.subscription.deleted',
    })
  })

  it('deduplicates by claiming the Stripe event before running handler side effects', async () => {
    const subscriptionUpdateMock = vi.fn()
    const rpcMock = createStripeEventRpcMock(false)
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            update: subscriptionUpdateMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_duplicate',
      type: 'customer.subscription.deleted',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'sub_duplicate',
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_duplicate' }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      received: true,
      deduplicated: true,
    })
    expect(rpcMock).toHaveBeenCalledWith('claim_stripe_event', {
      p_event_id: 'evt_duplicate',
      p_event_type: 'customer.subscription.deleted',
    })
    expect(rpcMock).not.toHaveBeenCalledWith(
      'mark_stripe_event_processed',
      expect.anything(),
    )
    expect(subscriptionUpdateMock).not.toHaveBeenCalled()
  })

  it('does not start required setup or light-box fulfillment for unpaid subscription checkouts', async () => {
    const rpcMock = createStripeEventRpcMock()
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        throw new Error(`unexpected table ${table}`)
      }),
    }
    const retrieveSubscriptionMock = vi.fn()
    const event = {
      id: 'evt_unpaid_checkout',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_unpaid',
          mode: 'subscription',
          payment_status: 'unpaid',
          subscription: 'sub_unpaid',
          metadata: {
            rep_id: 'rep-unpaid',
            plan_type: 'monthly',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: retrieveSubscriptionMock,
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_unpaid_checkout' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(retrieveSubscriptionMock).not.toHaveBeenCalled()
    expect(createLightBoxFulfillmentTaskMock).not.toHaveBeenCalled()
    expect(rpcMock).toHaveBeenCalledWith('mark_stripe_event_processed', {
      p_event_id: 'evt_unpaid_checkout',
      p_event_type: 'checkout.session.completed',
    })
  })

  it('releases a founder pricing reservation when checkout expires unpaid', async () => {
    const rpcMock = vi.fn((functionName: string, args: Record<string, unknown>) => {
      if (functionName === 'claim_stripe_event') {
        return Promise.resolve({ data: true, error: null })
      }
      if (functionName === 'release_sparkle_suite_checkout_pricing') {
        return Promise.resolve({ data: true, error: null })
      }
      if (functionName === 'mark_stripe_event_processed') {
        return Promise.resolve({ data: null, error: null })
      }
      if (functionName === 'mark_stripe_event_failed') {
        return Promise.resolve({ data: null, error: null })
      }
      throw new Error(`unexpected rpc ${functionName} ${JSON.stringify(args)}`)
    })
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_checkout_expired',
      type: 'checkout.session.expired',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_expired_founder',
          mode: 'subscription',
          payment_status: 'unpaid',
          metadata: {
            rep_id: 'rep-expired-founder',
            pricing_tier: 'founder',
            founder_sequence: '4',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_checkout_expired' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(rpcMock).toHaveBeenCalledWith('claim_stripe_event', {
      p_event_id: 'evt_checkout_expired',
      p_event_type: 'checkout.session.expired',
    })
    expect(rpcMock).toHaveBeenCalledWith(
      'release_sparkle_suite_checkout_pricing',
      {
        p_rep_id: 'rep-expired-founder',
        p_founder_sequence: 4,
      },
    )
    expect(rpcMock).toHaveBeenCalledWith('mark_stripe_event_processed', {
      p_event_id: 'evt_checkout_expired',
      p_event_type: 'checkout.session.expired',
    })
  })

  it('marks claimed Stripe events failed when a handler throws so Stripe retries can reclaim them', async () => {
    const rpcMock = createStripeEventRpcMock()
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_retryable_failure',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_retryable_failure',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_retryable_failure',
          metadata: {
            rep_id: 'rep-retry',
            plan_type: 'monthly',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockRejectedValue(new Error('stripe temporary outage')),
      },
      subscriptionSchedules: {
        create: vi.fn(),
        update: vi.fn(),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_retryable_failure' }),
      }),
    )

    expect(response.status).toBe(500)
    expect(rpcMock).toHaveBeenCalledWith('claim_stripe_event', {
      p_event_id: 'evt_retryable_failure',
      p_event_type: 'checkout.session.completed',
    })
    expect(rpcMock).toHaveBeenCalledWith('mark_stripe_event_failed', {
      p_event_id: 'evt_retryable_failure',
      p_event_type: 'checkout.session.completed',
      p_error: 'stripe temporary outage',
    })
    expect(rpcMock).not.toHaveBeenCalledWith(
      'mark_stripe_event_processed',
      expect.anything(),
    )
  })

  it('marks checkout events failed when light-box fulfillment fails after payment', async () => {
    const repsUpdateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }))
    const repsSelectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'rep-light-box-failure',
            email: 'failure@example.com',
            display_name: 'Failure Rep',
          },
          error: null,
        }),
      })),
    }))
    const subscriptionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const setupSessionsMaybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })
    const setupSessionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const rpcMock = createStripeEventRpcMock()
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'reps') {
          return {
            select: repsSelectMock,
            update: repsUpdateMock,
          }
        }

        if (table === 'subscriptions') {
          return {
            upsert: subscriptionsUpsertMock,
          }
        }

        if (table === 'self_serve_setup_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: setupSessionsMaybeSingleMock,
              })),
            })),
            upsert: setupSessionsUpsertMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_light_box_failure',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_light_box_failure',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_light_box_failure',
          metadata: {
            rep_id: 'rep-light-box-failure',
            plan_type: 'monthly',
            first_run_setup: 'required_nic_nac',
            light_box_required: 'true',
            pricing_tier: 'standard',
            build_fee_charged: 'true',
          },
        },
      },
    }

    createLightBoxFulfillmentTaskMock.mockRejectedValueOnce(
      new Error('telegram unavailable'),
    )
    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_light_box_failure',
          customer: 'cus_light_box_failure',
          status: 'active',
          start_date: 1_779_120_000,
          billing_cycle_anchor: 1_781_712_000,
          cancel_at_period_end: false,
          schedule: null,
          items: {
            data: [
              {
                current_period_start: 1_779_120_000,
                current_period_end: 1_781_712_000,
              },
            ],
          },
        }),
      },
      subscriptionSchedules: {
        create: vi.fn(),
        update: vi.fn(),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_light_box_failure' }),
      }),
    )

    expect(response.status).toBe(500)
    expect(createLightBoxFulfillmentTaskMock).toHaveBeenCalled()
    expect(rpcMock).toHaveBeenCalledWith('mark_stripe_event_failed', {
      p_event_id: 'evt_light_box_failure',
      p_event_type: 'checkout.session.completed',
      p_error: 'telegram unavailable',
    })
    expect(rpcMock).not.toHaveBeenCalledWith(
      'mark_stripe_event_processed',
      expect.anything(),
    )
  })

  it('persists checkout pricing metadata after a verified subscription checkout', async () => {
    const repsUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const repsUpdateMock = vi.fn(() => ({ eq: repsUpdateEq }))
    const repsSelectSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: 'rep-founder',
        email: 'britt@example.com',
        display_name: 'Britt',
      },
      error: null,
    })
    const repsSelectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: repsSelectSingleMock,
      })),
    }))
    const subscriptionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const setupSessionsMaybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })
    const setupSessionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const rpcMock = createStripeEventRpcMock()
    const insertEventMock = vi.fn().mockResolvedValue({ error: null })
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'stripe_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: insertEventMock,
          }
        }

        if (table === 'reps') {
          return {
            select: repsSelectMock,
            update: repsUpdateMock,
          }
        }

        if (table === 'subscriptions') {
          return {
            upsert: subscriptionsUpsertMock,
          }
        }

        if (table === 'self_serve_setup_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: setupSessionsMaybeSingleMock,
              })),
            })),
            upsert: setupSessionsUpsertMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_verified',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_verified',
          collected_information: {
            shipping_details: {
              name: 'Brittany Smith',
              address: {
                line1: '123 Main St',
                city: 'Austin',
                state: 'TX',
                postal_code: '78701',
                country: 'US',
              },
            },
          },
          customer_details: {
            name: 'Fallback Name',
          },
          metadata: {
            rep_id: 'rep-founder',
            plan_type: 'monthly',
            first_run_setup: 'required_nic_nac',
            light_box_required: 'true',
            pricing_tier: 'founder',
            founder_sequence: '7',
            build_fee_charged: 'true',
            founder_rate_months: '12',
            build_fee_price_id: 'price_build_fee',
            monthly_price_id: 'price_founder_monthly',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_verified',
          customer: 'cus_verified',
          status: 'active',
          start_date: 1_779_120_000,
          billing_cycle_anchor: 1_781_712_000,
          cancel_at_period_end: false,
          schedule: null,
          items: {
            data: [
              {
                current_period_start: 1_779_120_000,
                current_period_end: 1_781_712_000,
              },
            ],
          },
        }),
      },
      subscriptionSchedules: {
        create: vi.fn().mockResolvedValue({
          id: 'sched_verified',
          current_phase: { start_date: 1_779_120_000 },
        }),
        update: vi.fn().mockResolvedValue({ id: 'sched_verified' }),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_checkout' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(repsUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_customer_id: 'cus_verified',
        pricing_tier: 'founder',
        founder_sequence: 7,
      }),
    )
    expect(repsUpdateEq).toHaveBeenCalledWith('id', 'rep-founder')
    expect(subscriptionsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-founder',
        stripe_subscription_id: 'sub_verified',
        pricing_tier: 'founder',
        founder_sequence: 7,
        build_fee_charged: true,
        founder_rate_months: 12,
        build_fee_price_id: 'price_build_fee',
        monthly_price_id: 'price_founder_monthly',
      }),
      { onConflict: 'rep_id' },
    )
    expect(setupSessionsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-founder',
        status: 'required_setup',
        current_step: 'account_basics',
        updated_at: expect.any(String),
      }),
      { onConflict: 'rep_id' },
    )
    expect(setupSessionsUpsertMock.mock.calls[0][0]).not.toHaveProperty(
      'completed_steps',
    )
    expect(createLightBoxFulfillmentTaskMock).toHaveBeenCalledWith(
      {
        repId: 'rep-founder',
        repEmail: 'britt@example.com',
        repName: 'Britt',
        stripeCheckoutSessionId: 'cs_verified',
        stripeSubscriptionId: 'sub_verified',
        paidAtIso: '2026-05-18T16:00:00.000Z',
        shippingName: 'Brittany Smith',
        shippingAddress: {
          line1: '123 Main St',
          city: 'Austin',
          state: 'TX',
          postal_code: '78701',
          country: 'US',
        },
      },
      admin,
    )
    expect(rpcMock).toHaveBeenCalledWith('claim_stripe_event', {
      p_event_id: 'evt_checkout',
      p_event_type: 'checkout.session.completed',
    })
    expect(rpcMock).toHaveBeenCalledWith('mark_stripe_event_processed', {
      p_event_id: 'evt_checkout',
      p_event_type: 'checkout.session.completed',
    })
  })

  it('does not start required setup or light-box fulfillment for paid subscription checkouts without required setup metadata', async () => {
    const repsUpdateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }))
    const subscriptionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const setupSessionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const rpcMock = createStripeEventRpcMock()
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'reps') {
          return {
            update: repsUpdateMock,
          }
        }

        if (table === 'subscriptions') {
          return {
            upsert: subscriptionsUpsertMock,
          }
        }

        if (table === 'self_serve_setup_sessions') {
          return {
            upsert: setupSessionsUpsertMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_plain_subscription_checkout',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_plain_subscription_checkout',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_plain_subscription_checkout',
          metadata: {
            rep_id: 'rep-plain',
            plan_type: 'monthly',
            pricing_tier: 'standard',
            build_fee_charged: 'true',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_plain_subscription_checkout',
          customer: 'cus_plain',
          status: 'active',
          start_date: 1_779_120_000,
          billing_cycle_anchor: 1_781_712_000,
          cancel_at_period_end: false,
          schedule: null,
          items: {
            data: [
              {
                current_period_start: 1_779_120_000,
                current_period_end: 1_781_712_000,
              },
            ],
          },
        }),
      },
      subscriptionSchedules: {
        create: vi.fn(),
        update: vi.fn(),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_plain_subscription_checkout' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(subscriptionsUpsertMock).toHaveBeenCalled()
    expect(setupSessionsUpsertMock).not.toHaveBeenCalled()
    expect(createLightBoxFulfillmentTaskMock).not.toHaveBeenCalled()
  })

  it('creates a pending referral row after a referred checkout is paid', async () => {
    const repsUpdateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }))
    const subscriptionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const referralMaybeSingleMock = vi.fn().mockResolvedValue({
      data: { id: 'referral-1' },
      error: null,
    })
    const referralUpsertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: referralMaybeSingleMock,
      })),
    }))
    const rpcMock = createStripeEventRpcMock()
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'reps') {
          return {
            update: repsUpdateMock,
          }
        }

        if (table === 'subscriptions') {
          return {
            upsert: subscriptionsUpsertMock,
          }
        }

        if (table === 'rep_referrals') {
          return {
            upsert: referralUpsertMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_referred_checkout',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_referred_checkout',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_referred_checkout',
          metadata: {
            rep_id: 'rep-referred',
            plan_type: 'monthly',
            pricing_tier: 'standard',
            build_fee_charged: 'true',
            referrer_rep_id: 'rep-referrer',
            referral_code_used: 'SS-K7M4Q9',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_referred_checkout',
          customer: 'cus_referred',
          status: 'active',
          start_date: 1_779_120_000,
          billing_cycle_anchor: 1_781_712_000,
          cancel_at_period_end: false,
          schedule: null,
          items: {
            data: [
              {
                current_period_start: 1_779_120_000,
                current_period_end: 1_781_712_000,
              },
            ],
          },
        }),
      },
      subscriptionSchedules: {
        create: vi.fn(),
        update: vi.fn(),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_referred_checkout' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(referralUpsertMock).toHaveBeenCalledWith(
      {
        referrer_rep_id: 'rep-referrer',
        referred_rep_id: 'rep-referred',
        referral_code_used: 'SS-K7M4Q9',
        reward_status: 'pending',
        updated_at: expect.any(String),
      },
      { onConflict: 'referred_rep_id' },
    )
  })

  it('credits the referrer after the referred rep reaches three paid subscription invoices', async () => {
    const subscriptionStatusUpdateEqMock = vi.fn().mockResolvedValue({ error: null })
    const referralMonthInsertMock = vi.fn().mockResolvedValue({ error: null })
    const referralUpdateEqMock = vi.fn().mockResolvedValue({ error: null })
    const referralUpdateMock = vi.fn(() => ({ eq: referralUpdateEqMock }))
    const createBalanceTransactionMock = vi.fn().mockResolvedValue({
      id: 'cbtxn_referral_credit',
    })
    const rpcMock = createStripeEventRpcMock()
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'subscriptions') {
          return {
            update: vi.fn(() => ({ eq: subscriptionStatusUpdateEqMock })),
            select: vi.fn((columns: string) => ({
              eq: vi.fn(() => {
                if (columns === 'rep_id') {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { rep_id: 'rep-referred' },
                      error: null,
                    }),
                  }
                }

                return {
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: {
                          status: 'active',
                          pricing_tier: 'standard',
                        },
                        error: null,
                      }),
                    })),
                  })),
                }
              }),
            })),
          }
        }

        if (table === 'rep_referrals') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'referral-1',
                    referrer_rep_id: 'rep-referrer',
                    referred_rep_id: 'rep-referred',
                    referral_code_used: 'SS-K7M4Q9',
                    reward_status: 'pending',
                    paid_service_months: 2,
                    stripe_credit_id: null,
                  },
                  error: null,
                }),
              })),
            })),
            update: referralUpdateMock,
          }
        }

        if (table === 'rep_referral_paid_months') {
          return {
            select: vi.fn((_: string, options?: { count?: string }) => ({
              eq: vi.fn(() => {
                if (options?.count === 'exact') {
                  return Promise.resolve({ count: 3, error: null })
                }

                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }
              }),
            })),
            insert: referralMonthInsertMock,
          }
        }

        if (table === 'reps') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'rep-referrer',
                    stripe_customer_id: 'cus_referrer',
                    pricing_tier: 'standard',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_invoice_referral_credit',
      type: 'invoice.payment_succeeded',
      livemode: false,
      created: 1_784_476_800,
      data: {
        object: {
          id: 'in_referral_3',
          amount_paid: 7499,
          customer: 'cus_referred',
          status_transitions: {
            paid_at: 1_784_476_800,
          },
          parent: {
            subscription_details: {
              subscription: 'sub_referred',
            },
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      customers: {
        createBalanceTransaction: createBalanceTransactionMock,
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_invoice_referral_credit' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(referralMonthInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referral_id: 'referral-1',
        referred_rep_id: 'rep-referred',
        stripe_invoice_id: 'in_referral_3',
        stripe_subscription_id: 'sub_referred',
        stripe_customer_id: 'cus_referred',
        amount_paid_cents: 7499,
      }),
    )
    expect(createBalanceTransactionMock).toHaveBeenCalledWith(
      'cus_referrer',
      expect.objectContaining({
        amount: -7499,
        currency: 'usd',
        description: 'Sparkle Suite referral reward',
      }),
      {
        idempotencyKey: 'sparkle-suite-referral-credit-referral-1',
      },
    )
    expect(referralUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reward_status: 'credited',
        stripe_credit_id: 'cbtxn_referral_credit',
        stripe_customer_id: 'cus_referrer',
      }),
    )
  })

  it('does not rewind a required setup session that has progressed past account basics', async () => {
    const repsUpdateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }))
    const repsSelectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'rep-progressed',
            email: 'progressed@example.com',
            display_name: 'Progressed Rep',
          },
          error: null,
        }),
      })),
    }))
    const subscriptionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const setupSessionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const setupSessionsMaybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        status: 'required_setup',
        current_step: 'about_page',
      },
      error: null,
    })
    const rpcMock = createStripeEventRpcMock()
    const insertEventMock = vi.fn().mockResolvedValue({ error: null })
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'stripe_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: insertEventMock,
          }
        }

        if (table === 'reps') {
          return {
            select: repsSelectMock,
            update: repsUpdateMock,
          }
        }

        if (table === 'subscriptions') {
          return {
            upsert: subscriptionsUpsertMock,
          }
        }

        if (table === 'self_serve_setup_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: setupSessionsMaybeSingleMock,
              })),
            })),
            upsert: setupSessionsUpsertMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_progressed_setup',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_progressed_setup',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_progressed_setup',
          metadata: {
            rep_id: 'rep-progressed',
            plan_type: 'monthly',
            first_run_setup: 'required_nic_nac',
            light_box_required: 'true',
            pricing_tier: 'standard',
            build_fee_charged: 'true',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_progressed_setup',
          customer: 'cus_progressed',
          status: 'active',
          start_date: 1_779_120_000,
          billing_cycle_anchor: 1_781_712_000,
          cancel_at_period_end: false,
          schedule: null,
          items: {
            data: [
              {
                current_period_start: 1_779_120_000,
                current_period_end: 1_781_712_000,
              },
            ],
          },
        }),
      },
      subscriptionSchedules: {
        create: vi.fn(),
        update: vi.fn(),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_progressed_setup' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(setupSessionsMaybeSingleMock).toHaveBeenCalled()
    expect(setupSessionsUpsertMock).not.toHaveBeenCalled()
    expect(createLightBoxFulfillmentTaskMock).toHaveBeenCalled()
  })

  it('does not downgrade dashboard_unlocked setup sessions after checkout replay', async () => {
    const repsUpdateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }))
    const repsSelectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'rep-unlocked',
            email: 'unlocked@example.com',
            display_name: 'Unlocked Rep',
          },
          error: null,
        }),
      })),
    }))
    const subscriptionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const setupSessionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const setupSessionsMaybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        status: 'dashboard_unlocked',
        current_step: 'complete',
      },
      error: null,
    })
    const rpcMock = createStripeEventRpcMock()
    const insertEventMock = vi.fn().mockResolvedValue({ error: null })
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'stripe_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: insertEventMock,
          }
        }

        if (table === 'reps') {
          return {
            select: repsSelectMock,
            update: repsUpdateMock,
          }
        }

        if (table === 'subscriptions') {
          return {
            upsert: subscriptionsUpsertMock,
          }
        }

        if (table === 'self_serve_setup_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: setupSessionsMaybeSingleMock,
              })),
            })),
            upsert: setupSessionsUpsertMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_unlocked_setup',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_unlocked_setup',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_unlocked_setup',
          metadata: {
            rep_id: 'rep-unlocked',
            plan_type: 'monthly',
            first_run_setup: 'required_nic_nac',
            light_box_required: 'true',
            pricing_tier: 'standard',
            build_fee_charged: 'true',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_unlocked_setup',
          customer: 'cus_unlocked',
          status: 'active',
          start_date: 1_779_120_000,
          billing_cycle_anchor: 1_781_712_000,
          cancel_at_period_end: false,
          schedule: null,
          items: {
            data: [
              {
                current_period_start: 1_779_120_000,
                current_period_end: 1_781_712_000,
              },
            ],
          },
        }),
      },
      subscriptionSchedules: {
        create: vi.fn(),
        update: vi.fn(),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_unlocked_setup' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(setupSessionsMaybeSingleMock).toHaveBeenCalled()
    expect(setupSessionsUpsertMock).not.toHaveBeenCalled()
    expect(createLightBoxFulfillmentTaskMock).toHaveBeenCalled()
  })

  it('marks a prelaunch payment gate paid after a verified Stripe checkout', async () => {
    const paymentGateEqMock = vi.fn().mockResolvedValue({ error: null })
    const paymentGateUpdateMock = vi.fn(() => ({ eq: paymentGateEqMock }))
    const rpcMock = createStripeEventRpcMock()
    const insertEventMock = vi.fn().mockResolvedValue({ error: null })
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'stripe_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: insertEventMock,
          }
        }

        if (table === 'sparkle_suite_payment_gates') {
          return {
            update: paymentGateUpdateMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_prelaunch_gate',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_prelaunch_gate',
          mode: 'payment',
          payment_status: 'paid',
          payment_intent: 'pi_prelaunch_gate',
          customer: 'cus_prelaunch_gate',
          amount_total: 50000,
          currency: 'usd',
          livemode: false,
          metadata: {
            sparkle_suite_payment_gate: 'true',
            payment_gate: 'start_work_fee',
            launch_build_id: 'build-1',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    upsertPrelaunchLaunchGateMock.mockResolvedValueOnce({ id: 'gate-1' })
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_prelaunch_gate' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(paymentGateUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paid',
        stripe_payment_intent_id: 'pi_prelaunch_gate',
        stripe_customer_id: 'cus_prelaunch_gate',
        amount_cents: 50000,
        livemode: false,
        paid_at: expect.any(String),
      }),
    )
    expect(paymentGateEqMock).toHaveBeenCalledWith(
      'stripe_checkout_session_id',
      'cs_prelaunch_gate',
    )
    expect(upsertPrelaunchLaunchGateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        launchBuildId: 'build-1',
        gateKey: 'payment',
        status: 'ready',
      }),
      admin,
    )
    expect(rpcMock).toHaveBeenCalledWith('claim_stripe_event', {
      p_event_id: 'evt_prelaunch_gate',
      p_event_type: 'checkout.session.completed',
    })
    expect(rpcMock).toHaveBeenCalledWith('mark_stripe_event_processed', {
      p_event_id: 'evt_prelaunch_gate',
      p_event_type: 'checkout.session.completed',
    })
  })

  it('schedules founder subscriptions to step up to standard monthly pricing after 12 paid months', async () => {
    const repsUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const repsUpdateMock = vi.fn(() => ({ eq: repsUpdateEq }))
    const repsSelectMock = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'rep-founder',
            email: 'founder@example.com',
            display_name: 'Founder Rep',
          },
          error: null,
        }),
      })),
    }))
    const subscriptionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const setupSessionsMaybeSingleMock = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })
    const setupSessionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const rpcMock = createStripeEventRpcMock()
    const insertEventMock = vi.fn().mockResolvedValue({ error: null })
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'stripe_events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null }),
              })),
            })),
            insert: insertEventMock,
          }
        }

        if (table === 'reps') {
          return {
            select: repsSelectMock,
            update: repsUpdateMock,
          }
        }

        if (table === 'subscriptions') {
          return {
            upsert: subscriptionsUpsertMock,
          }
        }

        if (table === 'self_serve_setup_sessions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: setupSessionsMaybeSingleMock,
              })),
            })),
            upsert: setupSessionsUpsertMock,
          }
        }

        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_founder_schedule',
      type: 'checkout.session.completed',
      livemode: false,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_founder_schedule',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_founder_schedule',
          metadata: {
            rep_id: 'rep-founder',
            plan_type: 'monthly',
            first_run_setup: 'required_nic_nac',
            light_box_required: 'true',
            pricing_tier: 'founder',
            founder_sequence: '3',
            build_fee_charged: 'true',
            founder_rate_months: '12',
            build_fee_price_id: 'price_build_fee',
            monthly_price_id: 'price_founder_monthly',
          },
        },
      },
    }
    const createScheduleMock = vi.fn().mockResolvedValue({
      id: 'sched_founder',
      current_phase: {
        start_date: 1_779_120_000,
        end_date: 1_781_712_000,
      },
    })
    const updateScheduleMock = vi.fn().mockResolvedValue({ id: 'sched_founder' })

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_founder_schedule',
          customer: 'cus_founder',
          status: 'active',
          start_date: 1_779_120_000,
          billing_cycle_anchor: 1_781_712_000,
          cancel_at_period_end: false,
          schedule: null,
          items: {
            data: [
              {
                current_period_start: 1_779_120_000,
                current_period_end: 1_781_712_000,
              },
            ],
          },
        }),
      },
      subscriptionSchedules: {
        create: createScheduleMock,
        update: updateScheduleMock,
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: 'evt_founder_schedule' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(createScheduleMock).toHaveBeenCalledWith({
      from_subscription: 'sub_founder_schedule',
      metadata: expect.objectContaining({
        rep_id: 'rep-founder',
        pricing_tier: 'founder',
        founder_sequence: '3',
      }),
    })
    expect(updateScheduleMock).toHaveBeenCalledWith(
      'sched_founder',
      expect.objectContaining({
        end_behavior: 'release',
        phases: [
          expect.objectContaining({
            start_date: 1_779_120_000,
            duration: {
              interval: 'month',
              interval_count: 12,
            },
            items: [{ price: 'price_founder_monthly', quantity: 1 }],
          }),
          expect.objectContaining({
            items: [{ price: 'price_standard_monthly', quantity: 1 }],
          }),
        ],
      }),
    )
    expect(subscriptionsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_subscription_id: 'sub_founder_schedule',
        stripe_subscription_schedule_id: 'sched_founder',
      }),
      { onConflict: 'rep_id' },
    )
  })

  it('revokes an operator workspace trial after paid subscription checkout while preserving its row', async () => {
    const rpcMock = createStripeEventRpcMock()
    const repsUpdateEqMock = vi.fn().mockResolvedValue({ error: null })
    const subscriptionsUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const workspaceTrialEqMock = vi.fn().mockResolvedValue({ error: null })
    const workspaceTrialUpdateMock = vi.fn(() => ({
      eq: workspaceTrialEqMock,
    }))
    const admin = {
      rpc: rpcMock,
      from: vi.fn((table: string) => {
        if (table === 'reps') {
          return {
            update: vi.fn(() => ({ eq: repsUpdateEqMock })),
          }
        }
        if (table === 'subscriptions') {
          return { upsert: subscriptionsUpsertMock }
        }
        if (table === 'workspace_trials') {
          return { update: workspaceTrialUpdateMock }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }
    const event = {
      id: 'evt_operator_trial_conversion',
      type: 'checkout.session.completed',
      livemode: true,
      created: 1_779_120_000,
      data: {
        object: {
          id: 'cs_operator_trial_conversion',
          mode: 'subscription',
          payment_status: 'paid',
          subscription: 'sub_operator_trial_conversion',
          metadata: {
            rep_id: 'rep-operator-trial',
            plan_type: 'monthly',
            first_run_setup: 'operator_trial_conversion',
            light_box_required: 'false',
            pricing_tier: 'standard',
            build_fee_charged: 'true',
          },
        },
      },
    }

    createAdminClientMock.mockReturnValue(admin)
    getStripeMock.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(event),
      },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue({
          id: 'sub_operator_trial_conversion',
          customer: 'cus_operator_trial_conversion',
          status: 'active',
          start_date: 1_779_120_000,
          billing_cycle_anchor: 1_781_712_000,
          cancel_at_period_end: false,
          schedule: null,
          items: {
            data: [
              {
                current_period_start: 1_779_120_000,
                current_period_end: 1_781_712_000,
              },
            ],
          },
        }),
      },
      subscriptionSchedules: {
        create: vi.fn(),
        update: vi.fn(),
      },
    })

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'verified_sig' },
        body: JSON.stringify({ id: event.id }),
      }),
    )

    expect(response.status).toBe(200)
    expect(subscriptionsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rep_id: 'rep-operator-trial',
        stripe_subscription_id: 'sub_operator_trial_conversion',
        status: 'active',
      }),
      { onConflict: 'rep_id' },
    )
    expect(workspaceTrialUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'revoked',
        revoked_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    )
    expect(workspaceTrialEqMock).toHaveBeenCalledWith(
      'rep_id',
      'rep-operator-trial',
    )
    expect(createLightBoxFulfillmentTaskMock).not.toHaveBeenCalled()
    expect(rpcMock).toHaveBeenCalledWith('mark_stripe_event_processed', {
      p_event_id: event.id,
      p_event_type: 'checkout.session.completed',
    })
  })
})
