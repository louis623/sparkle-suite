import { beforeEach, describe, expect, it, vi } from 'vitest'

const getStatus = vi.fn()
vi.mock('@/lib/services/trade-requests', () => ({
  getTradeRequestReceiptStatus: (...args: unknown[]) => getStatus(...args),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ admin: true }),
}))

import { GET } from '@/app/api/amethyst/trade-requests/status/route'

describe('private trade receipt API', () => {
  beforeEach(() => getStatus.mockReset())

  it('does not query malformed tokens', async () => {
    const response = await GET(new Request('https://example.test/api/amethyst/trade-requests/status?token=123'))
    expect(response.status).toBe(404)
    expect(getStatus).not.toHaveBeenCalled()
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })

  it('returns only status and customer-safe explanation', async () => {
    getStatus.mockResolvedValueOnce({ status: 'denied', denialExplanation: 'The item is unavailable.', updatedAt: '2026-09-23T12:00:00Z' })
    const response = await GET(new Request(`https://example.test/api/amethyst/trade-requests/status?token=${'a'.repeat(64)}`))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'denied', denialExplanation: 'The item is unavailable.', updatedAt: '2026-09-23T12:00:00Z' })
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
  })
})
