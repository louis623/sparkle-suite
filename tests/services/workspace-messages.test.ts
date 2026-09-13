import { describe, expect, it, vi } from 'vitest'
import { resolveWorkspaceMessageAudience } from '@/lib/services/workspace-message-audience'
import {
  listRepWorkspaceMessages,
  publishWorkspaceMessage,
  updateRepWorkspaceMessageDelivery,
} from '@/lib/services/workspace-messages'

function makeQuery(result: { data: unknown; error: unknown; count?: number }) {
  const query: Record<string, unknown> = {}
  for (const method of [
    'select',
    'eq',
    'in',
    'is',
    'not',
    'order',
    'range',
    'limit',
    'insert',
    'upsert',
    'update',
  ]) {
    query[method] = vi.fn(() => query)
  }
  query.single = vi.fn(async () => result)
  query.maybeSingle = vi.fn(async () => result)
  query.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return query
}

const senderRow = {
  id: 'sender-owner',
  sender_key: 'owner',
  display_name: 'Sparkle Suite',
  sender_type: 'owner',
  capabilities: {
    categories: ['announcement', 'business_update'],
    audiences: ['all_active', 'selected'],
  },
  is_active: true,
}

const basePublicationRow = {
  id: 'publication-1',
  sender_id: 'sender-owner',
  sender_key: 'owner',
  sender_display_name: 'Sparkle Suite',
  category: 'announcement',
  priority: 'normal',
  title: 'Welcome update',
  summary: 'A short update.',
  body: [{ type: 'paragraph', text: 'Here is the news.' }],
  action_label: null,
  action_url: null,
  secondary_action_label: null,
  secondary_action_url: null,
  status: 'publishing',
  audience_rule: { kind: 'selected', repIds: ['rep-1'] },
  audience_snapshot: [
    { repId: 'rep-1', displayName: 'Amy', businessName: 'Amy Sparkles' },
  ],
  audience_count: 1,
  source_type: null,
  source_id: null,
  idempotency_key: null,
  scheduled_at: null,
  published_at: null,
  created_at: '2026-08-18T00:00:00.000Z',
  updated_at: '2026-08-18T00:00:00.000Z',
}

