import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fulfillPaidCardQrSession } from '@/lib/workspace/card-qr/order-fulfillment'
import { approveCardQrOrderForPrinter, sendCardQrApproverEmail, signCardQrApproval, verifyCardQrApproval } from '@/lib/workspace/card-qr/printer-approval'
import { runCardQrApproverEmailCheck } from '@/lib/workspace/card-qr/approver-email-check'
import { CardQrSendError } from '@/lib/workspace/card-qr/order-emails'
import { buildCardQrCheckoutParams } from '@/lib/workspace/card-qr/checkout'
import { DEFAULT_CARD_QR_DESIGN } from '@/lib/workspace/card-qr/design'

const REP = '00000000-0000-0000-0000-000000000001'
const ORDER = '11111111-1111-1111-1111-111111111111'

/** Minimal in-memory stand-in for the Supabase calls fulfillment makes. */
function fakeDb() {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    rep_card_print_orders: [{
      id: ORDER, order_number: 'SS-CARD-000123', rep_id: REP, status: 'pending', livemode: false, quantity: 500, amount_cents: 10000,
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
    const inFilters: Array<[string, unknown[]]> = []
    const ltFilters: Array<[string, string]> = []
    const rows = () => tables[table].filter((r) =>
      filters.every(([k, v]) => (v === null ? r[k] == null : r[k] === v)) &&
      inFilters.every(([k, v]) => v.includes(r[k])) &&
      ltFilters.every(([k, v]) => typeof r[k] === 'string' && (r[k] as string) < v))
    const run = () => {
      const hit = rows()
      if (patch) hit.forEach((r) => Object.assign(r, patch))
      return hit
    }
    const q: Record<string, unknown> = {
      select: () => { wantRows = true; return q },
      eq: (k: string, v: unknown) => { filters.push([k, v]); return q },
      is: (k: string, v: unknown) => { filters.push([k, v]); return q },
      in: (k: string, v: unknown[]) => { inFilters.push([k, v]); return q },
      lt: (k: string, v: string) => { ltFilters.push([k, v]); return q },
      order: () => q,
      limit: () => q,
      update: (p: Record<string, unknown>) => { patch = p; return q },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      upsert: async (row: Record<string, unknown>) => {
        if (!tables[table].some((r) => r.order_id === row.order_id)) tables[table].push(row)
        return { error: null }
      },
      then: (resolve: (v: unknown) => void) => { const hit = run(); resolve({ data: wantRows ? (patch ? hit.map((r) => ({ id: r.id })) : hit) : null, error: null }) },
    }
    return q
  }
  // Same rules as public.card_qr_claim_email (migration 20261012020000).
  const clock = { now: Date.now() }
  const rpc = async (_fn: string, args: { p_order_id: string; p_kind: 'approver' | 'printer' }) => {
    const r = tables.rep_card_print_orders.find((o) => o.id === args.p_order_id)
    const k = args.p_kind
    const stale = (at: unknown) => typeof at === 'string' && Date.parse(at) < clock.now - 15 * 60e3
    const status = r?.[`${k}_email_status`]
    const ok = Boolean(r) && ['paid', 'received'].includes(r!.status as string) &&
      (k === 'approver' ? r!.fulfillment_email_sent_at == null : r!.printer_approved_at != null && r!.printer_email_sent_at == null) &&
      (status == null || status === 'failed' || (status === 'claimed' && stale(r![`${k}_email_claimed_at`])))
    if (ok) Object.assign(r!, { [`${k}_email_status`]: 'claimed', [`${k}_email_claimed_at`]: new Date(clock.now).toISOString() })
    return { data: ok, error: null }
  }
  const db = {
    rpc,
    from: query,
    storage: { from: () => ({ download: async () => ({ data: new Blob(['%PDF-proof']), error: null }) }) },
  } as unknown as SupabaseClient
  return { db, tables, clock }
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
    const r = await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, approverTo: 'louis@neonrabbit.net', approveUrl: 'https://x.test/approve?token=t' })
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
    expect(print.subject).toBe('[TEST] APPROVAL NEEDED: SS-CARD-000123 for Amelia')
    expect(print.text).toContain('https://x.test/approve?token=t')
    expect(print.text).toMatch(/SS-CARD-000123[\s\S]*Louis Chapman <louis@example.com>[\s\S]*500 cards[\s\S]*\$100\.00[\s\S]*Halloween Pumpkin and Cat[\s\S]*100 Congress Ave[\s\S]*Austin, TX 78701/)
    expect(print.attachments[0].filename).toBe('SS-CARD-000123-proof.pdf')
    expect(rep.to).toBe('louis@example.com')
    for (const bit of ['SS-CARD-000123', '500 business cards', '$100.00', 'Austin, TX 78701', '14 business days']) expect(rep.text).toContain(bit)
  })

  it('a resent webhook, or the success page after the webhook, does not resend emails', async () => {
    const { db, tables } = fakeDb()
    await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, approverTo: 'louis@neonrabbit.net', approveUrl: 'https://x.test/approve?token=t' })
    const again = await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, approverTo: 'louis@neonrabbit.net', approveUrl: 'https://x.test/approve?token=t' })
    const page = await fulfillPaidCardQrSession(paidSession(), 'success_page', { db, send, approverTo: 'louis@neonrabbit.net', approveUrl: 'https://x.test/approve?token=t' })
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

  it('never emails the printer on payment', async () => {
    const { db, tables } = fakeDb()
    await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, approverTo: 'louis@neonrabbit.net', approveUrl: null })
    expect(send.mock.calls.map((c) => c[0].to)).toEqual(['louis@neonrabbit.net', 'louis@example.com'])
    expect(tables.rep_card_print_orders[0].printer_email_sent_at).toBeUndefined()
  })
})

