import { beforeEach, describe, expect, it, vi } from 'vitest'

const check = vi.fn(async () => ({ checked: 0, retried: [], stillUnsent: 0, alert: 'none' }))
const resend = vi.fn(async () => 'sent')
const access = vi.fn(async () => { throw new Error('no session') })
vi.mock('@/lib/workspace/card-qr/approver-email-check', () => ({ runCardQrApproverEmailCheck: () => check() }))
vi.mock('@/lib/workspace/card-qr/printer-approval', () => ({ sendCardQrApproverEmail: (id: string) => resend(id) }))
vi.mock('@/lib/supabase/operator-auth', () => ({ getControlCenterAccess: () => access() }))

import { GET, POST } from '@/app/api/internal/card-qr/approver-emails/route'

const ID = '11111111-1111-1111-1111-111111111111'
const req = (method: string, auth?: string, body?: unknown) =>
  new Request('http://x/api/internal/card-qr/approver-emails', { method, headers: auth ? { authorization: auth } : {}, body: body ? JSON.stringify(body) : undefined })

describe('approver email admin route', () => {
  beforeEach(() => { vi.stubEnv('CRON_SECRET', 's3cret'); check.mockClear(); resend.mockClear() })

  it('cron GET needs the secret', async () => {
    expect((await GET(req('GET'))).status).toBe(401)
    expect((await GET(req('GET', 'Bearer s3cret'))).status).toBe(200)
    expect(check).toHaveBeenCalledTimes(1)
  })

  it('POST resend needs Control Center owner or the secret, and a uuid', async () => {
    expect((await POST(req('POST', undefined, { orderId: ID }))).status).toBe(401)
    expect(resend).not.toHaveBeenCalled()
    expect((await POST(req('POST', 'Bearer s3cret', { orderId: 'nope' }))).status).toBe(400)
    const ok = await POST(req('POST', 'Bearer s3cret', { orderId: ID }))
    expect(await ok.json()).toEqual({ ok: true, result: 'sent' })
    access.mockResolvedValueOnce({ scope: 'owner' } as never)
    expect((await POST(req('POST', undefined, { orderId: ID }))).status).toBe(200)
  })
})
