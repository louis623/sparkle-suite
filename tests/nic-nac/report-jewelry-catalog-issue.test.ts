import { beforeEach, describe, expect, it, vi } from 'vitest'

const reportJewelryCatalogIssueMock = vi.fn()

vi.mock('@/lib/services/jewelry-catalog-corrections', () => ({
  reportJewelryCatalogIssue: (...args: unknown[]) =>
    reportJewelryCatalogIssueMock(...args),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ __isAdmin: true }),
}))

import { reportJewelryCatalogIssueTool } from '@/lib/nic-nac/tools/report-jewelry-catalog-issue'

interface ToolDef {
  description?: string
  needsApproval?: boolean
  execute: (input: unknown) => Promise<Record<string, unknown>>
}

function activeCatalogWorkflow() {
  return {
    id: 'workflow-catalog-1',
    repId: 'rep-1',
    conversationId: 'conversation-1',
    workflowType: 'trade_catalog_correction',
    status: 'active',
    phase: 'ready_to_report',
    intent: 'report_catalog_issue',
    knownFields: {
      itemNumber: 'ER13229',
      catalogIssueType: 'bad_photo',
    },
    missingFields: [],
    blockers: [],
    candidates: [],
    approvalState: 'required',
  } as const
}

function makeTool(
  activeTradeWorkflow: ReturnType<typeof activeCatalogWorkflow> | null = null,
): ToolDef {
  return reportJewelryCatalogIssueTool.build({
    repId: 'rep-1',
    conversationId: 'conversation-1',
    runId: 'run-1',
    supabase: {} as never,
    activeTradeWorkflow,
  }) as unknown as ToolDef
}

beforeEach(() => {
  reportJewelryCatalogIssueMock.mockReset()
})

describe('report_jewelry_catalog_issue', () => {
  it('passes admin client plus authenticated rep and conversation context to the service', async () => {
    reportJewelryCatalogIssueMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'RG100',
      changedFields: ['collectionName'],
      issueLogged: true,
      corrected: true,
    })

    const tool = makeTool()
    const result = await tool.execute({
      itemNumber: 'RG100',
      issueType: 'wrong_collection',
      reason: 'This is listed under the wrong collection.',
      correction: {
        collectionName: 'March Birthday',
        collectionYear: 2026,
        searchTags: ['rose gold', 'heart'],
        modelInventedDeleteFlag: 'please delete the duplicate',
      },
    })

    expect(result).toMatchObject({
      designId: 'design-1',
      corrected: true,
    })
    expect(reportJewelryCatalogIssueMock).toHaveBeenCalledWith(
      { __isAdmin: true },
      {
        itemNumber: 'RG100',
        repId: 'rep-1',
        conversationId: 'conversation-1',
        issueType: 'wrong_collection',
        reason: 'This is listed under the wrong collection.',
        correction: {
          collectionName: 'March Birthday',
          collectionYear: 2026,
          searchTags: ['rose gold', 'heart'],
        },
      },
    )
  })

  it('can send an approved canonical photo replacement for a bad catalog photo', async () => {
    reportJewelryCatalogIssueMock.mockResolvedValueOnce({
      designId: 'design-er34579',
      itemNumber: 'ER34579',
      changedFields: ['canonicalPhotoUrl'],
      issueLogged: true,
      corrected: true,
    })

    const tool = makeTool()
    const result = await tool.execute({
      itemNumber: 'ER34579',
      issueType: 'bad_photo',
      reason: 'The current catalog photo is the item label/details photo.',
      correction: {
        canonicalPhotoUrl:
          'https://example.com/storage/v1/object/public/jewelry-photos/approved/design-er34579/front.png',
      },
    })

    expect(result).toMatchObject({
      designId: 'design-er34579',
      corrected: true,
    })
    expect(reportJewelryCatalogIssueMock).toHaveBeenCalledWith(
      { __isAdmin: true },
      expect.objectContaining({
        itemNumber: 'ER34579',
        repId: 'rep-1',
        conversationId: 'conversation-1',
        issueType: 'bad_photo',
        correction: {
          canonicalPhotoUrl:
            'https://example.com/storage/v1/object/public/jewelry-photos/approved/design-er34579/front.png',
        },
      }),
    )
  })

  it('drops stray catalog photo URLs from non-photo corrections', async () => {
    reportJewelryCatalogIssueMock.mockResolvedValueOnce({
      designId: 'design-1',
      itemNumber: 'ER13229',
      changedFields: ['material'],
      issueLogged: true,
      corrected: true,
    })

    const tool = makeTool()
    await tool.execute({
      itemNumber: 'ER13229',
      issueType: 'wrong_material',
      reason: 'The shared catalog material is wrong.',
      correction: {
        material: 'Silver',
        bpMsrp: 54,
        canonicalPhotoUrl:
          'https://static.example.invalid/sparkle-suite/current-catalog-photo.png',
      },
    })

    expect(reportJewelryCatalogIssueMock).toHaveBeenCalledWith(
      { __isAdmin: true },
      expect.objectContaining({
        issueType: 'wrong_material',
        correction: {
          material: 'Silver',
        },
      }),
    )
  })

  it('is registered as a write tool', () => {
    expect(reportJewelryCatalogIssueTool.name).toBe('report_jewelry_catalog_issue')
    expect(reportJewelryCatalogIssueTool.readOnly).toBe(false)
  })

  it('rejects catalog corrections that point at a different item than the active workflow', async () => {
    const tool = makeTool(activeCatalogWorkflow())

    await expect(
      tool.execute({
        itemNumber: 'NK99999',
        issueType: 'bad_photo',
        reason: 'Wrong photo.',
      }),
    ).rejects.toMatchObject({
      name: 'NicNacToolError',
      code: 'WORKFLOW_TARGET_MISMATCH',
    })

    expect(reportJewelryCatalogIssueMock).not.toHaveBeenCalled()
  })

  it('tells Nic-Nac to replace bad catalog photos only with approved jewelry-front photos', () => {
    const tool = makeTool()

    expect(tool.needsApproval).toBe(true)
    expect(tool.description).toContain('approved jewelry-front')
    expect(tool.description).toContain('label/details')
    expect(tool.description).toContain('canonical catalog photo')
    expect(tool.description).toContain('Requires explicit user approval')
  })
})
