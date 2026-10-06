'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './lineup-demonstration.module.css'
import { prepareMarketingPreview } from '@/lib/sparkle-suite/prepare-marketing-preview'
export function LineupDemonstration() {
  const [opened, setOpened] = useState(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    if (!opened) return
    const controller = new AbortController()
    let dispose: (() => void) | undefined
    prepareMarketingPreview('/api/public/landing-lineup-preview', controller.signal)
      .then(result => {if (controller.signal.aborted) {result.dispose();return};dispose=result.dispose;setHtml(result.html)})
      .catch(() => {if (!controller.signal.aborted) {setOpened(false);setFailed(true)}})
    return () => {controller.abort();dispose?.()}
  }, [opened])
  useEffect(() => {
    if (!opened) return
    const timer = window.setTimeout(() => { setOpened(false); setFailed(true) }, 15000)
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'sparkle-landing-ready') return
      window.clearTimeout(timer); setReady(true)
    }
    window.addEventListener('message', receive)
    return () => { window.clearTimeout(timer); window.removeEventListener('message', receive) }
  }, [opened])
  return <div className={styles.demo}>
    <div className={styles.caption}><span>Customer-site view</span><span>Sample lineup</span></div>
    <div className={styles.stage}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marketing/live-lineup-preview.webp" alt="Customer site with announcement ticker, Dance Floor ticker and Live Lineup. Select View full lineup to see the complete list." width={760} height={460} loading="lazy" />
      {opened && html ? <iframe ref={frame} srcDoc={html} title="Try the sample Live Lineup"
        sandbox="allow-scripts" referrerPolicy="no-referrer" className={ready ? styles.ready : styles.loading}
        tabIndex={ready ? 0 : -1} aria-hidden={!ready} /> : null}
      {!ready ? <button type="button" className={styles.start} disabled={opened} onClick={() => {setOpened(true);setFailed(false)}}>
        {opened ? 'Opening sample…' : failed ? 'Try the sample again' : 'Try the Live Lineup'} <span aria-hidden="true">↗</span>
      </button> : null}
    </div>
    <p role="status">{ready ? 'Tap a name or “View full lineup” in the preview above.' : failed ? 'The sample could not load. Please try again.' : 'From the ticker to the full lineup, without leaving the site.'}</p>
  </div>
}
