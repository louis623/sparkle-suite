'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import type { LandingDemo } from '@/lib/sparkle-suite/landing-demo-model'
import styles from './landing-hero.module.css'

const subscribeToLocation = () => () => {}
function queueLink() {
  const params = new URLSearchParams(window.location.search)
  const source = params.get('src')
  if (!source || !/^[a-z0-9_-]{1,40}$/.test(source)) return '/prelaunch#waitlist'
  const forwarded = new URLSearchParams({src:source})
  const campaign = params.get('campaign')
  if (campaign && /^[a-zA-Z0-9_-]{1,80}$/.test(campaign)) forwarded.set('campaign',campaign)
  return '/prelaunch?' + forwarded + '#waitlist'
}

export function LandingHero({ demo }: { demo: LandingDemo | null }) {
  const [selected, setSelected] = useState(demo?.theme || '')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<'poster' | 'loading' | 'ready' | 'error'>('poster')
  const queueHref = useSyncExternalStore(subscribeToLocation, queueLink, () => '/prelaunch#waitlist')
  const frame = useRef<HTMLIFrameElement>(null)
  const selectedLabel = selected === demo?.theme ? demo.themeLabel : demo?.themes.find(theme => theme.id === selected)?.label

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
        <h1 id="landing-title">Your Bomb Party show.<br /><em>Your own website.</em></h1>
        <p>Give shoppers one place to explore your Dance Floor, check your Live Lineup, and see what’s coming up.</p>
      </div>
      <div className={styles.preview}>
        <figure className={styles.window}>
          <figcaption className={styles.bar}><span aria-hidden="true" className={styles.dots}>● ● ●</span><span>{demo?.businessName || 'Website preview'}</span><span className={styles.readOnly}>Preview</span></figcaption>
          <div className={styles.stage}>
            <picture>
              <source media="(max-width: 760px)" srcSet={demo ? '/marketing/demo-themes/' + selected + '-mobile.webp' : '/marketing/demo-poster-mobile.webp'} />
              <img src={demo ? '/marketing/demo-themes/' + selected + '.webp' : '/marketing/demo-poster.webp'}
                alt={demo ? 'Customer website preview in the ' + selectedLabel + ' theme' : 'Sparkle Suite customer website preview'}
                width="1200" height="850" fetchPriority="high" decoding="async" />
            </picture>
            {state === 'loading' || state === 'ready' ? <iframe
              key={selected + '-' + attempt} ref={frame}
              title={'Explore the ' + selectedLabel + ' website preview'}
              src={'/api/public/landing-demo/preview?theme=' + encodeURIComponent(selected)}
              sandbox="allow-scripts" referrerPolicy="no-referrer"
              className={state === 'ready' ? styles.ready : styles.loading}
              aria-hidden={state !== 'ready'} tabIndex={state === 'ready' ? 0 : -1}
            /> : null}
          </div>
        </figure>
        <div className={styles.previewActions}>
          {demo ? <button type="button" className={styles.explore} onClick={() => explore()} disabled={state === 'loading'}>
            {state === 'loading' ? 'Opening preview…' : state === 'ready' ? 'Restart preview' : state === 'error' ? 'Try preview again' : 'Explore this site'}
            <span aria-hidden="true">↗</span>
          </button> : <span>Interactive preview temporarily unavailable.</span>}
          {selectedLabel ? <span className={styles.themeName}>{selectedLabel}</span> : null}
        </div>
        <p className={styles.status} role="status">{state === 'error' ? 'The preview is taking a little longer. You can try again.' : state === 'ready' ? 'Read-only preview. Nothing is submitted or changed.' : '\u00a0'}</p>
        {demo && demo.themes.length > 0 ? <details className={styles.picker}>
          <summary>Try a community theme</summary>
          <div className={styles.choices} role="group" aria-label="Community themes">
            {demo.themes.map(theme => <button key={theme.id} type="button" aria-pressed={selected === theme.id}
              onClick={() => explore(theme.id)} style={{ '--swatch': 'linear-gradient(120deg,' + theme.colors.join(',') + ')' } as CSSProperties}>
              <span className={styles.swatch} aria-hidden="true" /><span>{theme.label}</span>
            </button>)}
          </div>
        </details> : null}
        {demo && selected !== demo.theme ? <button className={styles.reset} type="button" onClick={() => explore(demo.theme)}>Back to the demo’s current look</button> : null}
      </div>
      <div className={styles.conversion}>
        <a className={styles.cta} href={queueHref}>Join the build queue <span aria-hidden="true">→</span></a>
        <p className={styles.noPayment}>No payment when you join the queue</p>
        <p className={styles.promise}>Join the build queue and I’ll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid.</p>
      </div>
    </div>
  </section></>
}
