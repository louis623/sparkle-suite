'use client'

import { useEffect, useState } from 'react'
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
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 660
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.1, context.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.36)
      oscillator.onended = () => void context.close()
    }).catch(() => void context.close())
  } catch { /* Visual alert remains available. */ }
}

function playVoice() {
  try {
    if (!('speechSynthesis' in window)) return
    const message = new SpeechSynthesisUtterance('I say, a dancer has requested a trade.')
    message.lang = 'en-GB'
    message.rate = 0.9
    message.pitch = 0.9
    message.volume = 0.8
    const britishVoices = window.speechSynthesis.getVoices().filter((voice) => /^en[-_]GB$/i.test(voice.lang))
    const preferred = britishVoices.find((voice) => /\b(ryan|george|oliver|daniel|arthur|alfie|brian)\b/i.test(voice.name)) ?? britishVoices[0]
    if (preferred) message.voice = preferred
    window.speechSynthesis.speak(message)
  } catch { /* Visual alert remains available. */ }
}

export function TradeRequestAlertCenter({
  requests,
  pendingCount,
  refreshError,
  onReview,
  onOpenInbox,
}: {
  requests: TradeRequestWithListing[]
  pendingCount?: number
  refreshError: boolean
  onReview: (requestId: string, action: 'approve' | 'reject') => void
  onOpenInbox: () => void
}) {
  const [audio, setAudio] = useState<'off' | 'chime' | 'voice'>('off')
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(AUDIO_KEY)
        if (saved === 'chime' || saved === 'voice') setAudio(saved)
      } catch { /* Preferences remain session-only. */ }
      setReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => {
      const seen = new Set(readIds(SEEN_KEY))
      for (const request of requests) {
        if (seen.has(request.id)) continue
        rememberId(SEEN_KEY, request.id)
        if (audioUnlocked && audio === 'chime') playChime()
        if (audioUnlocked && audio === 'voice') playVoice()
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [audio, audioUnlocked, ready, requests])

  const selectedIndex = requests.findIndex((request) => request.id === selectedId)
  const activeIndex = selectedIndex < 0 ? 0 : selectedIndex
  const active = requests[activeIndex]
  const exception = active && 'manualReviewRequested' in active && active.manualReviewRequested && 'screening' in active && active.screening?.status === 'mismatch'

  function moveRequest(direction: -1 | 1) {
    if (requests.length < 2) return
    setSelectedId((currentId) => {
      const currentIndex = requests.findIndex((request) => request.id === currentId)
      const start = currentIndex < 0 ? 0 : currentIndex
      return requests[(start + direction + requests.length) % requests.length].id
    })
  }

  return (
    <div className={styles.wrapper} aria-label="Trade requests">
      <div className={`${styles.bar} ${pendingCount ? styles.attention : ''}`}>
        <span className={styles.brand}>Nic-Nac</span>
        <button type="button" className={styles.count} onClick={onOpenInbox} aria-label={`Open Dance Floor trade requests${pendingCount === undefined ? '' : `, ${pendingCount} pending`}`}>
          {pendingCount === undefined ? 'Trade requests · count unavailable' : `${pendingCount} trade request${pendingCount === 1 ? '' : 's'} pending`}
        </button>
        {refreshError ? <span className={styles.stale} role="status">Can’t refresh right now · showing last known count</span> : null}
        <label className={styles.audio}>Alert sound
          <select value={audio} onChange={(event) => {
            const next = event.target.value as typeof audio
            setAudio(next)
            setAudioUnlocked(true)
            try { window.localStorage.setItem(AUDIO_KEY, next) } catch { /* In-memory choice remains. */ }
            if (next === 'chime') playChime()
            if (next === 'voice') playVoice()
          }}>
            <option value="off">Muted</option><option value="chime">Chime</option><option value="voice">British voice</option>
          </select>
        </label>
        <button type="button" className={styles.test} onClick={() => { setAudioUnlocked(true); if (audio === 'voice') playVoice(); else playChime() }} aria-label="Test trade alert sound">Test</button>
      </div>
      {active ? <div className={`${styles.alert} ${exception ? styles.exception : ''}`} role="status" aria-live="polite">
        <div className={styles.alertHeader}>
          <div><span className={styles.brand}>Nic-Nac trade request</span>{exception ? <strong className={styles.exceptionLabel}>Rule exception — rep review needed</strong> : null}</div>
          <div className={styles.navigation} aria-label="Browse trade requests">
            <button type="button" onClick={() => moveRequest(-1)} disabled={requests.length < 2} aria-label="Previous trade request">‹</button>
            <span>{activeIndex + 1} of {requests.length}{pendingCount !== undefined && pendingCount > requests.length ? ' shown' : ''}</span>
            <button type="button" onClick={() => moveRequest(1)} disabled={requests.length < 2} aria-label="Next trade request">›</button>
          </div>
        </div>
        <p><strong>{active.customerName}</strong> wants {active.listing.design.designName}{active.listing.design.itemNumber ? ` (${active.listing.design.itemNumber})` : ''}.</p>
        <p><strong>Requested:</strong> {active.listing.design.collectionName ?? 'Collection to verify'} · {active.listing.design.typePrefix}</p>
        <p><strong>Offered:</strong> {active.customerDescription}</p>
        <p><strong>Customer-reported details:</strong> {active.offeredFamily ?? 'Collection to verify'} · {active.offeredType ?? 'Type to verify'}</p>
        {exception ? <p>{active.screening?.reason}</p> : null}
        <small>Submitted {new Date(active.createdAt).toLocaleString()}</small>
        {active.revealScreenshot ? <TradeScreenshotLink requestId={active.id} customerName={active.customerName}>View screenshot</TradeScreenshotLink> : null}
        <div className={styles.actions} style={{ flexWrap: 'wrap' }}><button type="button" onClick={() => onReview(active.id, 'approve')}>Approve</button><button type="button" onClick={() => onReview(active.id, 'reject')}>Deny</button></div>
      </div> : null}
    </div>
  )
}
