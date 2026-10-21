import { describe, expect, it } from 'vitest'
import type { UIMessage } from 'ai'
import { evaluateNicNacRunThresholds } from '@/lib/nic-nac/run-thresholds'
import {
  buildNicNacRolloverMessages,
  LOST_PHOTO_NOTE,
  shouldCarryTradeBoardIntakeOnRollover,
  shouldStartNicNacRollover,
} from '@/lib/nic-nac/rollover'
import { unfinishedPieceQuestion } from '@/lib/nic-nac/piece-task'

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

  it('does not roll a normal piece over when older turns are trimmed', () => {
    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 1_000,
        inputTokens: 4_057,
        totalTokens: 4_200,
        estimatedContextTokens: 4_057,
        contextCompacted: true,
        droppedMessageCount: 4,
      }),
    ).toEqual({
      rolloverRecommended: false,
      reasons: [],
    })
  })

  it('does not treat a short chat as too many tokens', () => {
    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 2_000,
        inputTokens: 2_500,
        totalTokens: 2_700,
        estimatedContextTokens: 2_500,
        contextCompacted: false,
        droppedMessageCount: 0,
      }).rolloverRecommended,
    ).toBe(false)
    expect(
      evaluateNicNacRunThresholds({
        latencyMs: 2_000,
        inputTokens: 85_000,
        totalTokens: 91_000,
        estimatedContextTokens: 2_500,
        contextCompacted: false,
        droppedMessageCount: 0,
      }).reasons,
    ).not.toContain('high_input_tokens')
  })

  it('does not carry a pending piece that has no confirmed photo', () => {
    expect(shouldCarryTradeBoardIntakeOnRollover(null)).toBe(false)
    expect(
      shouldCarryTradeBoardIntakeOnRollover({
        status: 'active',
        metadata: {},
      }),
    ).toBe(false)
    expect(
      shouldCarryTradeBoardIntakeOnRollover({
        status: 'active',
        metadata: { mainPhotoConfirmedPhotoId: 'photo-earrings' },
      }),
    ).toBe(false)
    expect(
      shouldCarryTradeBoardIntakeOnRollover({
        status: 'needs_human_review',
        metadata: {},
      }),
    ).toBe(false)

    const rolled = buildNicNacRolloverMessages(
      [
        {
          id: 'pending',
          role: 'assistant',
          parts: [
            {
              type: 'tool-add_listing',
              output: {
                needsAction: 'confirm_main_photo',
                previewPhotoId: 'photo-ring',
                message: 'This is the main photo I will save for NK90303.',
              },
            },
          ],
        } as UIMessage,
      ],
      12,
      { dropPendingPiece: true },
    )
    expect(JSON.stringify(rolled)).not.toContain('photo-ring')
    expect(JSON.stringify(rolled)).not.toContain('confirm_main_photo')
    expect(JSON.stringify(rolled)).not.toContain('main photo I will save')
    expect(JSON.stringify(rolled)).toContain(LOST_PHOTO_NOTE)

    const asked = buildNicNacRolloverMessages(
      [
        {
          id: 'old-photo',
          role: 'user',
          parts: [
            { type: 'text', text: 'NK91303' },
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,T0xE',
            },
          ],
        } as UIMessage,
      ],
      12,
      { dropPendingPiece: true, unfinishedItemNumber: 'NK91303' },
    )
    expect(asked[0]?.parts).toEqual([{ type: 'text', text: 'NK91303' }])
    expect(asked.at(-1)?.id).toBe('rollover-finish-ask')
    expect(asked.at(-1)?.parts).toEqual([
      { type: 'text', text: unfinishedPieceQuestion('NK91303') },
    ])
    expect(JSON.stringify(asked)).not.toContain('data:image')
    expect(JSON.stringify(asked)).toContain('Want to finish NK91303?')

    const claimed = buildNicNacRolloverMessages(
      [
        {
          id: 'claimed-photo',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'I have the photo. This is the main photo I will save for ER94204.',
            },
          ],
        } as UIMessage,
        {
          id: 'old-photo',
          role: 'user',
          parts: [
            {
              type: 'file',
              mediaType: 'image/jpeg',
              url: 'data:image/jpeg;base64,T0xE',
            },
          ],
        } as UIMessage,
      ],
      12,
      { dropPendingPiece: true, unfinishedItemNumber: 'ER94204' },
    )
    const claimedText = JSON.stringify(claimed)
    expect(claimedText).not.toContain('I have the photo')
    expect(claimedText).not.toContain('main photo I will save')
    expect(claimedText).not.toContain('data:image')
    expect(claimedText).toContain(LOST_PHOTO_NOTE)
    expect(claimed.at(-1)?.parts).toEqual([
      { type: 'text', text: 'Want to finish ER94204?' },
    ])
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
