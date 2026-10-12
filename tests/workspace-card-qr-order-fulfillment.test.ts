import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fulfillPaidCardQrSession } from '@/lib/workspace/card-qr/order-fulfillment'
import { buildCardQrCheckoutParams } from '@/lib/workspace/card-qr/checkout'
import { DEFAULT_CARD_QR_DESIGN } from '@/lib/workspace/card-qr/design'

const REP = '00000000-0000-0000-0000-000000000001'
const ORDER = '11111111-1111-1111-1111-111111111111'

/** Minimal in-memory stand-in for the Supabase calls fulfillment makes. */
function fakeDb() {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    rep_card_print_orders: [{
      id: ORDER, order_number: 'SS-CARD-000123', rep_id: REP, status: 'pending', quantity: 500, amount_cents: 10000,
      stripe_checkout_session_id: 'cs_test_1', design_theme: 'halloween_pumpkin_cat', proof_pdf_path: `${REP}/x/proof.pdf`,
      ship_address: { name: 'Louis Chapman', street1: '100 Congress Ave', street2: '', city: 'Austin', state: 'TX', zip: '78701', phone: '' },
    }],
    reps: [{ id: REP, display_name: 'Louis Chapman', email: 'louis@example.com' }],
    card_order_ledger: [],
  }
  const query = (table: string) => {
    const filters: Array<[string, unknown]> = []
    let patch: Record<string, unknown> | null = null
    let wantRows = false
    const rows = () => tables[table].filter((r) => filters.every(([k, v]) => r[k] === v))
    const run = () => {
      const hit = rows()
      if (patch) hit.forEach((r) => Object.assign(r, patch))
      return hit
    }
    const q: Record<string, unknown> = {
      select: () => { wantRows = true; return q },
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q },
      update: (p: Record<string, unknown>) => { patch = p; return q },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      upsert: async (row: Record<string, unknown>) => {
        if (!tables[table].some((r) => r.order_id === row.order_id)) tables[table].push(row)
        return { error: null }
      },
      then: (resolve: (v: unknown) => void) => { const hit = run(); resolve({ data: wantRows ? hit.map((r) => ({ id: r.id })) : null, error: null }) },
    }
    return q
  }
  const db = {
    from: query,
    storage: { from: () => ({ download: async () => ({ data: new Blob(['%PDF-proof']), error: null }) }) },
  } as unknown as SupabaseClient
  return { db, tables }
}

function paidSession(over: Record<string, unknown> = {}, md: Record<string, string> = {}) {
  const params = buildCardQrCheckoutParams({
    repId: REP, email: 'louis@example.com', quantity: 500, destinationUrl: 'https://sparkle-suite-smoke.vercel.app/x',
    origin: 'https://sparkle-suite-smoke.vercel.app', design: DEFAULT_CARD_QR_DESIGN, orderId: ORDER, orderNumber: 'SS-CARD-000123',
  })
  return {
    id: 'cs_test_1', mode: 'payment', livemode: false, payment_status: 'paid', amount_total: 10000, currency: 'usd',
    client_reference_id: REP, payment_intent: 'pi_test_1', metadata: { ...params.metadata, ...md }, ...over,
  }
}

