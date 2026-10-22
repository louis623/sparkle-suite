import { build } from 'esbuild'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  asksToConfirmSave,
  lastVisibleAssistantId,
  retireLastConfirmationLine,
  retireSupersededPreviews,
} from '@/lib/nic-nac/conversation-display'
import { MOVED_ON_MESSAGE } from '@/lib/nic-nac/piece-task'

describe('browser-safe conversation display', () => {
  it('bundles for a browser without server-only or native image dependencies', async () => {
    const result = await build({
      entryPoints: [resolve('lib/nic-nac/conversation-display.ts')],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      write: false,
      metafile: true,
    })
    expect(Object.keys(result.metafile!.inputs).join('\n')).not.toMatch(/server-only|sharp|trade-board-intake-context|label-item-number/)
    expect(result.outputFiles[0].text).toContain('lastVisibleAssistantId')
  })

  it('retires only the final save question without changing stored history', () => {
    const text = 'NK11312 is already on your Dance Floor. Is this the right piece to save?'
    const stored = [
      { id: 'old', role: 'assistant', parts: [{ type: 'text', text: 'Reply yes to save.' }] },
      { id: 'preview', role: 'assistant', parts: [{ type: 'text', text }] },
      { id: 'internal', role: 'assistant', parts: [{ type: 'reasoning', text: 'internal' }] },
    ]
    const snapshot = structuredClone(stored)
    expect(asksToConfirmSave(text)).toBe(true)
    expect(lastVisibleAssistantId(stored)).toBe('preview')
    expect(retireLastConfirmationLine(text)).toBe(MOVED_ON_MESSAGE)
    const displayed = retireSupersededPreviews(stored)
    expect(displayed[0]).toBe(stored[0])
    expect(displayed[1].parts[0].text).toBe(retireLastConfirmationLine(text))
    expect(stored).toEqual(snapshot)
  })

  it('recognizes a preview-only assistant turn without exposing reasoning', () => {
    expect(lastVisibleAssistantId([
      { id: 'preview', role: 'assistant', parts: [{ type: 'tool-add_listing', output: { needsAction: 'confirm_main_photo' } }] },
      { id: 'reasoning', role: 'assistant', parts: [{ type: 'reasoning', text: 'private' }] },
    ])).toBe('preview')
  })
})