describe('printer approval', () => {
  const SECRET = 'x'.repeat(40)
  let send: ReturnType<typeof vi.fn>
  beforeEach(() => { send = vi.fn(async () => ({ id: 'em_printer' })) })

  it('signed tokens verify, and tampered or expired ones do not', () => {
    const t = signCardQrApproval({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, SECRET)!
    expect(verifyCardQrApproval(t, SECRET)).toEqual({ ok: true, orderId: ORDER, approver: 'louis@neonrabbit.net' })
    expect(verifyCardQrApproval(t + 'x', SECRET)).toMatchObject({ ok: false, reason: 'bad_token' })
    expect(verifyCardQrApproval(t, 'y'.repeat(40))).toMatchObject({ ok: false, reason: 'bad_token' })
    expect(verifyCardQrApproval(t, SECRET, new Date(Date.now() + 8 * 86400e3))).toMatchObject({ ok: false, reason: 'expired' })
    expect(verifyCardQrApproval(t, SECRET, new Date(Date.now() + 6 * 86400e3)).ok).toBe(true)
    expect(signCardQrApproval({ orderId: ORDER, approver: 'a' }, undefined)).toBeNull()
    expect(verifyCardQrApproval(t, undefined)).toMatchObject({ ok: false, reason: 'not_configured' })
  })

  it('refuses unpaid orders', async () => {
    const { db } = fakeDb()
    expect((await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db, send, printerTo: 'printer@example.com' })).status).toBe('not_paid')
    expect(send).not.toHaveBeenCalled()
  })

  it('records the approval and sends to the printer exactly once', async () => {
    const { db, tables } = fakeDb()
    tables.rep_card_print_orders[0].status = 'paid'
    const first = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net', meta: { via: 'signed_link' } }, { db, send, printerTo: 'printer@example.com' })
    const second = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'someone@else.com' }, { db, send, printerTo: 'printer@example.com' })
    expect(first).toMatchObject({ status: 'approved', approvedBy: 'louis@neonrabbit.net', printer: 'sent', printerTo: 'printer@example.com' })
    expect(second).toMatchObject({ status: 'already_approved', approvedBy: 'louis@neonrabbit.net', printer: 'already_sent' })
    expect(send).toHaveBeenCalledTimes(1)
    const mail = send.mock.calls[0][0]
    expect(mail.to).toBe('printer@example.com')
    expect(mail.subject).toContain('SS-CARD-000123')
    expect(mail.attachments[0].filename).toBe('SS-CARD-000123-proof.pdf')
    const row = tables.rep_card_print_orders[0]
    expect(row).toMatchObject({ printer_approved_by: 'louis@neonrabbit.net', printer_email_id: 'em_printer' })
    expect(row.printer_approved_at).toBeTruthy()
    expect(row.printer_email_sent_at).toBeTruthy()
  })

  it('with no printer address: approves, sends nothing, and sends once later when it is set', async () => {
    const fake = fakeDb()
    fake.tables.rep_card_print_orders[0].status = 'paid'
    const a = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db: fake.db, send, printerTo: null })
    expect(a).toMatchObject({ status: 'approved', printer: 'not_configured' })
    expect(send).not.toHaveBeenCalled()
    const b = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db: fake.db, send, printerTo: 'printer@example.com' })
    const c = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db: fake.db, send, printerTo: 'printer@example.com' })
    expect(b).toMatchObject({ status: 'already_approved', printer: 'sent' })
    expect(c.status === 'already_approved' && c.printer).toBe('already_sent')
    expect(fake.tables.rep_card_print_orders[0].printer_email_status).toBe('sent')
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('a failed printer send can be retried and then sends once', async () => {
    const fake = fakeDb()
    fake.tables.rep_card_print_orders[0].status = 'paid'
    send.mockRejectedValueOnce(new Error('resend down'))
    const a = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db: fake.db, send, printerTo: 'printer@example.com' })
    expect(a).toMatchObject({ printer: 'failed' })
    expect(fake.tables.rep_card_print_orders[0].printer_email_status).toBe('failed')
    const b = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db: fake.db, send, printerTo: 'printer@example.com' })
    expect(b).toMatchObject({ printer: 'sent' })
    expect(send).toHaveBeenCalledTimes(2)
  })
})

