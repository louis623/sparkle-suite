import { beforeEach, describe, expect, it, vi } from 'vitest'

const claimEvents = vi.fn()
const completeEvent = vi.fn()
const failEvent = vi.fn()
const enqueueEvent = vi.fn()
const publishMessage = vi.fn()
const collectMonthly = vi.fn()
const saveSnapshot = vi.fn()
const attachPublication = vi.fn()
const getSupportSession = vi.fn()
const publishSupportEnd = vi.fn()
const recordSupportCompletion = vi.fn()

vi.mock('@/lib/services/workspace-message-outbox', () => ({
  claimWorkspaceMessageOutboxEvents: (...args: unknown[]) => claimEvents(...args),
  completeWorkspaceMessageOutboxEvent: (...args: unknown[]) => completeEvent(...args),
  failWorkspaceMessageOutboxEvent: (...args: unknown[]) => failEvent(...args),
  enqueueWorkspaceMessageOutboxEvent: (...args: unknown[]) => enqueueEvent(...args),
}))
vi.mock('@/lib/services/workspace-messages', () => ({
  publishWorkspaceMessage: (...args: unknown[]) => publishMessage(...args),
}))
vi.mock('@/lib/operator-support/messages', () => ({
  publishOperatorSupportEndNotice: (...args: unknown[]) => publishSupportEnd(...args),
}))
vi.mock('@/lib/operator-support/session-service', () => ({
  getOperatorSupportSession: (...args: unknown[]) => getSupportSession(...args),
  recordOperatorSupportCompletionNotice: (...args: unknown[]) =>
    recordSupportCompletion(...args),
}))
vi.mock('@/lib/services/workspace-monthly-reports', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/services/workspace-monthly-reports')>()
  return {
    ...original,
    collectMonthlyReportData: (...args: unknown[]) => collectMonthly(...args),
    saveMonthlyReportSnapshot: (...args: unknown[]) => saveSnapshot(...args),
    attachMonthlyReportPublication: (...args: unknown[]) => attachPublication(...args),
  }
})

import {
  getTrustedYouTubeUrl,
  processWorkspaceMessageAutomation,
} from '@/lib/services/workspace-message-automation'

