import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const services = vi.hoisted(() => ({
  list: vi.fn(async () => ({ conversations: [], recipients: [] })),
  conversation: vi.fn(async () => ({ conversation: { id: 'thread' }, messages: [] })),
  send: vi.fn(async () => ({ created: true, conversation: { id: 'thread' }, message: { id: 'message' } })),
  attachment: vi.fn(async () => ({ url: 'https://files.example/a', expiresIn: 120 })),
}))
const access = vi.hoisted(() => vi.fn())
const state = vi.hoisted(() => ({
  active: true,
  audits: [] as Record<string, unknown>[],
  rows: new Map<string, Record<string, unknown>>(),
}))

vi.mock('@/lib/services/workspace-owner-direct', () => ({
  listOwnerDirectMessages: services.list,
  getOwnerDirectConversation: services.conversation,
  sendOwnerDirectMessage: services.send,
  createOwnerDirectAttachmentSignedRead: services.attachment,
}))
vi.mock('@/lib/supabase/operator-auth', () => ({
  getControlCenterAccess: access,
  OperatorAuthError: class OperatorAuthError extends Error {},
  requireControlCenterOwner: (value: { scope: string }) => {
    if (value.scope !== 'owner') throw new Error('owner required')
    return value
  },
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let action = 'select'
      let payload: Record<string, unknown> = {}
      const filters: Record<string, unknown> = {}
      const execute = () => {
        if (table === 'reps') {
          return {
            data: state.active
              ? {
                  id: '00000000-0000-4000-8000-000000000003',
                  auth_user_id: 'owner-auth',
                  email: 'owner@example.com',
                  status: 'active',
                  display_name: 'Louis',
                  business_name: null,
                  stripe_customer_id: null,
                  public_site_slug: null,
                  custom_domain: null,
                  time_zone: 'America/New_York',
                }
              : null,
            error: null,
          }
        }
        if (table === 'workspace_conversations') {
          return {
            data: {
              id: '00000000-0000-4000-8000-000000000021',
              conversation_type: 'owner_direct',
              context_type: 'rep_profile',
              context_id: '00000000-0000-4000-8000-000000000031',
            },
            error: null,
          }
        }
        if (table === 'workspace_conversation_audit_events' && action === 'insert') {
          state.audits.push(payload)
          return { error: null }
        }
        if (table === 'loc_control_center_operations') {
          if (action === 'insert') {
            if (state.rows.has(String(payload.id))) return { error: { code: '23505' } }
            state.rows.set(String(payload.id), { ...payload, created_at: new Date().toISOString() })
            return { error: null }
          }
          const row = [...state.rows.values()].find((value) =>
            Object.entries(filters).every(([key, wanted]) => value[key] === wanted),
          )
          if (action === 'update' && row) Object.assign(row, payload)
          return { data: row ?? null, error: null }
        }
        return { data: null, error: null }
      }
      const builder = {
        select: () => builder,
        eq: (key: string, value: unknown) => {
          filters[key] = value
          return builder
        },
        insert: (value: Record<string, unknown>) => {
          action = 'insert'
          payload = value
          return builder
        },
        update: (value: Record<string, unknown>) => {
          action = 'update'
          payload = value
          return builder
        },
        maybeSingle: async () => execute(),
        single: async () => execute(),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(execute()).then(resolve),
      }
      return builder
    },
  }),
}))

import { locOperationCatalog } from '@/lib/loc-control-center/catalog'
import { dispatchLocRequest } from '@/lib/loc-control-center/dispatcher'
import {
  classifyOwnerDirectBridge,
  OWNER_DIRECT_OPERATIONS,
  OWNER_DIRECT_REJECTION_MESSAGE,
  parseOwnerDirectInput,
  type OwnerDirectSession,
} from '@/lib/loc-control-center/owner-direct-bridge'
import { requireOwnerDirectAccess, requireOwnerDirectSameOrigin } from '@/lib/control-center/owner-direct-auth'

const owner = '00000000-0000-4000-8000-000000000001'
const opId = '00000000-0000-4000-8000-000000000002'
const repId = '00000000-0000-4000-8000-000000000031'
const conversationId = '00000000-0000-4000-8000-000000000021'
const attachmentId = '00000000-0000-4000-8000-000000000041'
const secret = 's'.repeat(48)
const liveSession: OwnerDirectSession = {
  email: 'owner@example.com',
  status: 'active',
  authUserId: 'owner-auth',
  repId: '00000000-0000-4000-8000-000000000003',
}

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    ownerId: owner,
    authority: 'owner' as const,
    operation: 'ownerDirect.list',
    input: { product: 'suite' },
    ...overrides,
  }
}

function classify(overrides: Record<string, unknown> = {}, session: OwnerDirectSession | null = liveSession, source: 'loc-bridge' | 'control-center' | 'service' = 'loc-bridge') {
  return classifyOwnerDirectBridge({
    source,
    envelope: envelope(overrides),
    expectedOwnerId: owner,
    ownerEmails: ['owner@example.com'],
    session,
  })
}

