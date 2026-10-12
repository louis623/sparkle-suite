import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  agentBroadcastIdempotencyKey,
  previewAgentBroadcast,
  publishAgentBroadcast,
} from '@/lib/services/agent-broadcasts'
import { ServiceError } from '@/lib/services/errors'
import {
  assertOwnerScopedControlCenterMcp,
  OwnerScopedMcpError,
  runWithOwnerScopedControlCenterMcp,
} from '@/lib/remy-communications/security'

vi.mock('@/lib/services/workspace-message-audience', () => ({
  previewWorkspaceMessageAudience: vi.fn(async () => ({
    count: 4,
    members: [],
    rule: { kind: 'all_active' },
  })),
}))

const input = {
  agentName: 'bunny',
  title: 'Bunny note',
  body: 'Hello from Bunny.',
  category: 'announcement',
  audience: { kind: 'all_active' as const },
  actionUrl: 'https://www.yoursparklesuite.com/nic-nac',
}

describe('owner-scoped agent broadcasts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires the owner request scope', () => {
    expect(() => assertOwnerScopedControlCenterMcp()).toThrow(OwnerScopedMcpError)
    expect(
      runWithOwnerScopedControlCenterMcp(() => {
        assertOwnerScopedControlCenterMcp()
        return 'ok'
      }),
    ).toBe('ok')
  })

  it('previews the workspace copy and the exact email without sending', async () => {
    const preview = await previewAgentBroadcast({} as never, input)
    expect(preview.workspace).toMatchObject({
      title: 'Bunny note',
      category: 'announcement',
      recipientCount: 4,
    })
    expect(preview.email.willSend).toBe(false)
    expect(preview.email.html).toContain('Bunny note')
    expect(preview.email.html).toContain('Hello from Bunny.')
    expect(preview.email.subject).toBe('Bunny note')
  })

  it('requires an idempotency key and prefixes it with the calling agent', async () => {
    expect(agentBroadcastIdempotencyKey('bunny', 'show-note-1')).toBe('agent:bunny:show-note-1')
    expect(agentBroadcastIdempotencyKey('suite', 'show-note-1')).toBe('agent:suite:show-note-1')
    await expect(publishAgentBroadcast({} as never, input)).rejects.toThrow(ServiceError)
    const publish = vi.fn(async () => ({ id: 'pub-agent' }))
    const deliver = vi.fn()
    const published = await publishAgentBroadcast(
      {} as never,
      { ...input, idempotencyKey: 'show-note-1', emailSuiteList: false },
      { publish: publish as never, deliver: deliver as never },
    )
    expect(published.idempotencyKey).toBe('agent:bunny:show-note-1')
    expect(publish).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        senderKey: 'owner',
        idempotencyKey: 'agent:bunny:show-note-1',
        sourceType: 'agent_broadcast',
        sourceId: 'bunny',
        audience: { kind: 'all_active' },
      }),
    )
    expect(deliver).not.toHaveBeenCalled()
  })

  it('emails the Suite list only when emailSuiteList is set, keyed by the publication', async () => {
    const publish = vi.fn(async () => ({ id: 'pub-agent' }))
    const deliver = vi.fn(async () => ({
      status: 'sent',
      idempotencyKey: 'suite-list:publication:pub-agent',
      broadcastId: 'brd_agent',
      error: null,
      replayed: false,
    }))
    const published = await publishAgentBroadcast(
      {} as never,
      { ...input, agentName: 'suite', idempotencyKey: 'show-note-1', emailSuiteList: true },
      { publish: publish as never, deliver: deliver as never },
    )
    expect(deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'suite-list:publication:pub-agent',
        sourceKind: 'workspace_publication',
        sourceId: 'pub-agent',
      }),
    )
    expect(published.suiteListEmail).toMatchObject({ status: 'sent', broadcastId: 'brd_agent' })
  })
})
