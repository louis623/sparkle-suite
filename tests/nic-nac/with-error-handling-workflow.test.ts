import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  logIncident: vi.fn(),
  recordFailure: vi.fn(),
  createSupportReport: vi.fn(),
  createAdminClient: vi.fn(() => ({ admin: true })),
}))

vi.mock('@/lib/nic-nac/guardian-telemetry', () => ({
  logIncident: mocks.logIncident,
}))
vi.mock('@/lib/nic-nac/workflows/trade-board-intake-store', () => ({
  recordTradeBoardIntakeFailure: mocks.recordFailure,
}))
vi.mock('@/lib/services/support-reports', () => ({
  createSupportReport: mocks.createSupportReport,
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

import { withErrorHandling } from '@/lib/nic-nac/tools/wrappers/with-error-handling'
import { NicNacMutationFailure } from '@/lib/nic-nac/tool-failure-classification'

const workflow = {
  id: 'workflow-1',
  repId: 'rep-1',
  conversationId: 'conversation-1',
  workflowType: 'trade_board_add_listing' as const,
  catalogMode: 'item_number' as const,
  status: 'active' as const,
  phase: 'adding' as const,
  known: { itemNumber: 'ER59000', mainStone: 'Lab-Created Ruby' },
  missing: [],
  blockers: [],
  warnings: [],
  metadata: {},
  photos: [
    {
      attachmentIndex: 1,
      declaredRole: 'jewelry_front' as const,
      visualRole: 'jewelry' as const,
      roleConfirmed: true,
      imageUrl: 'data:image/jpeg;base64,SECRET',
      quality: 'usable' as const,
      qualityIssues: [],
      notes: [],
    },
  ],
}

function makeWrapped(runId: string) {
  return withErrorHandling(
    {
      name: 'add_listing',
      readOnly: false,
      ctx: {
        repId: 'rep-1',
        conversationId: 'conversation-1',
        runId,
        supabase: {} as never,
        activeTradeBoardWorkflow: workflow,
      },
    },
    {
      execute: async () => {
        throw new NicNacMutationFailure({
          code: 'CATALOG_PHOTO_STORAGE_FAILED',
          stage: 'catalog_photo_storage',
          retryable: true,
          cause: new Error('backend storage failed'),
        })
      },
    } as never,
  ) as unknown as {
    execute: (input: unknown) => Promise<Record<string, unknown>>
  }
}

function makeResolverWrapped(runId: string) {
  return withErrorHandling(
    {
      name: 'prepare_trade_board_work',
      readOnly: true,
      ctx: {
        repId: 'rep-1',
        conversationId: 'conversation-1',
        runId,
        supabase: {} as never,
        activeTradeBoardWorkflow: workflow,
      },
    },
    {
      execute: async () => {
        throw new Error('PGRST100 failed to parse logic tree')
      },
    } as never,
  ) as unknown as {
    execute: (input: unknown) => Promise<Record<string, unknown>>
  }
}

describe('add_listing durable failure escalation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.logIncident.mockResolvedValue(undefined)
    mocks.createSupportReport.mockResolvedValue({ ok: true })
  })

  it('keeps the accepted workflow/photo and offers one retry after the first failure', async () => {
    mocks.recordFailure.mockResolvedValue({
      workflowId: 'workflow-1',
      failureCount: 1,
      workflowStatusAfter: 'active',
      newlyEscalated: false,
      sameRunReplay: false,
    })

    const result = await makeWrapped('run-1').execute({
      mode: 'single',
      itemNumber: 'ER59000',
      material: 'Rhodium Plating',
      mainStone: 'Lab-Created Ruby',
      piecePhotoUrl: 'data:image/jpeg;base64,SECRET',
    })

    expect(result).toMatchObject({
      retryable: true,
      code: 'CATALOG_PHOTO_STORAGE_FAILED',
    })
    expect(String(result.message)).toContain('without uploading it again')
    expect(String(result.message)).toContain('backend storage failed')
    expect(String(result.message)).toContain('photo upload error')
    expect(String(result.message)).not.toContain('SECRET')
    expect(mocks.createSupportReport).not.toHaveBeenCalled()
    expect(JSON.stringify(mocks.recordFailure.mock.calls)).not.toContain('SECRET')
    expect(JSON.stringify(mocks.logIncident.mock.calls)).not.toContain('SECRET')
  })

  it('pauses on the second matching failure and files one actionable report', async () => {
    mocks.recordFailure.mockResolvedValue({
      workflowId: 'workflow-1',
      failureCount: 2,
      workflowStatusAfter: 'needs_human_review',
      newlyEscalated: true,
      sameRunReplay: false,
    })

    const result = await makeWrapped('run-2').execute({
      mode: 'single',
      itemNumber: 'ER59000',
      material: 'Rhodium Plating',
      mainStone: 'Lab-Created Ruby',
    })

    expect(result).toMatchObject({ needsHumanReview: true })
    expect(String(result.message)).toContain('still saved')
    expect(mocks.createSupportReport).toHaveBeenCalledTimes(1)
  })

  it('records resolver failures against the durable workflow instead of only logging an incident', async () => {
    mocks.recordFailure.mockResolvedValue({
      workflowId: 'workflow-1',
      failureCount: 1,
      workflowStatusAfter: 'active',
      newlyEscalated: false,
      sameRunReplay: false,
    })

    const result = await makeResolverWrapped('run-resolver-1').execute({
      action: 'add_piece',
      query: 'Dance Floor, please.',
    })

    expect(mocks.recordFailure).toHaveBeenCalledWith(
      { admin: true },
      expect.objectContaining({
        sessionId: 'workflow-1',
        toolName: 'prepare_trade_board_work',
        runId: 'run-resolver-1',
      }),
    )
    expect(result).toMatchObject({ ok: false, errorTier: 'escalate' })
    expect(String(result.message)).toContain('catalog check failed')
  })

  it('does not duplicate the operator report for a replayed terminal run', async () => {
    mocks.recordFailure.mockResolvedValue({
      workflowId: 'workflow-1',
      failureCount: 2,
      workflowStatusAfter: 'needs_human_review',
      newlyEscalated: false,
      sameRunReplay: true,
    })

    await makeWrapped('run-2').execute({ mode: 'single', itemNumber: 'ER59000' })
    expect(mocks.createSupportReport).not.toHaveBeenCalled()
  })
})
