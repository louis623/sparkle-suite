import { beforeEach, describe, expect, it, vi } from 'vitest'

const enqueueDue = vi.fn()
const enqueueWeeklyDue = vi.fn()
const processAutomation = vi.fn()
const enqueueSupportCompletion = vi.fn()

vi.mock('@/lib/services/workspace-message-automation', () => ({
  enqueueDueMonthlyReports: (...args: unknown[]) => enqueueDue(...args),
  enqueueDueWeeklyBirthdayReports: (...args: unknown[]) => enqueueWeeklyDue(...args),
  processWorkspaceMessageAutomation: (...args: unknown[]) => processAutomation(...args),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ marker: 'admin' }),
}))
vi.mock('@/lib/operator-support/completion-retry', () => ({
  enqueueMissingOperatorSupportCompletionNotices: (...args: unknown[]) =>
    enqueueSupportCompletion(...args),
}))

import { GET } from '@/app/api/internal/workspace-messages/process/route'

describe('workspace message automation route', () => {
  beforeEach(() => {
    enqueueDue.mockReset()
    enqueueWeeklyDue.mockReset()
    enqueueWeeklyDue.mockResolvedValue([])
    processAutomation.mockReset()
    enqueueSupportCompletion.mockReset()
    enqueueSupportCompletion.mockResolvedValue(0)
    delete process.env.CRON_SECRET
  })

  it('fails closed when cron auth is not configured', async () => {
    const response = await GET(new Request('http://localhost/api/internal/workspace-messages/process'))
    expect(response.status).toBe(503)
  })

  it('rejects the wrong bearer secret', async () => {
    process.env.CRON_SECRET = 'right-secret'
    const response = await GET(
      new Request('http://localhost/api/internal/workspace-messages/process', {
        headers: { authorization: 'Bearer wrong-secret' },
      }),
    )
    expect(response.status).toBe(401)
  })

  it('enqueues monthly work and processes the durable outbox', async () => {
    process.env.CRON_SECRET = 'right-secret'
    enqueueDue.mockResolvedValue([{ repId: 'rep-1' }])
    processAutomation.mockResolvedValue({ claimed: 2, completed: 2, failed: 0 })
    const response = await GET(
      new Request('http://localhost/api/internal/workspace-messages/process', {
        headers: { authorization: 'Bearer right-secret' },
      }),
    )
    expect(response.status).toBe(200)
    expect(enqueueDue).toHaveBeenCalledWith(
      expect.objectContaining({ supabase: { marker: 'admin' }, now: expect.any(Date) }),
    )
    expect(processAutomation).toHaveBeenCalledWith(
      expect.objectContaining({ supabase: { marker: 'admin' }, limit: 50 }),
    )
  })
})