describe('live flag (CARD_QR_STRIPE_LIVE)', () => {
  const smoke = { SPARKLE_ENVIRONMENT: 'smoke', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'smoke' } as unknown as NodeJS.ProcessEnv
  const live = {} as NodeJS.ProcessEnv

  it('Smoke stays test-only even with the flag', async () => {
    const { cardQrStripeRuntime } = await import('@/lib/workspace/card-qr/access')
    const { assertCardQrStripeTestKey } = await import('@/lib/workspace/card-qr/checkout')
    expect(cardQrStripeRuntime({ ...smoke, CARD_QR_STRIPE_LIVE: 'true' } as NodeJS.ProcessEnv)).toEqual({ environment: 'smoke', allowLive: false })
    expect(() => assertCardQrStripeTestKey('sk_live_x', { ...smoke, CARD_QR_STRIPE_LIVE: 'true' } as NodeJS.ProcessEnv)).toThrow()
  })

  it('Live allows live keys only with CARD_QR_STRIPE_LIVE=true', async () => {
    const { cardQrStripeRuntime } = await import('@/lib/workspace/card-qr/access')
    const { assertCardQrStripeTestKey } = await import('@/lib/workspace/card-qr/checkout')
    expect(cardQrStripeRuntime(live)).toEqual({ environment: 'live', allowLive: false })
    expect(() => assertCardQrStripeTestKey('sk_live_x', live)).toThrow()
    expect(assertCardQrStripeTestKey('sk_live_x', { CARD_QR_STRIPE_LIVE: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(true)
    expect(assertCardQrStripeTestKey('sk_test_x', { CARD_QR_STRIPE_LIVE: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(cardQrStripeRuntime({ CARD_QR_STRIPE_LIVE: 'yes' } as unknown as NodeJS.ProcessEnv).allowLive).toBe(false)
  })

  it('fulfillment accepts a live session only on Live with the flag', async () => {
    vi.stubEnv('SPARKLE_ENVIRONMENT', '')
    vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT', '')
    vi.stubEnv('CARD_QR_STRIPE_LIVE', 'true')
    try {
      const { db, tables } = fakeDb()
      tables.rep_card_print_orders[0].livemode = true
      const s = paidSession({ livemode: true }, { environment: 'live' })
      const send = vi.fn(async () => ({ id: 'e' }))
      const r = await fulfillPaidCardQrSession(s, 'webhook', { db, send, approverTo: 'louis@neonrabbit.net', approveUrl: null })
      expect(r.status).toBe('paid')
      expect(tables.card_order_ledger[0].livemode).toBe(true)
      expect(send.mock.calls[0][0].subject).toBe('APPROVAL NEEDED: SS-CARD-000123 for Amelia')
      vi.stubEnv('CARD_QR_STRIPE_LIVE', '')
      const again = fakeDb()
      again.tables.rep_card_print_orders[0].livemode = true
      expect((await fulfillPaidCardQrSession(s, 'webhook', { db: again.db, send })).status).toBe('refused')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('send claims, resend and daily check', () => {
  const ok = () => vi.fn(async () => ({ id: 'em' }))

  it('refuses a session whose livemode differs from the order', async () => {
    const { db } = fakeDb()
    vi.stubEnv('CARD_QR_STRIPE_LIVE', 'true')
    try {
      const r = await fulfillPaidCardQrSession(paidSession({ livemode: true }), 'webhook', { db, send: ok() })
      expect(r).toEqual({ status: 'refused', reason: 'order_livemode_mismatch' })
    } finally { vi.unstubAllEnvs() }
  })

  it('approver email: a confirmed failure is retryable, the resend sends once', async () => {
    const { db, tables } = fakeDb()
    const send = vi.fn(async (m: { to: string }) => { if (m.to === 'louis@neonrabbit.net') throw new CardQrSendError('422 bad', true); return { id: 'r' } })
    const r = await fulfillPaidCardQrSession(paidSession(), 'webhook', { db, send, approverTo: 'louis@neonrabbit.net', approveUrl: null })
    expect(r).toMatchObject({ status: 'paid', fulfillmentEmail: 'failed', repEmail: 'sent' })
    expect(tables.rep_card_print_orders[0]).toMatchObject({ approver_email_status: 'failed', fulfillment_email_error: '422 bad' })
    const good = ok()
    expect(await sendCardQrApproverEmail(ORDER, { db, send: good, approverTo: 'louis@neonrabbit.net', approveUrl: null })).toBe('sent')
    expect(await sendCardQrApproverEmail(ORDER, { db, send: good, approverTo: 'louis@neonrabbit.net', approveUrl: null })).toBe('skipped')
    expect(good).toHaveBeenCalledTimes(1)
    expect(good.mock.calls[0][0].subject).toContain('APPROVAL NEEDED')
  })

  it('unknown outcome keeps the claim; only a stale claim (>15 min) is retried', async () => {
    const { db, tables, clock } = fakeDb()
    tables.rep_card_print_orders[0].status = 'paid'
    const flaky = vi.fn(async () => { throw new CardQrSendError('timeout', false) })
    expect(await sendCardQrApproverEmail(ORDER, { db, send: flaky, approverTo: 'l@x.co', approveUrl: null })).toBe('unknown')
    expect(tables.rep_card_print_orders[0].approver_email_status).toBe('claimed')
    const good = ok()
    expect(await sendCardQrApproverEmail(ORDER, { db, send: good, approverTo: 'l@x.co', approveUrl: null })).toBe('skipped')
    clock.now += 16 * 60e3
    expect(await sendCardQrApproverEmail(ORDER, { db, send: good, approverTo: 'l@x.co', approveUrl: null })).toBe('sent')
    expect(good).toHaveBeenCalledTimes(1)
  })

  it('printer: unknown outcome is not released; stale claim can retry', async () => {
    const { db, tables, clock } = fakeDb()
    tables.rep_card_print_orders[0].status = 'paid'
    const flaky = vi.fn(async () => { throw new CardQrSendError('timeout', false) })
    const a = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db, send: flaky, printerTo: 'p@x.co' })
    expect(a).toMatchObject({ printer: 'unknown' })
    const good = ok()
    const b = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db, send: good, printerTo: 'p@x.co' })
    expect(b).toMatchObject({ printer: 'in_progress' })
    clock.now += 16 * 60e3
    const c = await approveCardQrOrderForPrinter({ orderId: ORDER, approver: 'louis@neonrabbit.net' }, { db, send: good, printerTo: 'p@x.co' })
    expect(c).toMatchObject({ printer: 'sent' })
    expect(good).toHaveBeenCalledTimes(1)
  })

  it('daily check retries unsent approval emails and alerts Louis about the rest', async () => {
    const { db, tables } = fakeDb()
    Object.assign(tables.rep_card_print_orders[0], { status: 'paid', paid_at: '2026-10-10T00:00:00.000Z', approver_email_attempts: 1, approver_email_status: 'failed' })
    const send = vi.fn(async (m: { subject: string }) => { if (m.subject.includes('APPROVAL NEEDED')) throw new CardQrSendError('down', true); return { id: 'a' } })
    const r = await runCardQrApproverEmailCheck({ db, send, approverTo: 'louis@neonrabbit.net', now: new Date('2026-10-11T00:00:00Z') })
    expect(r).toMatchObject({ checked: 1, stillUnsent: 1, alert: 'sent' })
    const alert = send.mock.calls.at(-1)![0] as { to: string; subject: string; text: string }
    expect(alert.to).toBe('louis@neonrabbit.net')
    expect(alert.subject).toMatch(/1 paid business card order missing/)
    expect(alert.text).toContain('SS-CARD-000123')

    const ok2 = vi.fn(async () => ({ id: 'b' }))
    const r2 = await runCardQrApproverEmailCheck({ db, send: ok2, approverTo: 'louis@neonrabbit.net', now: new Date('2026-10-11T00:00:00Z') })
    expect(r2).toMatchObject({ checked: 1, stillUnsent: 0, alert: 'none' })
    const r3 = await runCardQrApproverEmailCheck({ db, send: ok2, now: new Date('2026-10-11T00:00:00Z') })
    expect(r3).toMatchObject({ checked: 0, alert: 'none' })
  })
})
