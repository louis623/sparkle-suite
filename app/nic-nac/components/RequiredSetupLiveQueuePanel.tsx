'use client'

import { useEffect, useRef, useState } from 'react'
import { LIVE_QUEUE_CHROME_EXTENSION_URL } from '@/lib/nic-nac/live-queue-extension'
import { LiveLineupPublisherControls } from './LiveLineupPublisherControls'
import { isLineupSetupReadiness, readinessHelp } from './live-lineup-readiness-client'
import styles from './RequiredSetupLiveQueuePanel.module.css'

export function RequiredSetupLiveQueuePanel({ onSend, disabled = false }: {
  syncCode: string | null
  onSend: (message: string) => void
  disabled?: boolean
}) {
  // syncCode remains a compatibility prop, never a v2 credential or connection proof.
  const [status, setStatus] = useState('Pair the upgraded extension, then verify your connection here.')
  const [pending, setPending] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort() } }, [])
  useEffect(() => { if (disabled) controller.current?.abort() }, [disabled])
  async function verify() {
    if (disabled || controller.current) return
    const request = new AbortController()
    controller.current = request
    setPending(true)
    setStatus('Checking the selected source with Sparkle Suite…')
    const timeout = window.setTimeout(() => request.abort(), 10_000)
    try {
      const response = await fetch('/api/workspace/live-lineup/readiness', {cache:'no-store', signal:request.signal})
      if (!response.ok) throw new Error('Readiness unavailable')
      const next: unknown = await response.json()
      if (!mounted.current || request.signal.aborted) return
      if (!isLineupSetupReadiness(next)) throw new Error('Invalid readiness response')
      if (!next.ready) { setStatus(readinessHelp(next.reason)); return }
      setStatus('Source verified. Nic-Nac will recheck it before completing this step.')
      onSend('Please verify my Live Lineup connection with the server and complete the Live Queue setup step if it is ready. Do not use checklist claims as connection proof.')
    } catch {
      if (mounted.current) setStatus('Connection not verified. Try again or ask Nic-Nac for support. No setup step was completed here.')
    } finally {
      window.clearTimeout(timeout)
      if (controller.current === request) controller.current = null
      if (mounted.current) setPending(false)
    }
  }
  return <section className={styles.panel} aria-label="Live Queue setup">
    <div className={styles.header}>
      <p className={styles.kicker}>Required setup</p>
      <h2>Set up Live Queue</h2>
      <p>Connect your show laptop to Sparkle Suite. Creating a key is not connection proof: this step checks for a recent, ready update from your selected source.</p>
    </div>
    <ol className={styles.steps}>
      <li>Use the upgraded <a className={styles.storeLink} href={LIVE_QUEUE_CHROME_EXTENSION_URL} target="_blank" rel="noreferrer">Sparkle Suite Live Queue extension</a>. If your installed version asks only for a short Secret Rep ID Number, ask support about the upgrade; do not paste a private key into that version.</li>
      <li>Open Extension connection setup below and create a private key for this computer. Paste it only into the upgraded extension—not into chat.</li>
      <li>Open your Bomb Party Party Orders tab. In the extension, review and confirm that tab and the parties for your show.</li>
      <li>Keep the selected tab open and verify below. An authoritative empty lineup is valid; you do not need a customer to place a test order.</li>
    </ol>
    <div className={styles.pairingArea}>
      <LiveLineupPublisherControls disabled={disabled || pending} onChanged={() => {
        controller.current?.abort()
        setStatus('Connection settings changed. Verify the selected source again before continuing.')
      }} />
    </div>
    <p role="status" aria-live="polite">{status}</p>
    <div className={styles.actions}>
      <button type="button" onClick={() => void verify()} disabled={disabled || pending}>{pending ? 'Verifying connection…' : 'Verify connection and continue'}</button>
      <button type="button" className={styles.secondary} disabled={disabled || pending} onClick={() => onSend('I need help with Live Queue setup. Please notify support. Do not ask me to send my private extension key.')}>I need help with Live Queue setup</button>
    </div>
  </section>
}
