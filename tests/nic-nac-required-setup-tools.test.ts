import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ToolDefinition } from '@/lib/nic-nac/tools/types'

const {
  getRequiredSetupStateMock,
  getLiveQueueSyncCodeForRepMock,
  ensureLiveQueueSyncCodeForRepMock,
  adminClientMock,
  saveRequiredSetupAnswerMock,
  completeRequiredSetupStepMock,
  unlockRequiredSetupMock,
  sendLouisAlertMock,
} = vi.hoisted(() => ({
  getRequiredSetupStateMock: vi.fn(),
  getLiveQueueSyncCodeForRepMock: vi.fn(),
  ensureLiveQueueSyncCodeForRepMock: vi.fn(),
  adminClientMock: { from: vi.fn() },
  saveRequiredSetupAnswerMock: vi.fn(),
  completeRequiredSetupStepMock: vi.fn(),
  unlockRequiredSetupMock: vi.fn(),
  sendLouisAlertMock: vi.fn(),
}))

vi.mock('@/lib/self-serve/required-setup', () => ({
  getRequiredSetupState: (...args: unknown[]) => getRequiredSetupStateMock(...args),
  saveRequiredSetupAnswer: (...args: unknown[]) => saveRequiredSetupAnswerMock(...args),
  completeRequiredSetupStep: (...args: unknown[]) =>
    completeRequiredSetupStepMock(...args),
  unlockRequiredSetup: (...args: unknown[]) => unlockRequiredSetupMock(...args),
}))

vi.mock('@/lib/ops/louis-alerts', () => ({
  sendLouisAlert: (...args: unknown[]) => sendLouisAlertMock(...args),
}))

vi.mock('@/lib/services/live-queue', () => ({
  getLiveQueueSyncCodeForRep: (...args: unknown[]) =>
    getLiveQueueSyncCodeForRepMock(...args),
  ensureLiveQueueSyncCodeForRep: (...args: unknown[]) =>
    ensureLiveQueueSyncCodeForRepMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => adminClientMock,
}))

function ctx() {
  return {
    repId: 'rep-1',
    conversationId: 'conv-1',
    runId: 'run-1',
    supabase: {} as never,
  }
}

function executeTool(
  tool: ReturnType<ToolDefinition['build']>,
  input: Record<string, unknown>,
) {
  return tool.execute?.(input as never, {} as never)
}

