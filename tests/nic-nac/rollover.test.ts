import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import {
  buildNicNacRolloverMessages,
  shouldStartNicNacRollover,
} from '@/lib/nic-nac/rollover'

function message(id: string, role: 'user' | 'assistant'): UIMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text: id }],
  }
}

describe('Nic-Nac conversation rollover', () => {
  it('carries only the recent conversation tail into a fresh conversation', () => {
    const messages = Array.from({ length: 20 }, (_, index) =>
      message(`m${index}`, index % 2 === 0 ? 'user' : 'assistant'),
    )

    const rolled = buildNicNacRolloverMessages(messages, 6)

    expect(rolled).toHaveLength(6)
    expect(rolled.map((m) => m.parts)).toEqual(
      messages.slice(-6).map((m) => m.parts),
    )
    expect(rolled.map((m) => m.id)).toEqual([
      'rollover-0-m14',
      'rollover-1-m15',
      'rollover-2-m16',
      'rollover-3-m17',
      'rollover-4-m18',
      'rollover-5-m19',
    ])
  })

  it('starts rollover only when run health explicitly recommends it', () => {
    expect(shouldStartNicNacRollover(null)).toBe(false)
    expect(shouldStartNicNacRollover({ rolloverRecommended: false })).toBe(false)
    expect(
      shouldStartNicNacRollover({
        rolloverRecommended: true,
        rolloverReasons: ['context_compacted'],
      }),
    ).toBe(true)
  })

  it('does not roll over latency-only or reasonless historical health rows', () => {
    expect(shouldStartNicNacRollover({ rolloverRecommended: true })).toBe(false)
    expect(
      shouldStartNicNacRollover({
        rolloverRecommended: true,
        rolloverReasons: ['slow_response'],
      }),
    ).toBe(false)
  })

  it('keeps generated rollover ids bounded across repeated rollovers', () => {
    let messages = Array.from({ length: 12 }, (_, index) =>
      message(`m${index}`, index % 2 === 0 ? 'user' : 'assistant'),
    )

    for (let index = 0; index < 80; index++) {
      messages = buildNicNacRolloverMessages(messages)
    }

    expect(new Set(messages.map((m) => m.id)).size).toBe(messages.length)
    expect(Math.max(...messages.map((m) => m.id.length))).toBeLessThanOrEqual(80)
  })

  it('does not carry photo files into the new conversation', () => {
    const messages: UIMessage[] = [
      {
        id: 'old-photo',
        role: 'user',
        parts: [
          { type: 'text', text: 'Earlier piece' },
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,T0xE',
          },
        ],
      },
      {
        id: 'photo-only',
        role: 'user',
        parts: [
          {
            type: 'file',
            mediaType: 'image/jpeg',
            url: 'data:image/jpeg;base64,TEFCRUw=',
          },
        ],
      },
      message('kept', 'assistant'),
    ]

    const rolled = buildNicNacRolloverMessages(messages, 6)
    const serialized = JSON.stringify(rolled)

    expect(serialized).not.toContain('data:image/jpeg')
    expect(serialized).not.toContain('TEFCRUw')
    expect(rolled[0]?.parts).toEqual([{ type: 'text', text: 'Earlier piece' }])
    expect(rolled[1]?.parts?.[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('not brought over'),
    })
    expect(rolled[2]?.parts).toEqual([{ type: 'text', text: 'kept' }])
  })
})