describe('workspace message automation', () => {
  beforeEach(() => {
    claimEvents.mockReset()
    completeEvent.mockReset()
    failEvent.mockReset()
    enqueueEvent.mockReset()
    publishMessage.mockReset()
    collectMonthly.mockReset()
    saveSnapshot.mockReset()
    attachPublication.mockReset()
    getSupportSession.mockReset()
    publishSupportEnd.mockReset()
    recordSupportCompletion.mockReset()
    completeEvent.mockResolvedValue({})
    failEvent.mockResolvedValue({})
  })

  it('retries an ended support-session completion notice idempotently', async () => {
    claimEvents.mockResolvedValue([
      {
        id: 'event-support-end',
        eventType: 'operator_support_completion_notice',
        idempotencyKey: 'support-access-end:session-1',
        payload: { sessionId: 'session-1', changedAnything: true },
        attemptCount: 1,
      },
    ])
    getSupportSession.mockResolvedValue({
      id: 'session-1',
      status: 'ended',
      targetRepId: 'rep-1',
    })
    publishSupportEnd.mockResolvedValue({ id: 'publication-end' })
    recordSupportCompletion.mockResolvedValue({})

    const result = await processWorkspaceMessageAutomation({
      supabase: { marker: 'admin' } as never,
      workerId: 'worker-1',
    })

    expect(result).toMatchObject({ claimed: 1, completed: 1, failed: 0 })
    expect(publishSupportEnd).toHaveBeenCalledWith(
      { marker: 'admin' },
      expect.objectContaining({ id: 'session-1', status: 'ended' }),
      true,
    )
    expect(recordSupportCompletion).toHaveBeenCalledWith(
      { marker: 'admin' },
      { sessionId: 'session-1', endPublicationId: 'publication-end' },
    )
  })

  it('publishes one privacy-minimized customer signup message', async () => {
    claimEvents.mockResolvedValue([
      {
        id: 'event-1',
        eventType: 'customer_signup_created',
        idempotencyKey: 'customer-signup:aud-1',
        payload: {
          repId: 'rep-1',
          audienceId: 'aud-1',
          customerFirstName: 'Jamie',
          createdAt: '2026-08-17T20:00:00.000Z',
        },
        attemptCount: 0,
      },
    ])
    publishMessage.mockResolvedValue({ id: 'publication-1' })

    const result = await processWorkspaceMessageAutomation({
      supabase: { marker: 'admin' } as never,
      workerId: 'worker-1',
      now: new Date('2026-08-17T20:01:00.000Z'),
    })

    expect(result).toMatchObject({ claimed: 1, completed: 1, failed: 0 })
    expect(publishMessage).toHaveBeenCalledWith(
      { marker: 'admin' },
      expect.objectContaining({
        senderKey: 'customer_signup_notifier',
        category: 'customer_activity',
        audience: { kind: 'selected', repIds: ['rep-1'] },
        idempotencyKey: 'customer-signup:aud-1',
        actionUrl: '/nic-nac?section=customer-list&customer=aud-1',
      }),
    )
    const publishedInput = publishMessage.mock.calls[0][1]
    expect(JSON.stringify(publishedInput)).not.toContain('@')
    expect(JSON.stringify(publishedInput)).not.toContain('555')
    expect(completeEvent).toHaveBeenCalledWith(
      { marker: 'admin' },
      { eventId: 'event-1', workerId: 'worker-1' },
    )
  })

  it('fails malformed events into the retry lane instead of dropping them', async () => {
    claimEvents.mockResolvedValue([
      {
        id: 'event-bad',
        eventType: 'customer_signup_created',
        idempotencyKey: 'customer-signup:bad',
        payload: { repId: 'rep-1' },
        attemptCount: 1,
      },
    ])

    const result = await processWorkspaceMessageAutomation({
      supabase: { marker: 'admin' } as never,
      workerId: 'worker-1',
      now: new Date('2026-08-17T20:00:00.000Z'),
    })

    expect(result.failed).toBe(1)
    expect(completeEvent).not.toHaveBeenCalled()
    expect(failEvent).toHaveBeenCalledWith(
      { marker: 'admin' },
      expect.objectContaining({
        eventId: 'event-bad',
        workerId: 'worker-1',
        retryAt: '2026-08-17T20:04:00.000Z',
      }),
    )
  })

  it('publishes an immutable monthly snapshot and links its publication', async () => {
    claimEvents.mockResolvedValue([
      {
        id: 'event-monthly',
        eventType: 'monthly_report_due',
        idempotencyKey: 'monthly-report:rep-1:2026-08',
        payload: {
          repId: 'rep-1',
          timeZone: 'America/New_York',
          reportMonth: '2026-08-01',
          runAt: '2026-08-01T13:00:00.000Z',
        },
        attemptCount: 0,
      },
    ])
    collectMonthly.mockResolvedValue({
      period: {
        reportMonth: '2026-08-01',
        timeZone: 'America/New_York',
        previousMonthLabel: 'July 2026',
        currentMonthLabel: 'August 2026',
        periodStart: '2026-07-01T04:00:00.000Z',
        periodEnd: '2026-08-01T04:00:00.000Z',
        birthdayMonth: 8,
      },
      metrics: [{ key: 'customers_added', label: 'Customers added', value: 3, status: 'tracked' }],
      birthdays: [{ audienceId: 'aud-1', name: 'Jamie', month: 8, day: 12 }],
    })
    saveSnapshot.mockResolvedValue({ id: 'snapshot-1' })
    publishMessage.mockResolvedValue({ id: 'publication-1' })

    const result = await processWorkspaceMessageAutomation({
      supabase: { marker: 'admin' } as never,
      workerId: 'worker-1',
    })

    expect(result.completed).toBe(1)
    expect(publishMessage).toHaveBeenCalledWith(
      { marker: 'admin' },
      expect.objectContaining({
        senderKey: 'monthly_reporter',
        idempotencyKey: 'monthly-report:rep-1:2026-08',
        sourceId: 'snapshot-1',
      }),
    )
    expect(attachPublication).toHaveBeenCalledWith({
      supabase: { marker: 'admin' },
      snapshotId: 'snapshot-1',
      publicationId: 'publication-1',
    })
  })

  it('publishes a queued resource announcement and links the revision', async () => {
    claimEvents.mockResolvedValue([
      {
        id: 'event-resource',
        eventType: 'workspace_resource_published',
        idempotencyKey: 'resource-published:resource-1:2',
        payload: { resourceId: 'resource-1', revisionId: 'revision-2', version: 2 },
        attemptCount: 0,
      },
    ])
    publishMessage.mockResolvedValue({ id: 'publication-resource' })
    const revisionUpdate = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from(table: string) {
        if (table === 'workspace_resources') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'resource-1',
                    resource_key: 'trade-guide',
                    resource_type: 'blog',
                    title: 'Trade smarter',
                    summary: 'A practical Dance Floor guide.',
                    video_provider: null,
                    video_url: null,
                    status: 'published',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'workspace_resource_revisions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'revision-2',
                      version: 2,
                      change_summary: 'Added fulfillment tips.',
                      announcement_status: 'pending',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({ eq: revisionUpdate }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      },
    }

    const result = await processWorkspaceMessageAutomation({
      supabase: supabase as never,
      workerId: 'worker-1',
    })

    expect(result).toMatchObject({ claimed: 1, completed: 1, failed: 0 })
    expect(publishMessage).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        senderKey: 'resource_publisher',
        category: 'blog',
        audience: { kind: 'all_active' },
        idempotencyKey: 'resource-published:resource-1:2',
        actionLabel: 'Open in Resources & Help',
        actionUrl: '/nic-nac?section=resources&resource=trade-guide',
        secondaryActionLabel: null,
        secondaryActionUrl: null,
      }),
    )
    expect(revisionUpdate).toHaveBeenCalledWith('id', 'revision-2')
  })

  it('gives a YouTube video both a direct workspace destination and a safe YouTube action', async () => {
    claimEvents.mockResolvedValue([
      {
        id: 'event-video',
        eventType: 'workspace_resource_published',
        idempotencyKey: 'resource-published:video-1:1',
        payload: { resourceId: 'video-1', revisionId: 'revision-video', version: 1 },
        attemptCount: 0,
      },
    ])
    publishMessage.mockResolvedValue({ id: 'publication-video' })
    const revisionUpdate = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from(table: string) {
        if (table === 'workspace_resources') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'video-1',
                    resource_key: 'show-prep',
                    resource_type: 'video',
                    title: 'Prepare your next show',
                    summary: 'A practical preparation walkthrough.',
                    video_provider: 'youtube',
                    video_url: 'https://www.youtube.com/watch?v=abc123',
                    status: 'published',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'workspace_resource_revisions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'revision-video',
                      version: 1,
                      change_summary: 'New show preparation walkthrough.',
                      announcement_status: 'pending',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({ eq: revisionUpdate }),
          }
        }
        throw new Error(`Unexpected table ${table}`)
      },
    }

    const result = await processWorkspaceMessageAutomation({
      supabase: supabase as never,
      workerId: 'worker-1',
    })

    expect(result).toMatchObject({ claimed: 1, completed: 1, failed: 0 })
    expect(publishMessage).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        actionLabel: 'Open in Resources & Help',
        actionUrl: '/nic-nac?section=resources&resource=show-prep',
        secondaryActionLabel: 'Watch on YouTube',
        secondaryActionUrl: 'https://www.youtube.com/watch?v=abc123',
      }),
    )
  })

  it('does not produce a direct-video action for a non-YouTube URL', () => {
    expect(getTrustedYouTubeUrl('https://example.com/watch?v=abc123')).toBeNull()
    expect(getTrustedYouTubeUrl('http://www.youtube.com/watch?v=abc123')).toBeNull()
    expect(getTrustedYouTubeUrl('https://www.youtube.com/watch?v=abc123')).toBe(
      'https://www.youtube.com/watch?v=abc123',
    )
  })
})
