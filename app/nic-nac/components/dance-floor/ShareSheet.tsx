'use client'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import type { Publication } from './types'
import styles from './dance-floor.module.css'

export function ShareSheet({ publication, onClose }: { publication: Publication; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [qr, setQr] = useState('')
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const url = publication.status === 'published' ? publication.tradeUrl : null
  useEffect(() => {
    if (publication.status !== 'published') return
    const target = dialog.current
    const previous = document.activeElement as HTMLElement | null
    target?.showModal()
    return () => { target?.close(); previous?.focus() }
  }, [publication.status])
  useEffect(() => {
    let current = true
    setQr(''); setFailed(false)
    if (url) QRCode.toDataURL(url, { width: 256, margin: 2 }).then(value => {
      if (current) setQr(value)
    }).catch(() => { if (current) setFailed(true) })
    return () => { current = false }
  }, [url, attempt])
  if (publication.status !== 'published') return null
  return <dialog ref={dialog} className={styles.shareDialog} aria-labelledby="dance-floor-share-title" onCancel={onClose}>
    <div className={styles.shareContent}>
      <h2 id="dance-floor-share-title">Share your Dance Floor</h2>
      <p>This is the page your customers use to request a dancer swap.</p>
      {!url || failed ? <p role="alert">Couldn't build your share link. <button type="button" className={styles.linkButton} onClick={() => setAttempt(n => n + 1)}>Try again</button></p> : <>
        <p className={styles.shareUrl}>{url}</p>
        <div className={styles.qr} role="img" aria-label="Dance Floor QR code">{qr ? <img src={qr} alt="" width={256} height={256} /> : <span>Preparing QR…</span>}</div>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={async () => {
            try { await navigator.clipboard.writeText(url); setCopied(true) } catch { setFailed(true) }
          }}>{copied ? 'Copied!' : 'Copy link'}</button>
          {qr ? <a className={styles.secondary} href={qr} download="dance-floor-qr.png">Download QR</a> : <button type="button" className={styles.secondary} disabled>Download QR</button>}
        </div>
      </>}
      <button type="button" className={styles.secondary} onClick={onClose}>Close</button>
    </div>
  </dialog>
}
