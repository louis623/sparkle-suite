import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cardQrOrderBlockers,
  cardQrShipAddressSummary,
  isCompleteCardQrShipAddress,
  readCardQrProofApproval,
  validateCardQrShipAddress,
} from '@/lib/workspace/card-qr/ship-address'

const GOOD = { name: 'Louis Chapman', street1: '100 Congress Ave', street2: 'Suite 200', city: 'Austin', state: 'tx', zip: '787011234', phone: '512-555-0101' }

describe('shipping address validation', () => {
  it('normalizes a good US address', () => {
    const { address, errors } = validateCardQrShipAddress(GOOD)
    expect(errors).toEqual({})
    expect(address).toMatchObject({ state: 'TX', zip: '78701-1234', phone: '(512) 555-0101' })
    expect(cardQrShipAddressSummary(address)).toBe('Louis Chapman · 100 Congress Ave, Suite 200 · Austin, TX 78701-1234')
  })
  it('accepts 5-digit ZIP and empty optional fields', () => {
    expect(isCompleteCardQrShipAddress({ ...GOOD, zip: '78701', street2: '', phone: '' })).toBe(true)
  })
  it.each([
    ['state', { state: 'Texas' }],
    ['state', { state: 'ZZ' }],
    ['zip', { zip: '7870' }],
    ['zip', { zip: '78701-12' }],
    ['zip', { zip: 'ABCDE' }],
    ['phone', { phone: '555-01' }],
    ['street1', { street1: '' }],
    ['name', { name: '' }],
    ['city', { city: '' }],
  ])('rejects bad %s', (field, patch) => {
    expect(validateCardQrShipAddress({ ...GOOD, ...patch }).errors).toHaveProperty(field)
  })
  it('lists what blocks ordering', () => {
    expect(cardQrOrderBlockers({ addressSaved: false, detailsConfirmed: false, qrScanned: false })).toHaveLength(3)
    expect(cardQrOrderBlockers({ addressSaved: true, detailsConfirmed: true, qrScanned: false })).toEqual(['confirm you scanned the QR'])
    expect(cardQrOrderBlockers({ addressSaved: true, detailsConfirmed: true, qrScanned: true })).toEqual([])
  })
  it('only true booleans count as approval', () => {
    expect(readCardQrProofApproval({ detailsConfirmed: 'yes', qrScanned: 1 })).toMatchObject({ detailsConfirmed: false, qrScanned: false })
  })
})

const mocks = vi.hoisted(() => ({
  address: null as unknown,
  sessionsCreate: vi.fn(),
  store: vi.fn(),
  record: vi.fn(),
  attach: vi.fn(),
  failed: vi.fn(),
  render: vi.fn(),
}))
vi.mock('@/lib/workspace/card-qr/context', async (orig) => ({
  ...(await orig<typeof import('@/lib/workspace/card-qr/context')>()),
  loadCardQrContext: vi.fn(async () => ({
    repId: '00000000-0000-0000-0000-000000000001',
    rep: { email: 'louis@example.com', public_site_slug: 'dudes' },
    supabase: {},
    origin: 'https://sparkle-suite-smoke.vercel.app',
    destinationUrl: 'https://sparkle-suite-smoke.vercel.app/dudes',
    customDomain: null,
    settings: { appearancePreset: 'amethyst' },
  })),
}))
vi.mock('@/lib/workspace/card-qr/ship-address-store', () => ({
  readCardQrShipAddress: vi.fn(async () => ({ address: mocks.address, updatedAt: null, persistence: 'database' })),
}))
vi.mock('@/lib/workspace/card-qr/card-files', () => ({ renderCardQrCardFiles: mocks.render }))
vi.mock('@/lib/workspace/card-qr/proof-snapshot', () => ({ storeCardQrProofFiles: mocks.store, createPendingCardQrOrder: mocks.record, attachCardQrCheckoutSession: mocks.attach, markCardQrCheckoutFailed: mocks.failed }))
vi.mock('stripe', () => ({ default: class { checkout = { sessions: { create: mocks.sessionsCreate } } } }))

