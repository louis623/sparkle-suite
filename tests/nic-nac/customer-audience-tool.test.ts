import { beforeEach, describe, expect, it, vi } from 'vitest'

const getCustomerAudienceMock = vi.fn()
const createCustomerAudienceContactMock = vi.fn()
const updateCustomerAudienceContactMock = vi.fn()

vi.mock('@/lib/services/customer-audience', () => ({
  getCustomerAudience: (...args: unknown[]) => getCustomerAudienceMock(...args),
  createCustomerAudienceContact: (...args: unknown[]) =>
    createCustomerAudienceContactMock(...args),
  updateCustomerAudienceContact: (...args: unknown[]) =>
    updateCustomerAudienceContactMock(...args),
}))

import { buildAllTools } from '@/lib/nic-nac/tools'
import {
  customerAudienceTool,
  inputSchema,
  makeCustomerAudienceTool,
} from '@/lib/nic-nac/tools/get-customer-audience'
import { inputSchema as manageCustomerContactInputSchema, makeManageCustomerContactTool } from '@/lib/nic-nac/tools/manage-customer-contact'
import { NIC_NAC_SYSTEM_PROMPT } from '@/lib/nic-nac/system-prompt'

interface ToolDef {
  execute: (input: unknown) => Promise<Record<string, unknown>>
}

function makeCtx() {
  return {
    repId: 'rep-1',
    supabase: {} as never,
    conversationId: 'conv-1',
    runId: 'run-1',
  }
}

describe('get_customer_audience', () => {
  beforeEach(() => {
    getCustomerAudienceMock.mockReset()
    createCustomerAudienceContactMock.mockReset()
    updateCustomerAudienceContactMock.mockReset()
  })

  it('returns the rep audience summary and recent customers', async () => {
    getCustomerAudienceMock.mockResolvedValueOnce({
      summary: {
        totalCustomers: 3,
        smsReachableCount: 2,
        emailReachableCount: 2,
        marketingConsentCount: 1,
        smsOptedOutCount: 1,
        emailOptedOutCount: 0,
        addedLast30DaysCount: 2,
      },
      customers: [
        {
          id: 'aud-1',
          name: 'Jamie Lane',
          phone: '+15555550101',
          email: 'jamie@example.com',
          smsConsent: true,
          emailConsent: true,
          marketingConsent: true,
          canReceiveSms: true,
          canReceiveEmail: true,
          consentDate: '2026-05-05T12:00:00Z',
          createdAt: '2026-05-05T12:00:00Z',
          smsOptedOutAt: null,
          emailOptedOutAt: null,
          stopKeywordReceivedAt: null,
        },
      ],
    })

    const tool = makeCustomerAudienceTool(makeCtx()) as unknown as ToolDef
    const result = await tool.execute({
      channelFilter: 'sms',
      limit: 10,
    })

    expect(getCustomerAudienceMock).toHaveBeenCalledWith(expect.anything(), 'rep-1', {
      channelFilter: 'sms',
      limit: 10,
    })
    expect(result).toEqual({
      summary: {
        totalCustomers: 3,
        smsReachableCount: 2,
        emailReachableCount: 2,
        marketingConsentCount: 1,
        smsOptedOutCount: 1,
        emailOptedOutCount: 0,
        addedLast30DaysCount: 2,
      },
      customers: [
        {
          id: 'aud-1',
          name: 'Jamie Lane',
          phone: '+15555550101',
          email: 'jamie@example.com',
          smsConsent: true,
          emailConsent: true,
          marketingConsent: true,
          canReceiveSms: true,
          canReceiveEmail: true,
          consentDate: '2026-05-05T12:00:00Z',
          createdAt: '2026-05-05T12:00:00Z',
          smsOptedOutAt: null,
          emailOptedOutAt: null,
          stopKeywordReceivedAt: null,
        },
      ],
    })
  })

  it('keeps the audience tool in the registry and prompt wiring', () => {
    const tools = buildAllTools(makeCtx())
    const names = Object.keys(tools).sort()

    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(
      expect.arrayContaining([
        'get_customer_audience',
        'send_sms_notification',
        'get_notification_preferences',
      ]),
    )
    expect(customerAudienceTool.readOnly).toBe(true)
    expect(customerAudienceTool.name).toBe('get_customer_audience')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      "You have a scoped set of workspace tools available when the rep's request calls for them:",
    )
    expect(NIC_NAC_SYSTEM_PROMPT).toContain('get_customer_audience')
    expect(NIC_NAC_SYSTEM_PROMPT).toContain(
      "pulling up the rep's subscriber list",
    )
  })

  it('rejects an invalid channel filter', () => {
    const result = inputSchema.safeParse({
      channelFilter: 'push',
    })

    expect(result.success).toBe(false)
  })

  it('approval-gates a Nic-Nac profile update without accepting consent fields', async () => {
    updateCustomerAudienceContactMock.mockResolvedValueOnce({
      id: 'aud-1',
      name: 'Jamie Lane',
      favoriteMaterial: 'silver',
    })
    const tool = makeManageCustomerContactTool(makeCtx()) as unknown as ToolDef & {
      needsApproval?: boolean
    }

    expect(tool.needsApproval).toBe(true)
    const result = await tool.execute({
      action: 'update',
      audienceId: '11111111-1111-4111-8111-111111111111',
      expectedVersion: 4,
      favoriteMaterial: 'silver',
    })

    expect(String((tool as { description?: string }).description)).toMatch(/ask the rep to choose/i)
    expect(manageCustomerContactInputSchema.safeParse({
      action: 'update',
      audienceId: '11111111-1111-4111-8111-111111111111',
      favoriteMaterial: 'silver',
    }).success).toBe(false)
    expect(updateCustomerAudienceContactMock).toHaveBeenCalledWith(
      expect.anything(),
      'rep-1',
      expect.objectContaining({
        audienceId: '11111111-1111-4111-8111-111111111111',
        expectedVersion: 4,
        favoriteMaterial: 'silver',
      }),
      expect.objectContaining({ actorKind: 'nic_nac', nicNacConversationId: 'conv-1' }),
    )
    expect(result).toEqual({
      action: 'updated',
      customer: expect.objectContaining({ id: 'aud-1' }),
    })
  })
})
