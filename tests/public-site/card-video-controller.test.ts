import { it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

function runtime() {
  const window: Record<string, any> = {}
  runInNewContext(readFileSync('public/amethyst/hosted-video.js', 'utf8'), { window })
  return window.SparkleCardVideo
}
class Media extends EventTarget {
  paused = true
  muted = false
  autoplay = true
  preload = 'auto'
  src = ''
  currentTime = 0
  play = vi.fn(async () => { this.paused = false; this.dispatchEvent(new Event('play')) })
  pause = vi.fn(() => {
    const changed = !this.paused
    this.paused = true
    if (changed) this.dispatchEvent(new Event('pause'))
  })
}

it('tiktok player controller: only explicit Play loads media; hover and touch movement never play', async () => {
  const api = runtime(), document = { defaultView: {} }
  const controller = api.getController(document)
  expect(api.getController(document)).toBe(controller)
  const video = new Media(), handle = controller.register(video, '/first.mp4')
  for (const event of ['mouseenter', 'pointerenter', 'pointermove', 'touchstart', 'touchmove']) video.dispatchEvent(new Event(event))
  expect(video.play).not.toHaveBeenCalled()
  expect(video.src).toBe('')
  expect(video.preload).toBe('none')
  expect(video.autoplay).toBe(false)
  await handle.play()
  expect(video.src).toBe('/first.mp4')
  expect(video.muted).toBe(false)
  expect(video.play).toHaveBeenCalledTimes(1)
})

it('tiktok player controller: starting another pauses the first and preserves its resume position', async () => {
  const controller = runtime().createController()
  const first = new Media(), second = new Media()
  const a = controller.register(first, '/a.mp4'), b = controller.register(second, '/b.mp4')
  await a.toggle()
  first.currentTime = 23
  await b.toggle()
  expect(first.paused).toBe(true)
  expect(second.paused).toBe(false)
  expect(a.state().playing).toBe(false)
  expect(b.state().playing).toBe(true)
  await a.toggle()
  expect(second.paused).toBe(true)
  expect(first.currentTime).toBe(23)
  a.toggle()
  expect(first.paused).toBe(true)
})

it('tiktok player controller: mute persists across cards and remounts until sound is enabled', async () => {
  const controller = runtime().createController()
  const first = new Media(), second = new Media()
  const a = controller.register(first, '/a.mp4'), b = controller.register(second, '/b.mp4')
  await a.play()
  a.toggleSound()
  await b.play()
  expect(first.muted).toBe(true)
  expect(second.muted).toBe(true)
  expect(a.state().muted).toBe(true)
  a.dispose()
  const third = new Media(), c = controller.register(third, '/c.mp4')
  await c.play()
  expect(third.muted).toBe(true)
  await c.toggleSound()
  expect(third.muted).toBe(false)
  expect(second.muted).toBe(false)
  expect(b.state().muted).toBe(false)
  c.pause()
  const plays = third.play.mock.calls.length
  c.toggleSound()
  expect(third.play).toHaveBeenCalledTimes(plays)
})

it('tiktok player controller: blocked sound retries muted and persists the fallback for later videos', async () => {
  const controller = runtime().createController()
  const first = new Media(), second = new Media()
  first.play.mockRejectedValueOnce(Object.assign(new Error('Sound blocked'), { name: 'NotAllowedError' }))
  const a = controller.register(first, '/a.mp4'), b = controller.register(second, '/b.mp4')
  await a.play()
  expect(first.play).toHaveBeenCalledTimes(2)
  expect(first.paused).toBe(false)
  expect(first.muted).toBe(true)
  expect(a.state()).toMatchObject({ playing: true, muted: true })
  await b.play()
  expect(second.muted).toBe(true)
  expect(first.paused).toBe(true)
})

it('tiktok player controller: fully offscreen pauses and returning into view never resumes', async () => {
  let intersection: (entries: any[]) => void = () => {}
  class Observer {
    constructor(callback: typeof intersection) { intersection = callback }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const controller = runtime().createController({ IntersectionObserver: Observer })
  const video = new Media(), handle = controller.register(video, '/a.mp4')
  intersection([{ target: video, isIntersecting: true, intersectionRatio: 1 }])
  expect(video.src).toBe('')
  expect(video.play).not.toHaveBeenCalled()
  await handle.play()
  video.currentTime = 17
  intersection([{ target: video, isIntersecting: true, intersectionRatio: 0.01 }])
  expect(video.paused).toBe(false)
  intersection([{ target: video, isIntersecting: false, intersectionRatio: 0 }])
  expect(video.paused).toBe(true)
  intersection([{ target: video, isIntersecting: true, intersectionRatio: 1 }])
  expect(video.paused).toBe(true)
  expect(video.currentTime).toBe(17)
  expect(video.play).toHaveBeenCalledTimes(1)
})

it('tiktok player controller: a late play cannot restart a paused or superseded card', async () => {
  const controller = runtime().createController()
  const first = new Media(), second = new Media()
  let finish: () => void = () => {}
  first.play.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
  const a = controller.register(first, '/a.mp4'), b = controller.register(second, '/b.mp4')
  const pending = a.play()
  a.pause()
  await b.play()
  first.paused = false
  first.dispatchEvent(new Event('play'))
  finish()
  await pending
  expect(first.paused).toBe(true)
  expect(second.paused).toBe(false)
  expect(a.state().playing).toBe(false)
  expect(b.state().playing).toBe(true)
})
