import { describe, expect, it } from 'vitest'

import packageJson from '@/package.json'
import {
  TRADE_BOARD_PRESSURE_SMOKE_STEPS,
  runTradeBoardPressureSmoke,
  summarizePressureStep,
} from '@/scripts/smoke-nic-nac-trade-board-pressure'

describe('Nic-Nac Dance Floor pressure smoke script', () => {
  it('is registered as an explicit smoke command', () => {
    expect(packageJson.scripts['smoke:nic-nac:trade-board-pressure']).toBe(
      'tsx --conditions=react-server scripts/smoke-nic-nac-trade-board-pressure.ts',
    )
  })

  it('covers the deployed Dance Floor workflow family in order', () => {
    expect(TRADE_BOARD_PRESSURE_SMOKE_STEPS.map((step) => step.name)).toEqual([
      'trade-board-intake',
      'trade-board-non-item-number',
      'remove-listing',
      'trade-request-decisions',
      'fulfillment-update',
      'live-swap',
      'swap-cleanup',
      'catalog-correction',
    ])
  })

  it('summarizes smoke results without copying full transcripts', () => {
    expect(
      summarizePressureStep({
        name: 'catalog-correction',
        durationMs: 1234,
        result: {
          ok: true,
          status: 'passed',
          message: 'done',
          appUrl: 'https://www.yoursparklesuite.com',
          conversationId: 'conversation-1',
          runTag: 'tag-1',
          turns: [{ assistantText: 'large transcript' }, { assistantText: 'more' }],
          cleanup: { deletedRows: { trade_listings: 1 } },
        },
      }),
    ).toEqual({
      name: 'catalog-correction',
      ok: true,
      status: 'passed',
      message: 'done',
      appUrl: 'https://www.yoursparklesuite.com',
      conversationId: 'conversation-1',
      runTag: 'tag-1',
      turnCount: 2,
      durationMs: 1234,
      cleanup: { deletedRows: { trade_listings: 1 } },
      missing: undefined,
      missingEnv: undefined,
    })
  })

  it('continues through later steps and fails the aggregate when any step fails', async () => {
    const result = await runTradeBoardPressureSmoke(
      {},
      [
        {
          name: 'trade-board-intake',
          description: 'first',
          run: async () => ({ ok: true, status: 'passed', message: 'first passed' }),
        },
        {
          name: 'catalog-correction',
          description: 'second',
          run: async () => ({ ok: false, status: 'tool_not_observed', message: 'red' }),
        },
      ],
    )

    expect(result.ok).toBe(false)
    expect(result.status).toBe('failed')
    expect(result.passed).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.steps.map((step) => step.name)).toEqual([
      'trade-board-intake',
      'catalog-correction',
    ])
  })
})
