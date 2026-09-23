import { describe, expect, it, vi } from 'vitest'
import { normalizeTradeFamily, screenTradeOffer } from '@/lib/services/trade-request-matcher'
import { getTradeRequestReceiptStatus, approveTrade, rejectTrade } from '@/lib/services/trade-requests'

describe('deterministic trade family and type rule', () => {
  it('matches Birthday across months and years', () => {
    expect(screenTradeOffer('July Birthday 2026', 'ring', 'December Birthday 2025', 'RG').status).toBe('likely_match')
  })

  it('keeps OG, named collections, and jewelry types distinct', () => {
    expect(screenTradeOffer('Birthday', 'RG', 'OG', 'RG').status).toBe('mismatch')
    expect(screenTradeOffer('Birthday', 'RG', 'Birthday', 'NK').status).toBe('mismatch')
    expect(screenTradeOffer('Woodland Wishes', 'BR', ' woodland   wishes ', 'BR').status).toBe('likely_match')
    expect(screenTradeOffer("Firefly's Glow", 'BR', " firefly's   glow ", 'BR').status).toBe('likely_match')
    expect(screenTradeOffer('Woodland Wishes', 'BR', 'Garden Party', 'BR').status).toBe('mismatch')
    expect(normalizeTradeFamily('not sure')).toBeNull()
  })
})

describe('server decision boundary', () => {
  it('rejects approval without rep verification before the RPC', async () => {
    const rpc = vi.fn()
    await expect(approveTrade({ rpc } as never, 'rep-1', 'request-1'))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects denial without a safe reason before the RPC', async () => {
    const rpc = vi.fn()
    await expect(rejectTrade({ rpc } as never, 'rep-1', 'request-1', 'other'))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('private status lookup', () => {
  it('rejects malformed tokens without querying and returns no personal fields', async () => {
    const from = vi.fn()
    expect(await getTradeRequestReceiptStatus({ from } as never, 'request-uuid')).toBeNull()
    expect(from).not.toHaveBeenCalled()

    const maybeSingle = vi.fn().mockResolvedValue({ data: {
      status: 'denied', rejection_reason: 'other', denial_explanation: 'That dancer is unavailable.',
      updated_at: '2026-09-23T12:00:00Z', customer_name: 'Private customer', rep_notes: 'Private note',
    }, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    from.mockReturnValue({ select })
    const result = await getTradeRequestReceiptStatus({ from } as never, 'a'.repeat(64))
    expect(result).toEqual({ status: 'denied', denialExplanation: 'That dancer is unavailable.', updatedAt: '2026-09-23T12:00:00Z' })
    expect(JSON.stringify(result)).not.toContain('Private')
    expect(select).toHaveBeenCalledWith('status, rejection_reason, denial_explanation, updated_at')
  })
})