describe('business card fulfillment (once-only)', () => {
  let send: ReturnType<typeof vi.fn>
  beforeEach(() => { send = vi.fn(async () => ({ id: 'em_1' })) })

  it('puts the order number in the session metadata and description', () => {
    const p = buildCardQrCheckoutParams({ repId: REP, email: 'a@b.co', quantity: 1000, destinationUrl: 'https://x.y/z', origin: 'https://x.y', design: DEFAULT_CARD_QR_DESIGN, orderId: ORDER, orderNumber: 'SS-CARD-000777' })
    expect(p.metadata).toMatchObject({ order_id: ORDER, order_number: 'SS-CARD-000777', sparkle_product: 'workspace_business_cards' })
    expect(p.line_items[0].price_data.product_data.description).toContain('SS-CARD-000777')
    expect(p.payment_intent_data?.description).toContain('SS-CARD-000777')
  })

  it('marks paid, writes the ledger and sends both emails on the first event', async () => {
    const { db, tables } = fakeDb()
    const r = await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, fulfillmentTo: 'louis@neonrabbit.net' })
    expect(r).toMatchObject({ status: 'paid', orderNumber: 'SS-CARD-000123', fulfillmentEmail: 'sent', repEmail: 'sent' })
    const order = tables.rep_card_print_orders[0]
    expect(order).toMatchObject({ status: 'paid', paid_via: 'webhook', stripe_payment_intent_id: 'pi_test_1', fulfillment_email_to: 'louis@neonrabbit.net' })
    expect(order.fulfillment_email_sent_at).toBeTruthy()
    expect(order.rep_email_sent_at).toBeTruthy()
    expect(tables.card_order_ledger).toEqual([expect.objectContaining({ order_number: 'SS-CARD-000123', amount_cents: 10000, quantity: 500, livemode: false, stripe_checkout_session_id: 'cs_test_1', stripe_payment_intent_id: 'pi_test_1' })])
    expect(Object.keys(tables.card_order_ledger[0])).not.toContain('ship_address')
    expect(send).toHaveBeenCalledTimes(2)
    const [print, rep] = send.mock.calls.map((c) => c[0])
    expect(print.to).toBe('louis@neonrabbit.net')
    expect(print.text).toMatch(/SS-CARD-000123[\s\S]*Louis Chapman <louis@example.com>[\s\S]*500 cards[\s\S]*\$100\.00[\s\S]*Halloween Pumpkin and Cat[\s\S]*100 Congress Ave[\s\S]*Austin, TX 78701/)
    expect(print.attachments[0].filename).toBe('SS-CARD-000123-proof.pdf')
    expect(rep.to).toBe('louis@example.com')
    for (const bit of ['SS-CARD-000123', '500 business cards', '$100.00', 'Austin, TX 78701', '14 business days']) expect(rep.text).toContain(bit)
  })

  it('a resent webhook, or the success page after the webhook, does not resend emails', async () => {
    const { db, tables } = fakeDb()
    await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, fulfillmentTo: 'louis@neonrabbit.net' })
    const again = await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, fulfillmentTo: 'louis@neonrabbit.net' })
    const page = await fulfillPaidCardQrSession(paidSession(), 'success_page', { db, send, fulfillmentTo: 'louis@neonrabbit.net' })
    expect(again.status).toBe('already_paid')
    expect(page.status).toBe('already_paid')
    expect(send).toHaveBeenCalledTimes(2)
    expect(tables.card_order_ledger).toHaveLength(1)
    expect(tables.rep_card_print_orders[0].paid_via).toBe('webhook')
  })

  it('ignores an unpaid session', async () => {
    const { db, tables } = fakeDb()
    const r = await fulfillPaidCardQrSession(paidSession({ payment_status: 'unpaid' }), 'webhook', { db, send })
    expect(r).toEqual({ status: 'ignored', reason: 'not_paid' })
    expect(tables.rep_card_print_orders[0].status).toBe('pending')
    expect(send).not.toHaveBeenCalled()
  })

  it('refuses a live-mode session', async () => {
    const { db, tables } = fakeDb()
    const r = await fulfillPaidCardQrSession(paidSession({ livemode: true }), 'webhook', { db, send })
    expect(r.status).toBe('refused')
    expect(tables.rep_card_print_orders[0].status).toBe('pending')
    expect(tables.card_order_ledger).toHaveLength(0)
    expect(send).not.toHaveBeenCalled()
  })

  it('refuses a rep or amount mismatch and ignores other products', async () => {
    const { db } = fakeDb()
    expect((await fulfillPaidCardQrSession(paidSession({ client_reference_id: 'someone-else' }), 'webhook', { db, send })).status).toBe('refused')
    expect((await fulfillPaidCardQrSession(paidSession({ amount_total: 100 }), 'webhook', { db, send })).status).toBe('refused')
    expect((await fulfillPaidCardQrSession(paidSession({}, { sparkle_product: 'other' }), 'webhook', { db, send })).status).toBe('not_card_order')
    expect(send).not.toHaveBeenCalled()
  })

  it('still marks paid when no fulfillment address is set, and records why no email went', async () => {
    const { db, tables } = fakeDb()
    const r = await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, fulfillmentTo: null })
    expect(r).toMatchObject({ status: 'paid', fulfillmentEmail: 'not_configured', repEmail: 'sent' })
    expect(tables.rep_card_print_orders[0].fulfillment_email_error).toMatch(/CARD_QR_FULFILLMENT_EMAIL/)
  })
})
