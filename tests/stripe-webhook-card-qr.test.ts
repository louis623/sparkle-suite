import { beforeEach, describe, expect, it, vi } from 'vitest'

const fulfill = vi.fn()
const rpc = vi.fn(async () => ({ data: true, error: null }))
let event: Record<string, unknown>

vi.mock('@/lib/stripe/config', () => ({
  getStripeConfig: () => ({ STRIPE_WEBHOOK_SECRET: 'whsec_test' }),
  getSparkleSuitePriceIds: () => ({}),
}))
vi.mock('@/lib/stripe/client', () => ({ getStripe: () => ({ webhooks: { constructEvent: () => event } }) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc }) }))
vi.mock('@/lib/workspace/card-qr/order-fulfillment', () => ({ fulfillPaidCardQrSession: (...a: unknown[]) => fulfill(...a) }))

import { POST } from '@/app/api/stripe/webhook/route'

const send = () => POST(new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=x' } }))
const cardSession = { id: 'cs_test_1', mode: 'payment', metadata: { sparkle_product: 'workspace_business_cards', order_id: 'o1' } }

describe('Stripe webhook: business card branch', () => {
  beforeEach(() => {
    fulfill.mockReset().mockResolvedValue({ status: 'paid', orderNumber: 'SS-CARD-000123' })
    rpc.mockClear()
  })

  it('routes test-mode card sessions to fulfillment as webhook', async () => {
    event = { id: 'evt_1', type: 'checkout.session.completed', livemode: false, data: { object: cardSession } }
    const res = await send()
    expect(res.status).toBe(200)
    expect(fulfill).toHaveBeenCalledWith(cardSession, 'webhook')
  })

  it('refuses live-mode card events without touching the order', async () => {
    event = { id: 'evt_2', type: 'checkout.session.completed', livemode: true, data: { object: cardSession } }
    const res = await send()
    expect(res.status).toBe(200)
    expect(fulfill).not.toHaveBeenCalled()
  })

  it('a refused fulfillment is logged, not retried (200)', async () => {
    fulfill.mockResolvedValue({ status: 'refused', reason: 'rep_mismatch' })
    event = { id: 'evt_3', type: 'checkout.session.completed', livemode: false, data: { object: cardSession } }
    expect((await send()).status).toBe(200)
  })
})
