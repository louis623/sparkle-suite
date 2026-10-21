import { describe, expect, it } from 'vitest'
import { simulateNicNacEndurance } from '../helpers/nic-nac-endurance'

describe('Nic-Nac no-cost endurance simulation', () => {
  it('keeps an 8-hour synthetic show bounded without model or provider calls', () => {
    const result = simulateNicNacEndurance({
      hours: 8,
      turnEveryMinutes: 2,
      userChars: 220,
      assistantChars: 420,
    })

    expect(result.runs).toBe(240)
    expect(result.rollovers).toEqual([])
    expect(result.maxModelMessages).toBeLessThanOrEqual(32)
    expect(result.maxEstimatedTokens).toBeLessThan(18_000)
    expect(result.finalConversationMessages).toHaveLength(result.runs * 2)
  })
})
