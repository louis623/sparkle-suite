'use client'

import { useEffect, useRef, useState } from 'react'
import type { CommunityCarouselThemeId } from '@/lib/sparkle-suite/community-theme-site-preview'
import { prepareMarketingPreview } from '@/lib/sparkle-suite/prepare-marketing-preview'
import styles from './community-theme-site-peek.module.css'

const documents = new Map<string, string>()

function motionPaused() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return reduce || connection?.saveData === true || document.hidden
}

export function CommunityThemeSitePeek({
  theme,
  title,
  active,
}: {
  theme: CommunityCarouselThemeId
  title: string
  active: boolean
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState<string | null>(() => documents.get(theme) ?? null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!active) return
    const cached = documents.get(theme)
    if (cached) {
      setHtml(cached)
      return
    }
    const controller = new AbortController()
    prepareMarketingPreview('/api/public/community-theme-preview?theme=' + encodeURIComponent(theme), controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          result.dispose()
          return
        }
        documents.set(theme, result.html)
        result.dispose()
        setHtml(result.html)
        setFailed(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [active, theme])

  useEffect(() => {
    if (!html) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => frame.current?.contentWindow?.postMessage({
      type: 'sparkle-marketing-motion',
      paused: !active || motionPaused(),
    }, '*')
    sync()
    document.addEventListener('visibilitychange', sync)
    reduce.addEventListener('change', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      reduce.removeEventListener('change', sync)
    }
  }, [active, html, ready])

  useEffect(() => {
    if (!active || ready) return
    const timer = window.setTimeout(() => setFailed(true), 20000)
    function receive(event: MessageEvent) {
      const source = frame.current?.contentWindow
      if (!source || event.source !== source || event.data?.type !== 'sparkle-landing-ready' || event.data.theme !== theme) return
      window.clearTimeout(timer)
      setReady(true)
      setFailed(false)
    }
    window.addEventListener('message', receive)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('message', receive)
    }
  }, [active, ready, theme])

  return (
    <div className={styles.peek} data-community-theme={theme} data-ready={ready ? 'true' : 'false'}>
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.bar} />
        <div className={styles.line} />
        <div className={styles.line} />
        <div className={styles.hero} />
      </div>
      {html ? (
        <iframe
          ref={frame}
          className={`${styles.frame} ${ready ? styles.ready : styles.loading}`}
          title={`${title} customer website preview`}
          srcDoc={html}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          tabIndex={-1}
        />
      ) : null}
      {failed && !ready ? <p className={styles.status} role="status">{title} preview is still opening. Use Preview this look.</p> : null}
    </div>
  )
}