describe('required setup tools', () => {
  beforeEach(() => {
    getRequiredSetupStateMock.mockReset()
    getLiveQueueSyncCodeForRepMock.mockReset()
    ensureLiveQueueSyncCodeForRepMock.mockReset()
    saveRequiredSetupAnswerMock.mockReset()
    completeRequiredSetupStepMock.mockReset()
    unlockRequiredSetupMock.mockReset()
    sendLouisAlertMock.mockReset()
  })

  it('reads required setup state', async () => {
    getRequiredSetupStateMock.mockResolvedValue({ status: 'required_setup' })
    getLiveQueueSyncCodeForRepMock.mockResolvedValue(null)
    const { getRequiredSetupStateTool } = await import(
      '@/lib/nic-nac/tools/get-required-setup-state'
    )
    const testCtx = ctx()
    const tool = getRequiredSetupStateTool.build(testCtx)

    await expect(executeTool(tool, {})).resolves.toEqual({
      status: 'required_setup',
      liveQueueSyncCode: null,
    })
    expect(getRequiredSetupStateMock).toHaveBeenCalledWith('rep-1')
    expect(getLiveQueueSyncCodeForRepMock).toHaveBeenCalledWith(
      testCtx.supabase,
      'rep-1',
    )
  }, 15_000)

  it('includes the saved Live Queue sync code in required setup state', async () => {
    getRequiredSetupStateMock.mockResolvedValue({
      status: 'required_setup',
      currentStep: 'live_queue_setup',
    })
    getLiveQueueSyncCodeForRepMock.mockResolvedValue('MHF-7342')
    const { getRequiredSetupStateTool } = await import(
      '@/lib/nic-nac/tools/get-required-setup-state'
    )
    const tool = getRequiredSetupStateTool.build(ctx())

    await expect(executeTool(tool, {})).resolves.toEqual({
      status: 'required_setup',
      currentStep: 'live_queue_setup',
      liveQueueSyncCode: 'MHF-7342',
    })
  })

  it('ensures a Live Queue sync code for required setup', async () => {
    ensureLiveQueueSyncCodeForRepMock.mockResolvedValue({
      syncCode: 'GFF-7342',
      created: true,
    })
    const { ensureLiveQueueSyncCodeTool } = await import(
      '@/lib/nic-nac/tools/ensure-live-queue-sync-code'
    )
    const testCtx = ctx()
    const tool = ensureLiveQueueSyncCodeTool.build(testCtx)

    await expect(executeTool(tool, {})).resolves.toEqual({
      syncCode: 'GFF-7342',
      created: true,
    })
    expect(ensureLiveQueueSyncCodeForRepMock).toHaveBeenCalledWith(
      adminClientMock,
      { repId: 'rep-1' },
    )
  })

  it('saves an answer with generated copy and support state patches', async () => {
    saveRequiredSetupAnswerMock.mockResolvedValue({ currentStep: 'account_basics' })
    const { saveRequiredSetupAnswerTool } = await import(
      '@/lib/nic-nac/tools/save-required-setup-answer'
    )
    const tool = saveRequiredSetupAnswerTool.build(ctx())

    await expect(
      executeTool(tool, {
        stepId: 'welcome_copy',
        answer: { tone: 'warm' },
        generatedCopy: { headline: 'Welcome sparkle friends' },
        supportState: { reviewed: false },
      }),
    ).resolves.toEqual({ currentStep: 'account_basics' })

    expect(saveRequiredSetupAnswerMock).toHaveBeenCalledWith(
      'rep-1',
      'welcome_copy',
      { tone: 'warm' },
      {
        generatedCopyPatch: { headline: 'Welcome sparkle friends' },
        supportStatePatch: { reviewed: false },
      },
    )
    expect(completeRequiredSetupStepMock).not.toHaveBeenCalled()
  })

  it('allows operational required setup step IDs in the save-answer schema', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'lib/nic-nac/tools/save-required-setup-answer.ts'),
      'utf8',
    )

    expect(source).toContain("'live_queue_setup'")
    expect(source).not.toContain("'email_sms_update_readiness'")
    expect(source).not.toContain("'live_queue_orientation'")
  })

  it('blocks account basics completion until the rep confirms the summary', async () => {
    const { saveRequiredSetupAnswerTool } = await import(
      '@/lib/nic-nac/tools/save-required-setup-answer'
    )
    const tool = saveRequiredSetupAnswerTool.build(ctx())

    await expect(
      executeTool(tool, {
        stepId: 'account_basics',
        answer: { customerFacingDisplayName: 'Sparkle Test' },
        completeStep: true,
      }),
    ).rejects.toThrow('account basics summary')

    expect(saveRequiredSetupAnswerMock).not.toHaveBeenCalled()
    expect(completeRequiredSetupStepMock).not.toHaveBeenCalled()
  })

  it('surfaces server readiness rejection without saving caller connection claims', async () => {
    completeRequiredSetupStepMock.mockRejectedValue(new Error('Live Lineup connection is not ready (stale).'))
    const { saveRequiredSetupAnswerTool } = await import(
      '@/lib/nic-nac/tools/save-required-setup-answer'
    )
    const tool = saveRequiredSetupAnswerTool.build(ctx())

    await expect(
      executeTool(tool, {
        stepId: 'live_queue_setup',
        answer: { liveQueueConnected: true },
        completeStep: true,
      }),
    ).rejects.toThrow('Live Lineup connection is not ready')

    expect(saveRequiredSetupAnswerMock).not.toHaveBeenCalled()
    expect(completeRequiredSetupStepMock).toHaveBeenCalledWith('rep-1', 'live_queue_setup')
  })

  it('completes the step when requested after saving an answer', async () => {
    saveRequiredSetupAnswerMock.mockResolvedValue({ currentStep: 'account_basics' })
    completeRequiredSetupStepMock.mockResolvedValue({ currentStep: 'about_page' })
    const { saveRequiredSetupAnswerTool } = await import(
      '@/lib/nic-nac/tools/save-required-setup-answer'
    )
    const tool = saveRequiredSetupAnswerTool.build(ctx())

    await expect(
      executeTool(tool, {
        stepId: 'welcome_copy',
        answer: { headline: 'Welcome sparkle friends' },
        completeStep: true,
      }),
    ).resolves.toEqual({ currentStep: 'about_page' })

    expect(saveRequiredSetupAnswerMock).toHaveBeenCalledWith(
      'rep-1',
      'welcome_copy',
      { headline: 'Welcome sparkle friends' },
      {},
    )
    expect(completeRequiredSetupStepMock).toHaveBeenCalledWith(
      'rep-1',
      'welcome_copy',
    )
  })

  it('ignores Live Queue checklist claims and delegates to the server completion boundary', async () => {
    saveRequiredSetupAnswerMock.mockResolvedValue({ currentStep: 'live_queue_setup' })
    completeRequiredSetupStepMock.mockResolvedValue({
      currentStep: 'trade_board_orientation',
    })
    const { saveRequiredSetupAnswerTool } = await import(
      '@/lib/nic-nac/tools/save-required-setup-answer'
    )
    const tool = saveRequiredSetupAnswerTool.build(ctx())
    const answer = {
      extensionInstalled: true,
      syncCodeEntered: true,
      partyOrdersOpen: true,
      partyFilterSet: true,
      liveQueueConnected: true,
    }

    await expect(
      executeTool(tool, {
        stepId: 'live_queue_setup',
        answer,
        completeStep: true,
      }),
    ).resolves.toEqual({ currentStep: 'trade_board_orientation' })

    expect(saveRequiredSetupAnswerMock).not.toHaveBeenCalled()
    expect(completeRequiredSetupStepMock).toHaveBeenCalledWith(
      'rep-1',
      'live_queue_setup',
    )
  })

  it('does not forward Live Queue private text or arbitrary patches when only saving', async () => {
    const { saveRequiredSetupAnswerTool } = await import('@/lib/nic-nac/tools/save-required-setup-answer')
    await executeTool(saveRequiredSetupAnswerTool.build(ctx()), {
      stepId: 'live_queue_setup', answer: { publisherKey: 'private-key' },
      generatedCopy: { text: 'private-key' }, supportState: { text: 'private-key' },
    })
    expect(saveRequiredSetupAnswerMock).toHaveBeenCalledWith('rep-1', 'live_queue_setup', {})
    expect(completeRequiredSetupStepMock).not.toHaveBeenCalled()
  })

  it('surfaces skipped setup blocker alerts so Nic-Nac does not claim Louis was notified', async () => {
    sendLouisAlertMock.mockResolvedValue({
      delivered: false,
      reason: 'telegram_not_configured',
    })
    const { requestRequiredSetupSupportTool } = await import(
      '@/lib/nic-nac/tools/request-required-setup-support'
    )
    const tool = requestRequiredSetupSupportTool.build(ctx())

    await expect(
      executeTool(tool, {
        reason: 'Rep cannot preview site',
        severity: 'error',
      }),
    ).resolves.toEqual({
      ok: false,
      delivered: false,
      reason: 'telegram_not_configured',
    })

    expect(sendLouisAlertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nic-Nac setup needs Louis',
        severity: 'error',
        lines: expect.arrayContaining([
          'Rep ID: rep-1',
          'Conversation: conv-1',
          'Run: run-1',
          'Reason: Rep cannot preview site',
        ]),
      }),
    )
  })

  it('returns delivered when Louis is notified for setup blockers', async () => {
    sendLouisAlertMock.mockResolvedValue({ delivered: true })
    const { requestRequiredSetupSupportTool } = await import(
      '@/lib/nic-nac/tools/request-required-setup-support'
    )
    const tool = requestRequiredSetupSupportTool.build(ctx())

    await expect(
      executeTool(tool, {
        reason: 'Rep cannot preview site',
        severity: 'warning',
      }),
    ).resolves.toEqual({ ok: true, delivered: true })
  })

  it('propagates thrown Louis alert failures', async () => {
    sendLouisAlertMock.mockRejectedValue(new Error('telegram failed'))
    const { requestRequiredSetupSupportTool } = await import(
      '@/lib/nic-nac/tools/request-required-setup-support'
    )
    const tool = requestRequiredSetupSupportTool.build(ctx())

    await expect(
      executeTool(tool, {
        reason: 'Preview route is failing',
        severity: 'warning',
      }),
    ).rejects.toThrow('telegram failed')
  })

  it('requires final preview approval before unlocking setup', async () => {
    const { unlockRequiredSetupTool } = await import(
      '@/lib/nic-nac/tools/unlock-required-setup'
    )
    const tool = unlockRequiredSetupTool.build(ctx())

    await expect(
      executeTool(tool, {
        repApprovedPreview: false,
      }),
    ).rejects.toThrow('approve the final preview')
    expect(unlockRequiredSetupMock).not.toHaveBeenCalled()
  })

  it('unlocks required setup after preview approval', async () => {
    unlockRequiredSetupMock.mockResolvedValue({ status: 'dashboard_unlocked' })
    completeRequiredSetupStepMock.mockResolvedValue({
      currentStep: 'final_preview_approval',
    })
    const { unlockRequiredSetupTool } = await import(
      '@/lib/nic-nac/tools/unlock-required-setup'
    )
    const tool = unlockRequiredSetupTool.build(ctx())

    await expect(
      executeTool(tool, {
        repApprovedPreview: true,
      }),
    ).resolves.toEqual({ status: 'dashboard_unlocked' })
    expect(completeRequiredSetupStepMock).toHaveBeenCalledWith(
      'rep-1',
      'final_preview_approval',
      { repApprovedPreview: true },
    )
    expect(unlockRequiredSetupMock).toHaveBeenCalledWith('rep-1')
  })
})
