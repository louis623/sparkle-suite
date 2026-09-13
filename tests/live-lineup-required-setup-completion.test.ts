import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RequiredSetupSessionRow } from '@/lib/self-serve/required-setup'

const mocks = vi.hoisted(() => ({ from: vi.fn(), readiness: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: mocks.from }) }))
vi.mock('@/lib/live-lineup/setup-readiness', () => ({ readLineupSetupReadiness: mocks.readiness }))
import { completeRequiredSetupStep, saveRequiredSetupAnswer } from '@/lib/self-serve/required-setup'

const repId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const receipt = { protocol: 2, ready: true, reason: 'ready', checkedAt: '2026-09-09T12:00:00.000Z',
  lastReadyAt: '2026-09-09T12:00:00.000Z', generation: 0, revision: 2 }
function fixture(patch: Partial<RequiredSetupSessionRow> = {}, conflict = false) {
  const row: RequiredSetupSessionRow = { id: 'setup-test', rep_id: repId, status: 'required_setup', current_step: 'live_queue_setup',
    completed_steps: [], answers: { welcome_copy: { headline: 'Keep this' }, live_queue_setup: { liveQueueConnected: true } },
    generated_copy: {}, support_state: {}, dashboard_unlocked_at: null, created_at: null, updated_at: null, ...patch }
  const filters: [string, unknown][] = []
  const update = vi.fn((values: Record<string, unknown>) => {
    const query = { eq: vi.fn((key: string, value: unknown) => { filters.push([key,value]); return query }),
      is: vi.fn((key: string, value: unknown) => { filters.push([key,value]); return query }), select: vi.fn(() => query),
      single: vi.fn(async () => conflict ? { data: null, error: { code: 'PGRST116' } } : { data: { ...row, ...values }, error: null }) }
    return query
  })
  const eq = vi.fn()
  eq.mockReturnValue({ maybeSingle: async () => ({ data: row, error: null }) })
  mocks.from.mockImplementation((table: string) => {
    if (table !== 'self_serve_setup_sessions') throw Error('Unexpected table')
    return { select: () => ({ eq }), update }
  })
  return { row, update, eq, filters }
}

describe('central Live Lineup setup completion boundary', () => {
  beforeEach(() => { mocks.from.mockReset(); mocks.readiness.mockReset(); mocks.readiness.mockResolvedValue(receipt) })

  it.each(['not_initialized', 'schema_unavailable', 'stale', 'source_not_ready', 'publisher_revoked', 'lease_expired', 'state_changed', 'tenant_mismatch'])
    ('rejects a fresh completion when server evidence is %s despite caller claims', async reason => {
      const f = fixture()
      mocks.readiness.mockResolvedValue({ ...receipt, ready: false, reason })
      await expect(completeRequiredSetupStep(repId, 'live_queue_setup', {
        extensionInstalled: true, syncCodeEntered: true, partyOrdersOpen: true, partyFilterSet: true, liveQueueConnected: true,
        serverReceipt: receipt,
      })).rejects.toThrow('Live Lineup connection is not ready')
      expect(mocks.readiness).toHaveBeenCalledWith(expect.objectContaining({ from: mocks.from }), repId)
      expect(f.update).not.toHaveBeenCalled()
    })

  it('stores only freshly generated sanitized server evidence and preserves other steps', async () => {
    const f = fixture()
    mocks.readiness.mockResolvedValue({ ...receipt, token: 'private-key', names: ['Private Customer'] })
    const state = await completeRequiredSetupStep(repId, 'live_queue_setup', { token: 'private-key', syncCode: 'KEEP-IDENTITY' })
    expect(state.completedSteps).toEqual(['live_queue_setup'])
    expect(state.answers).toEqual({ welcome_copy: { headline: 'Keep this' }, live_queue_setup: { serverReceipt: {
      protocol: 2, ready: true, checkedAt: receipt.checkedAt, lastReadyAt: receipt.lastReadyAt, generation: 0, revision: 2,
    } } })
    expect(JSON.stringify(f.update.mock.calls)).not.toContain('private-key')
    expect(JSON.stringify(f.update.mock.calls)).not.toContain('Private Customer')
    expect(f.eq).toHaveBeenCalledWith('rep_id', repId)
    expect(f.filters).toEqual([['rep_id', repId], ['status', 'required_setup'], ['updated_at', null]])
    expect(mocks.readiness.mock.invocationCallOrder[0]).toBeLessThan(f.update.mock.invocationCallOrder[0])
  })

  it.each([{ completed_steps: ['live_queue_setup'] }, { status: 'dashboard_unlocked', dashboard_unlocked_at: receipt.checkedAt }])
    ('preserves historical completion/unlocked access without readiness or writes %#', async patch => {
      const f = fixture(patch)
      mocks.readiness.mockResolvedValue({ ...receipt, ready: false, reason: 'not_initialized' })
      const state = await completeRequiredSetupStep(repId, 'live_queue_setup', { token: 'private-key' })
      expect(state.status).toBe(f.row.status)
      expect(state.answers).toEqual(f.row.answers)
      expect(mocks.readiness).not.toHaveBeenCalled()
      expect(f.update).not.toHaveBeenCalled()
    })

  it('does not save arbitrary Live Queue answers, generated text or support payloads', async () => {
    const f = fixture()
    const state = await saveRequiredSetupAnswer(repId, 'live_queue_setup', { token: 'private-key', serverReceipt: receipt }, {
      generatedCopyPatch: { token: 'private-key' }, supportStatePatch: { token: 'private-key' },
    })
    expect(state.answers).toEqual(f.row.answers)
    expect(f.update).not.toHaveBeenCalled()
    expect(mocks.readiness).not.toHaveBeenCalled()
  })

  it.each(['checkout_required', 'payment_pending'])('cannot use readiness to bypass %s', async status => {
    const f = fixture({ status })
    await expect(completeRequiredSetupStep(repId, 'live_queue_setup')).rejects.toThrow('active required setup session')
    expect(mocks.readiness).not.toHaveBeenCalled()
    expect(f.update).not.toHaveBeenCalled()
  })

  it('rejects a returned setup row owned by another tenant before reading or writing lineup', async () => {
    const f = fixture({ rep_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
    await expect(completeRequiredSetupStep(repId, 'live_queue_setup')).rejects.toThrow('tenant mismatch')
    expect(mocks.readiness).not.toHaveBeenCalled()
    expect(f.update).not.toHaveBeenCalled()
  })

  it('fails closed if another setup write or unlock wins while readiness is checked', async () => {
    const f = fixture({ updated_at: receipt.checkedAt }, true)
    await expect(completeRequiredSetupStep(repId, 'live_queue_setup')).rejects.toThrow('Required setup changed')
    expect(f.filters).toContainEqual(['status', 'required_setup'])
    expect(f.filters).toContainEqual(['updated_at', receipt.checkedAt])
  })
})
