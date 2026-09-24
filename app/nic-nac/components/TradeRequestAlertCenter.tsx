'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TradeRequestWithListing } from '@/lib/services/types'
import { TradeScreenshotLink } from './TradeScreenshotLink'
import styles from './TradeRequestAlertCenter.module.css'

const SEEN_KEY = 'sparkle:trade-alert-seen-v1'
const AUDIO_KEY = 'sparkle:trade-alert-audio-v1'
const MAX_IDS = 200

function readIds(key: string): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(-MAX_IDS) : []
  } catch { return [] }
}

function rememberId(key: string, id: string) {
  try {
    window.localStorage.setItem(key, JSON.stringify([...readIds(key).filter((existing) => existing !== id), id].slice(-MAX_IDS)))
  } catch { /* Storage may be disabled; the in-memory UI still works. */ }
}

function playChime() {
  try {
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    void context.resume().then(() => {
      const start = context.currentTime + 0.01
      const notes = [784, 988, 1175]
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const noteStart = start + index * 0.16
        oscillator.type = 'triangle'
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, noteStart)
        gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.018)
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.4)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(noteStart)
        oscillator.stop(noteStart + 0.41)
        if (index === notes.length - 1) oscillator.onended = () => void context.close()
      })
    }).catch(() => void context.close())
  } catch { /* Visual alert remains available. */ }
}

export function TradeRequestAlertCenter({
  requests,
  pendingCount,
  refreshError,
  onReview,
  alertTarget,
  mobileAlertTarget,
  soundTarget,
}: {
  requests: TradeRequestWithListing[]
  pendingCount?: number
  refreshError: boolean
  onReview: (requestId: string, action: 'approve' | 'reject') => void
  alertTarget: HTMLElement | null
  mobileAlertTarget?: HTMLElement | null
  soundTarget: HTMLElement | null
}) {
  const [chimeEnabled, setChimeEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(AUDIO_KEY)
        if (saved === 'chime' || saved === 'voice') {
          setChimeEnabled(true)
          if (saved === 'voice') window.localStorage.setItem(AUDIO_KEY, 'chime')
        }
      } catch { /* Preferences remain session-only. */ }
      setReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => {
      const seen = new Set(readIds(SEEN_KEY))
      let hasNewRequest = false
      for (const request of requests) {
        if (seen.has(request.id)) continue
        rememberId(SEEN_KEY, request.id)
        hasNewRequest = true
      }
      if (hasNewRequest && chimeEnabled) playChime()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [chimeEnabled, ready, requests])

  const selectedIndex = requests.findIndex((request) => request.id === selectedId)
  const activeIndex = selectedIndex < 0 ? 0 : selectedIndex
  const active = requests[activeIndex]

  function moveRequest(direction: -1 | 1) {
    if (requests.length < 2) return
    setSelectedId((currentId) => {
      const currentIndex = requests.findIndex((request) => request.id === currentId)
      const start = currentIndex < 0 ? 0 : currentIndex
      return requests[(start + direction + requests.length) % requests.length].id
    })
  }

  const renderAlert = () => active ? (
    <TradeRequestAlertCard
      active={active}
      activeIndex={activeIndex}
      requestCount={requests.length}
      pendingCount={pendingCount}
      refreshError={refreshError}
      onPrevious={() => moveRequest(-1)}
      onNext={() => moveRequest(1)}
      onReview={onReview}
    />
  ) : null

  return (
    <>
      {alertTarget && !mobileAlertTarget ? createPortal(renderAlert(), alertTarget) : null}
      {mobileAlertTarget ? createPortal(renderAlert(), mobileAlertTarget) : null}
      {soundTarget ? createPortal(
        <TradeAlertSoundControls
          enabled={chimeEnabled}
          onChange={(enabled) => {
            setChimeEnabled(enabled)
            try { window.localStorage.setItem(AUDIO_KEY, enabled ? 'chime' : 'off') } catch { /* In-memory choice remains. */ }
            if (enabled) playChime()
          }}
          onTest={playChime}
        />,
        soundTarget,
      ) : null}
    </>
  )
}

export function TradeAlertSoundControls({ enabled, onChange, onTest }: {
  enabled: boolean
  onChange: (enabled: boolean) => void
  onTest: () => void
}) {
  return <div className={styles.soundSettings}>
    <label>Trade request sound
      <select value={enabled ? 'chime' : 'off'} onChange={(event) => onChange(event.target.value === 'chime')}>
        <option value="off">Muted</option><option value="chime">Chime</option>
      </select>
    </label>
    <button type="button" onClick={onTest}>Preview chime</button>
  </div>
}

export function TradeRequestAlertCard({ active, activeIndex, requestCount, pendingCount, refreshError, onPrevious, onNext, onReview }: {
  active: TradeRequestWithListing
  activeIndex: number
  requestCount: number
  pendingCount?: number
  refreshError: boolean
  onPrevious: () => void
  onNext: () => void
  onReview: (requestId: string, action: 'approve' | 'reject') => void
}) {
  const exception = 'manualReviewRequested' in active && active.manualReviewRequested && 'screening' in active && active.screening?.status === 'mismatch'
  return (
    <div className={styles.wrapper} aria-label="Trade requests">
      <div className={`${styles.alert} ${exception ? styles.exception : ''}`} role="status" aria-live="polite">
        <div className={styles.alertHeader}>
          <div><span className={styles.brand}>Nic-Nac trade request</span>{exception ? <strong className={styles.exceptionLabel}>Rule exception — rep review needed</strong> : null}</div>
          <div className={styles.navigation} aria-label="Browse trade requests">
            <button type="button" onClick={onPrevious} disabled={requestCount < 2} aria-label="Previous trade request">‹</button>
            <span>{activeIndex + 1} of {requestCount}{pendingCount !== undefined && pendingCount > requestCount ? ' shown' : ''}</span>
            <button type="button" onClick={onNext} disabled={requestCount < 2} aria-label="Next trade request">›</button>
          </div>
        </div>
        {refreshError ? <small className={styles.stale}>Showing last known request; refresh is unavailable.</small> : null}
        <div className={styles.detailGrid}>
          <div className={styles.detailColumn}>
            <p><strong>{active.customerName}</strong> wants {active.listing.design.designName}{active.listing.design.itemNumber ? ` (${active.listing.design.itemNumber})` : ''}.</p>
            <p><strong>Requested:</strong> {active.listing.design.collectionName ?? 'Collection to verify'} · {active.listing.design.typePrefix}</p>
          </div>
          <div className={styles.detailColumn}>
            <p><strong>Offered:</strong> {active.customerDescription}</p>
            <p><strong>Customer-reported details:</strong> {active.offeredFamily ?? 'Collection to verify'} · {active.offeredType ?? 'Type to verify'}</p>
            {exception ? <p>{active.screening?.reason}</p> : null}
          </div>
          <div className={`${styles.detailColumn} ${styles.evidenceColumn}`}>
            <small>Submitted {new Date(active.createdAt).toLocaleString()}</small>
            {active.revealScreenshot ? <TradeScreenshotLink requestId={active.id} customerName={active.customerName}>View screenshot</TradeScreenshotLink> : null}
            <div className={styles.actions}><button type="button" onClick={() => onReview(active.id, 'approve')}>Approve</button><button type="button" onClick={() => onReview(active.id, 'reject')}>Deny</button></div>
          </div>
        </div>
      </div>
    </div>
  )
}
