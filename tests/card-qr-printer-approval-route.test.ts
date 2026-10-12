import { describe, expect, it, vi } from 'vitest'

const order = { printer_email_sent_at: '2026-10-12T14:00:00Z', printer_approved_by: 'louis@neonrabbit.net' }
const facts = { orderNumber: 'SS-CARD-000123', repName: 'Rep', address: { name: 'Jane Rep', street1: '1 Secret Ln', street2: '', city: 'Austin', state: 'TX', zip: '78701' }, quantity: 500 }
const approve = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }))
vi.mock('@/lib/workspace/card-qr/printer-approval', () => ({
  verifyCardQrApproval: () => ({ ok: true, orderId: 'o1', approver: 'louis@neonrabbit.net' }),
  loadCardQrOrderFacts: async () => ({ order, facts }),
  approveCardQrOrderForPrinter: (...a: unknown[]) => approve(...a),
}))

import { GET, POST } from '@/app/api/card-qr/printer-approval/route'

describe('approve link after the printer send', () => {
  it('GET shows only the sent date, no rep details', async () => {
    const res = await GET(new Request('http://x/api/card-qr/printer-approval?token=t'))
    const html = await res.text()
    expect(res.status).toBe(410)
    expect(html).toContain('Already sent to the printer on Oct 12, 2026')
    expect(html).not.toContain('Secret Ln')
    expect(html).not.toContain('Jane Rep')
  })

  it('POST does nothing and shows only the sent date', async () => {
    const body = new FormData(); body.set('token', 't')
    const res = await POST(new Request('http://x/api/card-qr/printer-approval', { method: 'POST', body }))
    expect(res.status).toBe(410)
    expect(await res.text()).not.toContain('Secret Ln')
    expect(approve).not.toHaveBeenCalled()
  })
})
