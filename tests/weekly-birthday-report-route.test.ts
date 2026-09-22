import { beforeEach, describe, expect, it, vi } from 'vitest'

const enqueueDue = vi.fn()
const processAutomation = vi.fn()

vi.mock('@/lib/services/workspace-message-automation', () => ({
  enqueueDueWeeklyBirthdayReports: (...args: unknown[]) => enqueueDue(...args),
  processWorkspaceMessageAutomation: (...args: unknown[]) => processAutomation(...args),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ marker: 'admin' }),
}))

import { GET } from '@/app/api/internal/workspace-birthday-reports/process/route'

describe('weekly birthday report route', () => {
  beforeEach(() => {
    enqueueDue.mockReset()
    processAutomation.mockReset()
    delete process.env.CRON_SECRET
  })

  it('fails closed without cron auth', async () => {
    expect((await GET(new Request('http://localhost'))).status).toBe(503)
  })

  it('enqueues and drains the durable worker with the valid secret', async () => {
    process.env.CRON_SECRET = 'right-secret'
    enqueueDue.mockResolvedValue([{ repId: 'rep-1' }])
    processAutomation.mockResolvedValue({ claimed: 1, completed: 1, failed: 0 })
    const response = await GET(new Request('http://localhost', {
      headers: { authorization: 'Bearer right-secret' },
    }))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ enqueued: 1, completed: 1 })
  })
})