function request(body: Record<string, unknown>, timestamp = String(Math.floor(Date.now() / 1000))) {
  const raw = JSON.stringify({ ownerId: owner, operation: 'ownerDirect.list', input: { product: 'suite' }, ...body })
  return new Request('https://www.yoursparklesuite.com/api/internal/loc-control-center', {
    method: 'POST',
    body: raw,
    headers: {
      'x-loc-timestamp': timestamp,
      'x-loc-signature': createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex'),
    },
  })
}

beforeEach(() => {
  state.active = true
  state.audits = []
  state.rows.clear()
  services.list.mockClear()
  services.conversation.mockClear()
  services.send.mockClear()
  services.attachment.mockClear()
  access.mockReset()
  vi.stubEnv('LOC_CONTROL_CENTER_SECRET', secret)
  vi.stubEnv('LOC_CONTROL_CENTER_OWNER_ID', owner)
  vi.stubEnv('LOC_CONTROL_CENTER_OPERATOR_EMAIL', 'owner@example.com')
  vi.stubEnv('CONTROL_CENTER_OWNER_EMAILS', 'owner@example.com')
  vi.stubEnv('INTERNAL_OPERATOR_EMAILS', 'owner@example.com')
  vi.stubEnv('CONTROL_CENTER_SITE_SUPPORT_OPERATOR_EMAILS', '')
  vi.stubEnv('CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAILS', '')
  vi.stubEnv('LOC_CONTROL_CENTER_OPERATIONS', OWNER_DIRECT_OPERATIONS.join(','))
})

describe('LOC owner-direct bridge actor', () => {
  it('allows the owner with a live LOC session for every ownerDirect operation', () => {
    for (const operation of OWNER_DIRECT_OPERATIONS) {
      expect(classify({ operation })).toEqual({ ok: true })
      expect(locOperationCatalog.find((row) => row.name === operation)?.ownerOnly).toBe(true)
    }
    expect(parseOwnerDirectInput('ownerDirect.send', {
      product: 'suite',
      repId,
      body: 'Hello',
      clientRequestId: 'request-1',
    })).toMatchObject({ repId, body: 'Hello' })
    expect(() => parseOwnerDirectInput('ownerDirect.send', {
      product: 'suite',
      repId,
      body: 'Hello',
      clientRequestId: 'request-1',
      namedAgentGrant: true,
    })).toThrow()
  })

  it('rejects an agent, including a service connection presented as the owner', () => {
    expect(classify({ authority: 'agent' })).toEqual({ ok: false, reason: 'agent' })
    expect(classify({
      connectionId: '00000000-0000-4000-8000-000000000011',
      intendedAssignee: 'Suite',
    })).toEqual({ ok: false, reason: 'agent' })
  })

  it('rejects a one-time job', () => {
    expect(classify({
      authority: 'agent',
      delegation: { mode: 'owner-approved', jobId: opId },
    })).toEqual({ ok: false, reason: 'job' })
    expect(classify({ delegation: { mode: 'owner-approved' } })).toEqual({ ok: false, reason: 'job' })
  })

  it('rejects namedAgentGrant', () => {
    expect(classify({
      authority: 'agent',
      namedAgentGrant: { mode: 'named-agent', agentId: 'suite', agentName: 'Suite', operation: 'suite.ownerDirect.send' },
    })).toEqual({ ok: false, reason: 'named_agent_grant' })
    expect(classify({ namedAgentGrant: { mode: 'named-agent' } })).toEqual({ ok: false, reason: 'named_agent_grant' })
  })

  it('rejects a missing live owner session', () => {
    expect(classify({}, null)).toEqual({ ok: false, reason: 'missing_session' })
    expect(classify({}, { ...liveSession, status: 'inactive' })).toEqual({ ok: false, reason: 'missing_session' })
    expect(classify({}, { ...liveSession, authUserId: null })).toEqual({ ok: false, reason: 'missing_session' })
    expect(classify({ ownerId: '00000000-0000-4000-8000-000000000099' })).toEqual({ ok: false, reason: 'missing_session' })
  })

  it('rejects a wrong operation', () => {
    expect(classify({ operation: 'tasks.list' })).toEqual({ ok: false, reason: 'operation' })
    expect(classify({ operation: 'ownerDirect.nope' })).toEqual({ ok: false, reason: 'operation' })
  })

  it('rejects a non-bridge caller', () => {
    expect(classify({}, liveSession, 'control-center')).toEqual({ ok: false, reason: 'non_bridge' })
    expect(classify({}, liveSession, 'service')).toEqual({ ok: false, reason: 'non_bridge' })
  })
})

