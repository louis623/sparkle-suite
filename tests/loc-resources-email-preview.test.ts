import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const deliverSuiteListNotice = vi.hoisted(() => vi.fn())
const publishWorkspaceResource = vi.hoisted(() => vi.fn())
const dispatchWorkspaceMessages = vi.hoisted(() => vi.fn())

vi.mock('@/lib/services/suite-official-notice', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/suite-official-notice')>(
    '@/lib/services/suite-official-notice',
  )
  return { ...actual, deliverSuiteListNotice }
})
vi.mock('@/lib/supabase/operator-auth', () => ({
  AuthError: class AuthError extends Error {},
  OperatorAuthError: class OperatorAuthError extends Error {},
  getControlCenterAccess: async () => ({
    operator: { email: 'owner@example.com', repId: 'rep-1' },
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    marker: 'admin',
    from: (table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () =>
          table === 'reps'
            ? {
                data: {
                  id: '00000000-0000-4000-8000-000000000003',
                  auth_user_id: 'test-auth',
                  email: 'owner@example.com',
                  status: 'active',
                },
                error: null,
              }
            : { data: null, error: null },
      }
      return builder
    },
  }),
}))
vi.mock('@/lib/services/workspace-resources', () => ({
  WORKSPACE_RESOURCE_TYPES: ['help', 'faq', 'blog', 'video'],
  listOperatorWorkspaceResources: vi.fn(),
  publishWorkspaceResource: (...args: unknown[]) => publishWorkspaceResource(...args),
}))
vi.mock('@/lib/services/workspace-message-dispatch', () => ({
  dispatchWorkspaceMessageAutomationAfterResponse: (...args: unknown[]) =>
    dispatchWorkspaceMessages(...args),
}))

import { locOperationCatalog } from '@/lib/loc-control-center/catalog'
import { dispatchLocRequest } from '@/lib/loc-control-center/dispatcher'
import { runExistingLocRoute } from '@/lib/loc-control-center/legacy-routes'

const owner = '00000000-0000-4000-8000-000000000001'
const secret = 's'.repeat(48)
const fetchMock = vi.fn(() => {
  throw new Error('Suite list delivery must stay mocked. This test must not send email.')
})

function signedRequest(body: Record<string, unknown>) {
  const raw = JSON.stringify({ ownerId: owner, ...body })
  const timestamp = String(Math.floor(Date.now() / 1000))
  return new Request('https://www.yoursparklesuite.com/api/internal/loc-control-center', {
    method: 'POST',
    body: raw,
    headers: {
      'content-type': 'application/json',
      'x-loc-timestamp': timestamp,
      'x-loc-signature': createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex'),
    },
  })
}

function operationSchema(name: string) {
  const operation = locOperationCatalog.find((row) => row.name === name)
  if (!operation) throw new Error(`Missing ${name}`)
  return operation
}

beforeEach(() => {
  deliverSuiteListNotice.mockReset()
  publishWorkspaceResource.mockReset()
  dispatchWorkspaceMessages.mockReset()
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('LOC_CONTROL_CENTER_SECRET', secret)
  vi.stubEnv('LOC_CONTROL_CENTER_OWNER_ID', owner)
  vi.stubEnv('LOC_CONTROL_CENTER_OPERATOR_EMAIL', 'owner@example.com')
  vi.stubEnv('CONTROL_CENTER_OWNER_EMAILS', 'owner@example.com')
  vi.stubEnv('INTERNAL_OPERATOR_EMAILS', 'owner@example.com')
  vi.stubEnv('CONTROL_CENTER_SITE_SUPPORT_OPERATOR_EMAILS', '')
  vi.stubEnv('CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAILS', '')
  vi.stubEnv('LOC_CONTROL_CENTER_OPERATIONS', '')
})

