'use client'

import { useEffect, useRef, useState } from 'react'
import { QueueLink } from './queue-link'
import type { CSSProperties } from 'react'
import type { LandingDemo } from '@/lib/sparkle-suite/landing-demo-model'
import styles from './landing-hero.module.css'
import { prepareMarketingPreview } from '@/lib/sparkle-suite/prepare-marketing-preview'

export function LandingHero({ demo }: { demo: LandingDemo | null }) {
  const [selected, setSelected] = useState(demo?.theme || '')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<'poster' | 'loading' | 'ready' | 'error'>('poster')
  const frame = useRef<HTMLIFrameElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const autoStarted = useRef(false)
  const visiblePreview = useRef(false)
  const pausedPreview = useRef(false)
  const [paused, setPaused] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const active = state === 'loading' || state === 'ready'
  const selectedLabel = selected === demo?.theme ? demo.themeLabel : demo?.themes.find(theme => theme.id === selected)?.label

  // Paint the small poster first. Only enhance the visible hero after the page settles.
  useEffect(() => {
    if (!demo || !preview.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    let visible = false
    let settled = false
    function start() {
      if (!visible || !settled || autoStarted.current || reduce.matches || connection?.saveData) return
      autoStarted.current = true
      setState('loading')
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .5
      visiblePreview.current = visible
      start()
      frame.current?.contentWindow?.postMessage({type:'sparkle-marketing-motion', paused:!visible || pausedPreview.current || reduce.matches || document.hidden}, '*')
    }, { threshold: .5 })
    observer.observe(preview.current)
    const timer = window.setTimeout(() => { settled = true; start() }, 2500)
    return () => { observer.disconnect(); window.clearTimeout(timer) }
  }, [demo])

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    let dispose: (() => void) | undefined
    prepareMarketingPreview('/api/public/landing-demo/preview?theme=' + encodeURIComponent(selected), controller.signal)
      .then(result => { if (controller.signal.aborted) {result.dispose();return}; dispose = result.dispose; setPreviewHtml(result.html) })
      .catch(() => { if (!controller.signal.aborted) setState('error') })
    return () => {controller.abort();dispose?.()}
  }, [active, selected, attempt])

  useEffect(() => {
    pausedPreview.current = paused
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => frame.current?.contentWindow?.postMessage({
      type:'sparkle-marketing-motion', paused:paused || !visiblePreview.current || document.hidden || reduce.matches,
    }, '*')
    sync()
    document.addEventListener('visibilitychange', sync)
    reduce.addEventListener('change', sync)
    return () => { document.removeEventListener('visibilitychange', sync); reduce.removeEventListener('change', sync) }
  }, [paused, state])

  useEffect(() => {
    if (state !== 'loading') return
    const timer = window.setTimeout(() => setState('error'), 12000)
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'sparkle-landing-ready' || event.data.theme !== selected) return
      window.clearTimeout(timer)
      setState('ready')
    }
    window.addEventListener('message', receive)
    return () => { window.clearTimeout(timer); window.removeEventListener('message', receive) }
  }, [state, selected, attempt])

  function explore(theme = selected) {
    autoStarted.current = true
    setPreviewHtml(null)
    setPaused(false)
    setSelected(theme)
    setAttempt(value => value + 1)
    setState('loading')
  }

  const poster = demo ? '/marketing/demo-themes/' + selected : '/marketing/demo-poster'
  return <>
  <link rel="preload" as="image" href={poster + '-mobile.webp'} media="(max-width: 760px)" fetchPriority="high" />
  <link rel="preload" as="image" href={poster + '.webp'} media="(min-width: 761px)" fetchPriority="high" />
  <section className={styles.hero} id="main-content" aria-labelledby="landing-title">
    <div className={styles.layout}>
      <div className={styles.intro}>
        <h1 id="landing-title">Your brand.<br />Your show.<br /><span>A setup that <em>shines.</em></span></h1>
        <p>A polished website for your live-selling business. Give shoppers one place to find your next show, follow your Live Lineup, and explore your Dance Floor.</p>
      </div>
      <div className={styles.preview} ref={preview}>
        <figure className={styles.window}>
          <figcaption className={styles.bar}><span aria-hidden="true" className={styles.dots}>● ● ●</span><span>{demo?.businessName || 'Website preview'}</span><span className={styles.readOnly}>Preview</span></figcaption>
          <div className={styles.stage}>
            <picture>
              <source media="(max-width: 760px)" srcSet={demo ? '/marketing/demo-themes/' + selected + '-mobile.webp' : '/marketing/demo-poster-mobile.webp'} />
              <img src={demo ? '/marketing/demo-themes/' + selected + '.webp' : '/marketing/demo-poster.webp'}
                alt={demo ? 'Customer website preview in the ' + selectedLabel + ' theme' : 'Sparkle Suite customer website preview'}
                width="1200" height="850" fetchPriority="high" decoding="async" />
            </picture>
            {active && previewHtml ? <iframe
              key={selected + '-' + attempt} ref={frame}
              title={'Explore the ' + selectedLabel + ' website preview'}
              srcDoc={previewHtml}
              sandbox="allow-scripts" referrerPolicy="no-referrer"
              className={state === 'ready' ? styles.ready : styles.loading}
              aria-hidden={state !== 'ready'} tabIndex={state === 'ready' ? 0 : -1}
            /> : null}
          </div>
        </figure>
        <div className={styles.previewActions}>
          {demo ? <button type="button" className={styles.explore} onClick={() => state === 'ready' ? setPaused(value => !value) : explore()} disabled={state === 'loading'}>
            {state === 'loading' ? 'Opening preview…' : state === 'ready' ? paused ? 'Play animation' : 'Pause animation' : state === 'error' ? 'Try preview again' : 'Play this preview'}
            <span aria-hidden="true">↗</span>
          </button> : <span>Interactive preview temporarily unavailable.</span>}
          {selectedLabel ? <span className={styles.themeName}>{selectedLabel}</span> : null}
        </div>
        <p className={styles.status} role="status">{state === 'error' ? 'The preview is taking a little longer. You can try again.' : state === 'ready' ? 'Read-only preview. Nothing is submitted or changed.' : '\u00a0'}</p>
        {demo && demo.themes.length > 0 ? <div className={styles.picker}>
          <p id="theme-picker-label" className={styles.pickerLabel}>Try one of our Sparkle Suite themes</p>
          <div className={styles.choices} role="group" aria-labelledby="theme-picker-label">
            {demo.themes.map(theme => <button key={theme.id} type="button" aria-pressed={selected === theme.id}
              onClick={() => explore(theme.id)} style={{ '--swatch': 'linear-gradient(120deg,' + theme.colors.join(',') + ')' } as CSSProperties}>
              <span className={styles.swatch} aria-hidden="true" /><span>{theme.label}</span>
            </button>)}
          </div>
        </div> : null}
        {demo && selected !== demo.theme ? <button className={styles.reset} type="button" onClick={() => explore(demo.theme)}>Back to the demo’s current look</button> : null}
      </div>
      <div className={styles.conversion}>
        <QueueLink className={styles.cta}>Join the build queue <span aria-hidden="true">→</span></QueueLink>
        <p className={styles.noPayment}>No payment when you join the queue</p>
        <p className={styles.promise}>Join the build queue and I’ll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid.</p>
      </div>
    </div>
  </section></>
}
