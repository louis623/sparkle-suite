import { describe, expect, it } from 'vitest'
import { evaluateNicNacRunThresholds } from '@/lib/nic-nac/run-thresholds'

describe('Nic-Nac run thresholds', () => {
  it('does not recommend rollover for a small fast run', () => {
    const result = evaluateNicNacRunThresholds({
      latencyMs: 1_200,
      inputTokens: 1_327,
      totalTokens: 1_341,
      estimatedContextTokens: 33,
      contextCompacted: false,
      droppedMessageCount: 0,
    })

    expect(result).toEqual({
      rolloverRecommended: false,
      reasons: [],
    })
  })

  it('recommends rollover when a run crosses context and token thresholds', () => {
    const result = evaluateNicNacRunThresholds({
      latencyMs: 12_000,
      inputTokens: 85_000,
      totalTokens: 91_000,
      estimatedContextTokens: 21_000,
      contextCompacted: true,
      droppedMessageCount: 40,
    })

    expect(result.rolloverRecommended).toBe(true)
    expect(result.reasons).toEqual([
      'high_input_tokens',
      'high_total_tokens',
      'context_compacted',
      'high_estimated_context',
    ])
  })

  it('records latency as a baseline without rolling a healthy context over', () => {
    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 45_000,
        inputTokens: 2_000,
        totalTokens: 2_200,
        estimatedContextTokens: 2_000,
        contextCompacted: false,
        droppedMessageCount: 0,
      }),
    ).toEqual({
      rolloverRecommended: false,
      reasons: [],
    })
  })

  it('recommends rollover when context compaction drops even one message', () => {
    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 1_000,
        inputTokens: 2_000,
        totalTokens: 2_100,
        estimatedContextTokens: 2_000,
        contextCompacted: true,
        droppedMessageCount: 1,
      }),
    ).toEqual({
      rolloverRecommended: true,
      reasons: ['context_compacted'],
    })
  })

  it('does not roll a short chat over when the provider count includes the standing prompt', () => {
    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 4_000,
        inputTokens: 2_500,
        totalTokens: 2_700,
        estimatedContextTokens: 2_500,
        contextCompacted: false,
        droppedMessageCount: 0,
      }),
    ).toEqual({
      rolloverRecommended: false,
      reasons: [],
    })

    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 4_000,
        inputTokens: 85_000,
        totalTokens: 91_000,
        estimatedContextTokens: 2_500,
        contextCompacted: false,
        droppedMessageCount: 0,
      }).reasons,
    ).not.toContain('high_input_tokens')
  })

  it('treats the estimated context token threshold as an exact boundary', () => {
    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 1_000,
        estimatedContextTokens: 19_999,
        contextCompacted: false,
        droppedMessageCount: 0,
      }).reasons,
    ).not.toContain('high_estimated_context')

    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 1_000,
        estimatedContextTokens: 20_000,
        contextCompacted: false,
        droppedMessageCount: 0,
      }).reasons,
    ).toContain('high_estimated_context')
  })
})