describe('resources.emailPreview catalog', () => {
  it('uses the resources.publish content fields and requires a title', () => {
    const preview = operationSchema('resources.emailPreview')
    const publish = operationSchema('resources.publish')
    const previewSchema = preview.inputSchema as {
      properties: Record<string, unknown>
      required: string[]
    }
    const publishSchema = publish.inputSchema as { properties: Record<string, unknown> }
    const { announce, emailSuiteList, ...content } = publishSchema.properties

    expect(preview.area).toBe('resources')
    expect(preview.effect).toBe('read')
    expect(preview.products).toEqual(['suite'])
    expect(announce).toEqual({ type: 'boolean' })
    expect(emailSuiteList).toEqual({ type: 'boolean' })
    expect(previewSchema.properties).toEqual(content)
    expect(previewSchema.required).toEqual(['title'])
    expect(previewSchema.properties).not.toHaveProperty('emailSuiteList')
    expect(previewSchema.properties).not.toHaveProperty('announce')

    const parsed = z.fromJSONSchema(preview.inputSchema)
    expect(parsed.safeParse({ product: 'suite', title: 'Party guide' }).success).toBe(true)
    expect(parsed.safeParse({ product: 'suite', body: 'No title' }).success).toBe(false)
  })
})

describe('resources.emailPreview dispatcher', () => {
  it('renders the suite-official-notice template and does not send', async () => {
    const response = await dispatchLocRequest(
      signedRequest({
        operation: 'resources.emailPreview',
        input: {
          product: 'suite',
          title: 'Party guide',
          summary: 'How to host.',
          body: 'Bring the drinks.',
          emailSuiteList: true,
          announce: true,
        },
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.result).toMatchObject({
      subject: 'Party guide',
      ctaLabel: 'Read',
      variables: {
        HEADLINE: 'Party guide',
        CTA_LABEL: 'Read',
      },
    })
    expect(payload.result.html).toContain('suite-official-notice')
    expect(payload.result.html).toContain('Party guide')
    expect(payload.result.html).toContain('How to host.')
    expect(deliverSuiteListNotice).not.toHaveBeenCalled()
    expect(publishWorkspaceResource).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses a resource notice for video copy', async () => {
    const response = await dispatchLocRequest(
      signedRequest({
        operation: 'resources.emailPreview',
        input: {
          product: 'suite',
          title: 'Show clip',
          resourceType: 'video',
          videoUrl: 'https://www.youtube.com/watch?v=locpreview1',
        },
      }),
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.result.ctaLabel).toBe('Watch')
    expect(payload.result.thumbnailUrl).toBe('https://i.ytimg.com/vi/locpreview1/hqdefault.jpg')
    expect(payload.result.html).toContain('suite-official-notice')
    expect(deliverSuiteListNotice).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('resources.publish Suite list delivery through the LOC bridge', () => {
  it('reaches deliverSuiteListNotice when emailSuiteList is true and does not send itself', async () => {
    publishWorkspaceResource.mockResolvedValue({
      resource: {
        id: 'resource-1',
        version: 2,
        title: 'Party guide',
        thumbnailUrl: null,
        videoUrl: null,
        actionUrl: 'https://www.yoursparklesuite.com/nic-nac?section=resources',
      },
      announcement: null,
    })
    deliverSuiteListNotice.mockResolvedValue({
      status: 'blocked',
      idempotencyKey: 'suite-list:resource:resource-1:v2',
      broadcastId: null,
      error: 'mocked',
      replayed: false,
    })

    const result = await runExistingLocRoute('resources.publish', {
      product: 'suite',
      title: 'Party guide',
      summary: 'How to host.',
      body: 'Bring the drinks.',
      resourceType: 'blog',
      emailSuiteList: true,
    })

    expect(publishWorkspaceResource).toHaveBeenCalledOnce()
    expect(deliverSuiteListNotice).toHaveBeenCalledOnce()
    expect(deliverSuiteListNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: expect.objectContaining({ marker: 'admin' }),
        idempotencyKey: 'suite-list:resource:resource-1:v2',
        sourceKind: 'workspace_resource',
        sourceId: 'resource-1',
        content: expect.objectContaining({
          headline: 'Party guide',
          ctaLabel: 'Read',
        }),
      }),
    )
    expect(result.suiteListEmail).toMatchObject({ status: 'blocked', error: 'mocked' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
