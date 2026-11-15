'use client'
import { useEffect, useRef } from 'react'
import styles from './dance-floor.module.css'
export function NeedsYouStrip({ requests, followUps, photos, status, onRetry }: {
  requests?: number; followUps?: number; photos?: number; status: 'loading' | 'ready' | 'error'; onRetry: () => void
}) {
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const target = strip.current
    if (!target) return
    const parent = target.parentElement
    const measure = () => parent?.style.setProperty('--dance-floor-strip-height', `${target.getBoundingClientRect().height}px`)
    const observer = new ResizeObserver(measure)
    observer.observe(target); measure()
    return () => observer.disconnect()
  }, [status, requests, followUps, photos])
  if (status === 'ready' && requests === 0 && followUps === 0 && photos === 0)
    return <div id="needs-you" className={styles.empty}><strong>You're all caught up.</strong><p>No new requests, follow-ups, or missing photos.</p></div>
  const tiles = [
    { count: requests, label: 'New swap requests', sub: `${requests ?? 0} waiting`, cue: 'Review requests', href: '#requests' },
    { count: followUps, label: 'Follow-ups to finish', sub: `${followUps ?? 0} to finish`, cue: 'Finish follow-ups', href: '#follow-ups' },
    { count: photos, label: 'Photos to fix', sub: `${photos ?? 0} need a photo`, cue: 'Fix photos', href: '#floor' },
  ]
  return <div ref={strip} id="needs-you" className={styles.strip}>
    <div className={styles.kicker}>{status === 'loading' ? 'Checking your Dance Floor…' : status === 'error' ? <>Couldn't refresh this list. <button type="button" className={styles.linkButton} onClick={onRetry}>Try again</button></> : 'Needs you first'}</div>
    <div className={styles.tiles}>{tiles.map(tile => {
      const content = <><strong className={styles.count}>{status === 'loading' ? '–' : tile.count ?? '–'}</strong><span><b>{tile.label}</b><small>{tile.sub}</small></span><span className={styles.cue}>{tile.cue}</span></>
      return tile.count && status !== 'loading' ? <a key={tile.href} href={tile.href} className={styles.hotTile} onClick={event => {
        const target = document.getElementById(tile.href.slice(1))
        if (!target) return
        event.preventDefault()
        target.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      }}>{content}</a> : <div key={tile.href} className={styles.tile} aria-disabled="true">{content}</div>
    })}</div>
  </div>
}
