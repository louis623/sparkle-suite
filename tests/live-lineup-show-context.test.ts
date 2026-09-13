import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), support: vi.fn(), admin: vi.fn(), snapshot: vi.fn() }))
vi.mock('@/lib/nic-nac/auth', () => ({ getPaidNicNacContext: mocks.auth }))
vi.mock('@/lib/operator-support/request-context', () => ({ getOperatorSupportRequestContext: mocks.support }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }))
vi.mock('@/lib/live-lineup/service', async original => ({ ...await original<typeof import('@/lib/live-lineup/service')>(), getEffectiveLiveQueueSnapshot: mocks.snapshot }))
import { loadOwnedShowLineup } from '@/lib/live-lineup/show-context'
import { buildNicNacShowSessionContext, type NicNacShowSession } from '@/lib/nic-nac/show-sessions'

const snapshot = { syncCode: '', queue: ['Second first', 'First second'], queueLength: 2,
  currentCustomer: 'Second first', onDeckCustomer: 'First second', revision: 8,
  lastUpdated: '2026-09-09T10:00:00.000Z', ageSeconds: 2, staleAfterSeconds: 45, isFresh: true }
const activeSession: NicNacShowSession = { id: 'existing-show', repId: 'rep-one', calendarEventId: 'existing-event',
  liveQueueSyncCode: 'LEGACY-CODE', status: 'active', startedAt: '2026-09-09T09:00:00.000Z', endedAt: null,
  summary: null, metadata: {}, createdAt: '2026-09-09T09:00:00.000Z', updatedAt: '2026-09-09T09:00:00.000Z' }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ repId: 'rep-one' })
  mocks.support.mockReturnValue(null)
  mocks.admin.mockReturnValue({ safeFakeClient: true })
  mocks.snapshot.mockResolvedValue(snapshot)
})
describe('Nic-Nac effective lineup ownership', () => {
  it('reads the same effective order as public sites without reanchoring the show', async () => {
    const effectiveLineup = await loadOwnedShowLineup('rep-one')
    const result = buildNicNacShowSessionContext({ repId: 'rep-one', activeSession, recentEvents: [], memoryNotes: [], effectiveLineup })
    expect(mocks.snapshot).toHaveBeenCalledWith({ safeFakeClient: true }, 'rep-one')
    expect(result.liveQueueSnapshot).toEqual(snapshot)
    expect(result.activeSession).toEqual(activeSession)
    expect(result.activeSession?.liveQueueSyncCode).toBe('LEGACY-CODE')
  })
  it('rejects a tool-context tenant mismatch before any private database read', async () => {
    await expect(loadOwnedShowLineup('victim')).rejects.toMatchObject({ code: 'tenant_mismatch', status: 403 })
    expect(mocks.admin).not.toHaveBeenCalled()
    expect(mocks.snapshot).not.toHaveBeenCalled()
  })
  it('never escalates an operator support client into unrestricted private lineup access', async () => {
    mocks.support.mockReturnValue({ targetRepId: 'rep-one' })
    await expect(loadOwnedShowLineup('rep-one')).rejects.toMatchObject({ code: 'support_scope_not_enabled' })
    expect(mocks.admin).not.toHaveBeenCalled()
  })
  it('fails closed on a mismatched projection instead of falling back to stale legacy names', () => {
    const result = buildNicNacShowSessionContext({ repId: 'rep-one', activeSession, recentEvents: [], memoryNotes: [],
      liveQueueSnapshot: { ...snapshot, syncCode: 'LEGACY-CODE' }, effectiveLineup: { repId: 'other-rep', snapshot } })
    expect(result.liveQueueSnapshot).toBeNull()
  })
  it('does not invent a show or show a different tenant session', () => {
    for (const session of [null, { ...activeSession, repId: 'other-rep' }]) {
      const result = buildNicNacShowSessionContext({ repId: 'rep-one', activeSession: session, recentEvents: [], memoryNotes: [],
        effectiveLineup: { repId: 'rep-one', snapshot } })
      expect(result.activeSession).toBeNull()
      expect(result.liveQueueSnapshot).toBeNull()
    }
  })
  it('propagates unavailable v2 truth instead of pretending legacy state is current', async () => {
    mocks.snapshot.mockRejectedValue(new Error('database unavailable'))
    await expect(loadOwnedShowLineup('rep-one')).rejects.toThrow('database unavailable')
  })
})
