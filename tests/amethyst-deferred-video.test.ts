import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { transformSync } from 'esbuild'
import { expect, it, vi } from 'vitest'

it('keeps offscreen social players unloaded, then preserves their URL and controls near the viewport', () => {
  const source = readFileSync('public/amethyst/homepage.jsx', 'utf8')
  const component = source.slice(source.indexOf('function DeferredVideoFrame('), source.indexOf('function TikTokEmbed('))
  let visible = false, intersect: (entries: unknown[]) => void = () => {}
  const effects: (() => void)[] = [], disconnect = vi.fn(), ref = { current: {} }
  const context: any = {
    useRef: () => ref,
    useState: () => [visible, (value: boolean) => { visible = value }],
    useEffect: (effect: () => void) => effects.push(effect),
    IntersectionObserver: class { constructor(callback: typeof intersect, options: unknown) { intersect = callback; expect(options).toEqual({ rootMargin: '200px' }) } observe() {} disconnect = disconnect },
    React: { createElement: (tag: string, props: unknown) => ({ tag, props }) },
  }
  runInNewContext(transformSync(component, { loader: 'jsx' }).code, context)
  const props = { frameRef: ref, src: 'https://www.tiktok.com/player/v1/123?muted=0', title: 'Rep video', allow: 'autoplay; fullscreen' }
  expect(context.DeferredVideoFrame(props).props.src).toBeUndefined()
  effects.shift()!()
  intersect([{ isIntersecting: false }]); expect(visible).toBe(false)
  intersect([{ isIntersecting: true }]); expect(disconnect).toHaveBeenCalledOnce()
  expect(context.DeferredVideoFrame(props).props).toMatchObject({ src: props.src, title: props.title, allow: props.allow, ref })
  expect(source).toContain('<DeferredVideoFrame\n        frameRef={frameRef}')
})