describe('LOC owner-direct bridge dispatch', () => {
  it('runs each owner operation for the signed-in owner and audits the use', async () => {
    const cases = [
      { operation: 'ownerDirect.list', input: { product: 'suite', recipientQuery: 'Ada' }, service: services.list },
      { operation: 'ownerDirect.conversation', input: { product: 'suite', conversationId }, service: services.conversation },
      { operation: 'ownerDirect.reply', input: { product: 'suite', conversationId, body: 'On my way' }, operationId: opId, service: services.send },
      { operation: 'ownerDirect.send', input: { product: 'suite', repId, body: 'Hello', clientRequestId: 'request-1' }, operationId: '00000000-0000-4000-8000-000000000022', service: services.send },
      { operation: 'ownerDirect.attachment', input: { product: 'suite', conversationId, attachmentId }, service: services.attachment },
    ] as const
    for (const item of cases) {
      state.audits = []
      item.service.mockClear()
      const response = await dispatchLocRequest(request({
        authority: 'owner',
        operation: item.operation,
        input: item.input,
        ...(item.operationId ? { operationId: item.operationId } : {}),
      }))
      expect(response.status, item.operation).toBe(200)
      expect(item.service, item.operation).toHaveBeenCalled()
      expect(state.audits.at(-1), item.operation).toMatchObject({
        actor_type: 'operator',
        actor_id: '00000000-0000-4000-8000-000000000003',
        event_type: `loc_owner_direct_${item.operation.slice('ownerDirect.'.length)}`,
        details: expect.objectContaining({ source: 'loc-bridge', operation: item.operation, ownerId: owner }),
      })
      expect(JSON.stringify(state.audits.at(-1))).not.toContain('On my way')
      expect(JSON.stringify(state.audits.at(-1))).not.toContain('Hello')
      if (item.operation === 'ownerDirect.reply') {
        expect(services.send).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          repId,
          body: 'On my way',
          clientRequestId: opId,
          uploadIds: [],
        }))
      }
      if (item.operation === 'ownerDirect.send') {
        expect(services.send).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          repId,
          body: 'Hello',
          clientRequestId: 'request-1',
          uploadIds: [],
        }))
      }
    }
  })

  it('rejects agent, job, namedAgentGrant, missing session, and the wrong operation before any direct-message call', async () => {
    const cases = [
      { body: { operation: 'ownerDirect.list', authority: 'agent' }, message: OWNER_DIRECT_REJECTION_MESSAGE.agent },
      { body: { operation: 'ownerDirect.send', authority: 'owner', delegation: { mode: 'owner-approved' }, operationId: opId, input: { product: 'suite', repId, body: 'Hello', clientRequestId: 'request-1' } }, message: OWNER_DIRECT_REJECTION_MESSAGE.job },
      { body: { operation: 'ownerDirect.send', namedAgentGrant: { mode: 'named-agent', agentId: 'a', agentName: 'Suite', operation: 'suite.ownerDirect.send' }, operationId: opId, input: { product: 'suite', repId, body: 'Hello', clientRequestId: 'request-1' } }, message: OWNER_DIRECT_REJECTION_MESSAGE.named_agent_grant },
      { body: { operation: 'ownerDirect.list', authority: 'owner' }, message: OWNER_DIRECT_REJECTION_MESSAGE.missing_session, inactive: true },
      { body: { operation: 'ownerDirect.nope', authority: 'owner' }, message: OWNER_DIRECT_REJECTION_MESSAGE.operation },
    ]
    for (const item of cases) {
      state.active = !item.inactive
      services.list.mockClear()
      services.send.mockClear()
      const response = await dispatchLocRequest(request(item.body))
      expect(response.status, item.message).toBe(403)
      expect((await response.json()).error.message, item.message).toBe(item.message)
      expect(services.list).not.toHaveBeenCalled()
      expect(services.send).not.toHaveBeenCalled()
      if (item.inactive) state.active = true
    }
  })

  it('keeps namedAgentGrant on any other operation invalid', async () => {
    vi.stubEnv('LOC_CONTROL_CENTER_OPERATIONS', 'tasks.create')
    const response = await dispatchLocRequest(request({
      operation: 'tasks.create',
      operationId: opId,
      authority: 'owner',
      namedAgentGrant: { mode: 'named-agent' },
      input: { product: 'suite', title: 'Safe reviewer task', itemType: 'operations' },
    }))
    expect(response.status).toBe(400)
    expect(services.list).not.toHaveBeenCalled()
  })

  it('hides owner direct operations from agent catalog discovery', async () => {
    const agent = await dispatchLocRequest(request({ operation: 'catalog', authority: 'agent' }))
    const ownerCatalog = await dispatchLocRequest(request({ operation: 'catalog', authority: 'owner' }))
    const agentNames = (await agent.json()).result.operations.map((item: { name: string }) => item.name)
    const ownerNames = (await ownerCatalog.json()).result.operations.map((item: { name: string }) => item.name)
    for (const name of OWNER_DIRECT_OPERATIONS) {
      expect(agentNames, name).not.toContain(name)
      expect(ownerNames, name).toContain(name)
    }
  })
})

describe('owner direct non-bridge paths', () => {
  it('still rejects loc_service and a cross-site write', async () => {
    access.mockResolvedValue({ scope: 'owner', method: 'loc_service' })
    await expect(requireOwnerDirectAccess()).rejects.toThrow('interactive owner session')
    expect(() => requireOwnerDirectSameOrigin(new Request('https://www.yoursparklesuite.com/api/control-center/direct-messages', {
      method: 'POST',
    }))).toThrow('same-origin')
  })
})