describe('workspace message publishing service', () => {
  it('freezes the exact audience, creates one delivery per rep, and audits publish', async () => {
    const senderQuery = makeQuery({ data: senderRow, error: null })
    const repsQuery = makeQuery({
      data: [
        { id: 'rep-1', display_name: 'Amy', business_name: 'Amy Sparkles' },
        { id: 'rep-2', display_name: 'Bea', business_name: 'Bea Gems' },
      ],
      error: null,
    })
    const publicationQuery = makeQuery({
      data: {
        ...basePublicationRow,
        audience_rule: { kind: 'all_active' },
        audience_snapshot: [
          { repId: 'rep-1', displayName: 'Amy', businessName: 'Amy Sparkles' },
          { repId: 'rep-2', displayName: 'Bea', businessName: 'Bea Gems' },
        ],
        audience_count: 2,
      },
      error: null,
    })
    const deliveriesQuery = makeQuery({ data: null, error: null })
    const publishedQuery = makeQuery({
      data: {
        ...basePublicationRow,
        status: 'published',
        audience_rule: { kind: 'all_active' },
        audience_count: 2,
        published_at: '2026-08-18T00:01:00.000Z',
      },
      error: null,
    })
    const auditQuery = makeQuery({ data: null, error: null })
    const queues: Record<string, Array<ReturnType<typeof makeQuery>>> = {
      workspace_message_senders: [senderQuery],
      reps: [repsQuery],
      workspace_message_publications: [publicationQuery, publishedQuery],
      workspace_message_deliveries: [deliveriesQuery],
      workspace_message_audit_events: [auditQuery],
    }
    const from = vi.fn((table: string) => queues[table].shift())

    const result = await publishWorkspaceMessage(
      { from } as never,
      {
        senderKey: 'owner',
        title: 'Welcome update',
        summary: 'A short update.',
        body: 'Here is the news.',
        category: 'announcement',
        audience: { kind: 'all_active' },
        expectedRecipientCount: 2,
        expectedRecipientIds: ['rep-2', 'rep-1'],
      },
    )

    expect(deliveriesQuery.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({ publication_id: 'publication-1', rep_id: 'rep-1' }),
        expect.objectContaining({ publication_id: 'publication-1', rep_id: 'rep-2' }),
      ],
      { onConflict: 'publication_id,rep_id', ignoreDuplicates: true },
    )
    expect(auditQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        publication_id: 'publication-1',
        event_type: 'publication_published',
        details: expect.objectContaining({ recipientCount: 2 }),
      }),
    )
    expect(result).toMatchObject({
      id: 'publication-1',
      status: 'published',
      deliveryCount: 2,
    })
  })

  it('rejects same-count audience membership swaps before any publication write', async () => {
    const senderQuery = makeQuery({ data: senderRow, error: null })
    const repsQuery = makeQuery({
      data: [
        { id: 'rep-1', display_name: 'Amy', business_name: 'Amy Sparkles' },
        { id: 'rep-3', display_name: 'Cara', business_name: 'Cara Gems' },
      ],
      error: null,
    })
    const from = vi.fn((table: string) => {
      if (table === 'workspace_message_senders') return senderQuery
      if (table === 'reps') return repsQuery
      throw new Error(`unexpected write to ${table}`)
    })

    await expect(
      publishWorkspaceMessage(
        { from } as never,
        {
          senderKey: 'owner',
          title: 'Welcome update',
          body: 'Here is the news.',
          category: 'announcement',
          audience: { kind: 'all_active' },
          expectedRecipientCount: 2,
          expectedRecipientIds: ['rep-1', 'rep-2'],
        },
      ),
    ).rejects.toMatchObject({ code: 'WORKSPACE_MESSAGE_AUDIENCE_CHANGED' })
    expect(from).not.toHaveBeenCalledWith('workspace_message_deliveries')
    expect(from).not.toHaveBeenCalledWith('workspace_message_audit_events')
  })

  it('returns an already-published idempotent result without creating deliveries', async () => {
    const senderQuery = makeQuery({ data: senderRow, error: null })
    const existingQuery = makeQuery({
      data: {
        ...basePublicationRow,
        status: 'published',
        idempotency_key: 'announcement:one',
        published_at: '2026-08-18T00:01:00.000Z',
      },
      error: null,
    })
    const metricsQuery = makeQuery({
      data: [
        { publication_id: 'publication-1', read_at: null, archived_at: null },
      ],
      error: null,
    })
    const queues: Record<string, Array<ReturnType<typeof makeQuery>>> = {
      workspace_message_senders: [senderQuery],
      workspace_message_publications: [existingQuery],
      workspace_message_deliveries: [metricsQuery],
    }
    const from = vi.fn((table: string) => queues[table].shift())

    const result = await publishWorkspaceMessage(
      { from } as never,
      {
        senderKey: 'owner',
        title: 'Welcome update',
        summary: 'A short update.',
        body: 'Here is the news.',
        category: 'announcement',
        audience: { kind: 'selected', repIds: ['rep-1'] },
        idempotencyKey: 'announcement:one',
      },
    )
    expect(result).toMatchObject({ status: 'published', deliveryCount: 1 })
    expect(from).not.toHaveBeenCalledWith('reps')
    expect(metricsQuery.upsert).not.toHaveBeenCalled()
  })

  it('rejects missing or inactive selected recipients', async () => {
    const repsQuery = makeQuery({
      data: [{ id: 'rep-1', display_name: 'Amy', business_name: 'Amy Sparkles' }],
      error: null,
    })
    await expect(
      resolveWorkspaceMessageAudience(
        { from: vi.fn(() => repsQuery) } as never,
        { kind: 'selected', repIds: ['rep-1', 'rep-2'] },
      ),
    ).rejects.toMatchObject({ code: 'WORKSPACE_MESSAGE_RECIPIENT_UNAVAILABLE' })
  })

  it('queries and returns only explicitly selected active reps', async () => {
    const repsQuery = makeQuery({
      data: [{ id: 'rep-2', display_name: 'Bea', business_name: 'Bea Gems' }],
      error: null,
    })
    const result = await resolveWorkspaceMessageAudience(
      { from: vi.fn(() => repsQuery) } as never,
      { kind: 'selected', repIds: ['rep-2'] },
    )
    expect(repsQuery.eq).toHaveBeenCalledWith('status', 'active')
    expect(repsQuery.in).toHaveBeenCalledWith('id', ['rep-2'])
    expect(result.members.map((member) => member.repId)).toEqual(['rep-2'])
  })

  it.each([
    {
      name: 'inactive sender',
      sender: { ...senderRow, is_active: false },
      code: 'WORKSPACE_MESSAGE_SENDER_INACTIVE',
      category: 'announcement' as const,
      audience: { kind: 'selected' as const, repIds: ['rep-1'] },
    },
    {
      name: 'unapproved category',
      sender: {
        ...senderRow,
        capabilities: { categories: ['announcement'], audiences: ['selected'] },
      },
      code: 'WORKSPACE_MESSAGE_CATEGORY_FORBIDDEN',
      category: 'monthly_report' as const,
      audience: { kind: 'selected' as const, repIds: ['rep-1'] },
    },
    {
      name: 'unapproved audience',
      sender: {
        ...senderRow,
        capabilities: { categories: ['announcement'], audiences: ['selected'] },
      },
      code: 'WORKSPACE_MESSAGE_AUDIENCE_FORBIDDEN',
      category: 'announcement' as const,
      audience: { kind: 'all_active' as const },
    },
  ])('rejects $name before audience resolution or writes', async (scenario) => {
    const senderQuery = makeQuery({ data: scenario.sender, error: null })
    const from = vi.fn((table: string) => {
      if (table === 'workspace_message_senders') return senderQuery
      throw new Error(`unexpected query to ${table}`)
    })
    await expect(
      publishWorkspaceMessage(
        { from } as never,
        {
          senderKey: 'owner',
          title: 'Welcome update',
          body: 'Here is the news.',
          category: scenario.category,
          audience: scenario.audience,
        },
      ),
    ).rejects.toMatchObject({ code: scenario.code })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('marks a publication failed after a partial delivery write failure so retry can recover', async () => {
    const senderQuery = makeQuery({ data: senderRow, error: null })
    const repsQuery = makeQuery({
      data: [{ id: 'rep-1', display_name: 'Amy', business_name: 'Amy Sparkles' }],
      error: null,
    })
    const publicationQuery = makeQuery({ data: basePublicationRow, error: null })
    const deliveryFailure = { code: '08006', message: 'connection failure' }
    const deliveriesQuery = makeQuery({ data: null, error: deliveryFailure })
    const failedUpdateQuery = makeQuery({ data: null, error: null })
    const queues: Record<string, Array<ReturnType<typeof makeQuery>>> = {
      workspace_message_senders: [senderQuery],
      reps: [repsQuery],
      workspace_message_publications: [publicationQuery, failedUpdateQuery],
      workspace_message_deliveries: [deliveriesQuery],
    }
    const from = vi.fn((table: string) => queues[table].shift())
    await expect(
      publishWorkspaceMessage(
        { from } as never,
        {
          senderKey: 'owner',
          title: 'Welcome update',
          summary: 'A short update.',
          body: 'Here is the news.',
          category: 'announcement',
          audience: { kind: 'selected', repIds: ['rep-1'] },
        },
      ),
    ).rejects.toBe(deliveryFailure)
    expect(failedUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    )
    expect(failedUpdateQuery.eq).toHaveBeenCalledWith('id', 'publication-1')
    expect(failedUpdateQuery.eq).toHaveBeenCalledWith('status', 'publishing')
  })

  it('recovers a concurrent idempotency insert collision without duplicate deliveries', async () => {
    const senderQuery = makeQuery({ data: senderRow, error: null })
    const initialLookup = makeQuery({ data: null, error: null })
    const repsQuery = makeQuery({
      data: [{ id: 'rep-1', display_name: 'Amy', business_name: 'Amy Sparkles' }],
      error: null,
    })
    const insertCollision = makeQuery({
      data: null,
      error: { code: '23505', message: 'duplicate idempotency key' },
    })
    const concurrentPublication = makeQuery({
      data: { ...basePublicationRow, idempotency_key: 'announcement:concurrent' },
      error: null,
    })
    const deliveriesQuery = makeQuery({ data: null, error: null })
    const publishedQuery = makeQuery({
      data: {
        ...basePublicationRow,
        status: 'published',
        idempotency_key: 'announcement:concurrent',
        published_at: '2026-08-18T00:01:00.000Z',
      },
      error: null,
    })
    const auditQuery = makeQuery({ data: null, error: null })
    const queues: Record<string, Array<ReturnType<typeof makeQuery>>> = {
      workspace_message_senders: [senderQuery],
      reps: [repsQuery],
      workspace_message_publications: [
        initialLookup,
        insertCollision,
        concurrentPublication,
        publishedQuery,
      ],
      workspace_message_deliveries: [deliveriesQuery],
      workspace_message_audit_events: [auditQuery],
    }
    const from = vi.fn((table: string) => queues[table].shift())
    const result = await publishWorkspaceMessage(
      { from } as never,
      {
        senderKey: 'owner',
        title: 'Welcome update',
        summary: 'A short update.',
        body: 'Here is the news.',
        category: 'announcement',
        audience: { kind: 'selected', repIds: ['rep-1'] },
        idempotencyKey: 'announcement:concurrent',
      },
    )
    expect(deliveriesQuery.upsert).toHaveBeenCalledTimes(1)
    expect(deliveriesQuery.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ rep_id: 'rep-1' })],
      { onConflict: 'publication_id,rep_id', ignoreDuplicates: true },
    )
    expect(result.status).toBe('published')
  })

  it('always scopes recipient state updates by both delivery and authenticated rep', async () => {
    const deliveryQuery = makeQuery({ data: null, error: null })
    await expect(
      updateRepWorkspaceMessageDelivery(
        { from: vi.fn(() => deliveryQuery) } as never,
        'rep-1',
        { deliveryId: 'delivery-for-rep-2', read: true },
      ),
    ).rejects.toMatchObject({ code: 'WORKSPACE_MESSAGE_DELIVERY_NOT_FOUND' })
    expect(deliveryQuery.eq).toHaveBeenCalledWith('id', 'delivery-for-rep-2')
    expect(deliveryQuery.eq).toHaveBeenCalledWith('rep_id', 'rep-1')
    expect(deliveryQuery.update).toHaveBeenCalledWith({
      read_at: expect.any(String),
    })
  })

  it('lists a rep inbox with a safe publication projection and explicit rep scope', async () => {
    const listQuery = makeQuery({
      data: [
        {
          id: 'delivery-1',
          publication_id: 'publication-1',
          delivered_at: '2026-08-18T00:01:00.000Z',
          read_at: null,
          archived_at: null,
          workspace_message_publications: {
            id: 'publication-1',
            sender_key: 'owner',
            sender_display_name: 'Sparkle Suite',
            category: 'announcement',
            priority: 'important',
            title: 'Important update',
            summary: 'Read this update.',
            body: [{ type: 'paragraph', text: 'Details.' }],
            action_label: 'Open update',
            action_url: '/nic-nac?section=tools',
            secondary_action_label: 'Watch on YouTube',
            secondary_action_url: 'https://www.youtube.com/watch?v=abc123',
            status: 'published',
            published_at: '2026-08-18T00:01:00.000Z',
            created_at: '2026-08-18T00:00:00.000Z',
          },
        },
      ],
      error: null,
    })
    const unreadQuery = makeQuery({ data: null, error: null, count: 1 })
    const from = vi
      .fn()
      .mockReturnValueOnce(listQuery)
      .mockReturnValueOnce(unreadQuery)
    const result = await listRepWorkspaceMessages(
      { from } as never,
      'rep-1',
      { category: 'announcement', unreadOnly: true },
    )

    expect(listQuery.eq).toHaveBeenCalledWith('rep_id', 'rep-1')
    expect(unreadQuery.eq).toHaveBeenCalledWith('rep_id', 'rep-1')
    const select = (
      listQuery.select as { mock: { calls: Array<[string]> } }
    ).mock.calls[0]?.[0]
    expect(select).toContain('sender_display_name')
    expect(select).not.toContain('audience_snapshot')
    expect(select).not.toContain('audience_rule')
    expect(select).not.toContain('idempotency_key')
    expect(result).toMatchObject({
      unreadCount: 1,
      messages: [
        {
          id: 'delivery-1',
          deliveryId: 'delivery-1',
          publicationId: 'publication-1',
          category: 'announcement',
          archivedAt: null,
          isRead: false,
          secondaryActionLabel: 'Watch on YouTube',
          secondaryActionUrl: 'https://www.youtube.com/watch?v=abc123',
        },
      ],
    })
  })
})