async function post(body: unknown) {
  const { POST } = await import('@/app/api/workspace/card-qr/checkout/route')
  return POST(new Request('https://sparkle-suite-smoke.vercel.app/api/workspace/card-qr/checkout', { method: 'POST', body: JSON.stringify(body) }))
}
const APPROVED = { detailsConfirmed: true, qrScanned: true, detailsConfirmedAt: '2026-10-11T22:00:00Z', qrScannedAt: '2026-10-11T22:01:00Z' }

describe('checkout gate (server)', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    mocks.address = validateCardQrShipAddress(GOOD).address
    mocks.sessionsCreate.mockReset().mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/x', livemode: false })
    mocks.store.mockReset().mockResolvedValue({ paths: { pdf: 'a/proof.pdf', front: 'a/front.png', back: 'a/back.png' }, sha256: 'abc' })
    mocks.record.mockReset().mockResolvedValue({ id: 'order-1', orderNumber: 'SS-CARD-000123' })
    mocks.attach.mockReset().mockResolvedValue(undefined)
    mocks.failed.mockReset().mockResolvedValue(undefined)
    mocks.render.mockReset().mockResolvedValue({ status: 'ok', key: 'amethyst', pdf: Buffer.from('%PDF'), front: Buffer.from('f'), back: Buffer.from('b'), warnings: [] })
  })

  it('rejects without both approvals', async () => {
    const res = await post({ quantity: 500, approval: { detailsConfirmed: true, qrScanned: false } })
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('CARD_QR_PROOF_NOT_APPROVED')
    expect(mocks.sessionsCreate).not.toHaveBeenCalled()
  })

  it('rejects without a saved address', async () => {
    mocks.address = null
    const res = await post({ quantity: 500, approval: APPROVED })
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('CARD_QR_ADDRESS_REQUIRED')
    expect(mocks.sessionsCreate).not.toHaveBeenCalled()
  })

  it('saves the approved proof before Stripe and records the pending order with the address', async () => {
    const res = await post({ quantity: 1000, theme: 'halloween_pumpkin_cat', approval: APPROVED })
    expect(res.status).toBe(200)
    expect(mocks.render).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'halloween_pumpkin_cat', 'pdf')
    expect(mocks.store.mock.invocationCallOrder[0]).toBeLessThan(mocks.sessionsCreate.mock.invocationCallOrder[0])
    expect(mocks.record.mock.invocationCallOrder[0]).toBeLessThan(mocks.sessionsCreate.mock.invocationCallOrder[0])
    expect(mocks.sessionsCreate.mock.calls[0][0].metadata).toMatchObject({ order_id: 'order-1', order_number: 'SS-CARD-000123' })
    expect(mocks.attach).toHaveBeenCalledWith('order-1', 'cs_test_1')
    expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({
      quantity: 1000,
      designTheme: 'halloween_pumpkin_cat',
      address: expect.objectContaining({ zip: '78701-1234' }),
      approval: expect.objectContaining({ detailsConfirmedAt: '2026-10-11T22:00:00.000Z' }),
      proof: expect.objectContaining({ sha256: 'abc' }),
    }))
  })

  it('marks the pending order failed when Stripe errors', async () => {
    mocks.sessionsCreate.mockRejectedValue(new Error('stripe down'))
    await expect(post({ quantity: 500, approval: APPROVED })).rejects.toThrow('stripe down')
    expect(mocks.failed).toHaveBeenCalledWith('order-1')
  })

  it('does not charge when the proof cannot be rendered', async () => {
    mocks.render.mockResolvedValue({ status: 'too_full', key: 'amethyst', warnings: ['Too much on the back.'] })
    const res = await post({ quantity: 500, approval: APPROVED })
    expect(res.status).toBe(422)
    expect(mocks.sessionsCreate).not.toHaveBeenCalled()
  })
})
