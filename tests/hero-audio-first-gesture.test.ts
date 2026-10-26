import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, it, expect, vi } from 'vitest'

function setup() {
  const listeners = new Map<string, (e: unknown) => void>()
  const document = { addEventListener: (name: string, fn: (e: unknown) => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) }
  const window: any = {}
  runInNewContext(readFileSync('public/amethyst/hero-audio.js', 'utf8'), { document, window })
  const video = { paused: false, ended: false, muted: true, play: vi.fn().mockResolvedValue(undefined) }
  const enabled = vi.fn()
  const dispose = window.sparkleHeroAudioFallback(video, { contains: (target: unknown) => target === 'control' }, () => true, enabled)
  return { listeners, video, enabled, dispose }
}
describe('browser-blocked hero audio', () => {
  it('retries on the first non-control tap and removes both gesture listeners', async () => {
    const s = setup()
    s.listeners.get('pointerup')!({ type: 'pointerup', target: 'headline' })
    await Promise.resolve()
    expect(s.video.muted).toBe(false)
    expect(s.enabled).toHaveBeenCalledOnce()
    expect(s.listeners.size).toBe(0)
  })
  it('does not override a pause/mute control or resume a paused video', () => {
    const s = setup()
    s.listeners.get('pointerup')!({ type: 'pointerup', target: 'control' })
    s.video.paused = true
    s.listeners.get('pointerup')!({ type: 'pointerup', target: 'headline' })
    expect(s.video.play).not.toHaveBeenCalled()
    s.dispose()
    expect(s.listeners.size).toBe(0)
  })
  it('stays muted if the gesture is still rejected by the browser', async () => {
    const s = setup()
    s.video.play.mockRejectedValueOnce(new Error('blocked'))
    s.listeners.get('keydown')!({ type: 'keydown', key: 'Enter', target: 'headline' })
    await Promise.resolve()
    expect(s.video.muted).toBe(true)
    expect(s.enabled).not.toHaveBeenCalled()
  })
})
