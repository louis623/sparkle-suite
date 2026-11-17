'use client'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { TradeRequestWithListing } from '@/lib/services/types'
import { offeredDimensions } from '@/lib/nic-nac/swap-request-display'
import { TradeScreenshotLink } from './TradeScreenshotLink'
import styles from './TradeRequestReviewDialog.module.css'

export type TradeReviewDecision =
  | { action: 'approve'; requestId: string; revealedItemNumber?: string; repNotes?: string }
  | { action: 'reject'; requestId: string; customerMessage?: string; repNotes?: string }
export function TradeRequestReviewDialog({ request, initialAction, pending = false, error = null, onClose, onSubmit }: {
  request: TradeRequestWithListing; initialAction?: 'approve' | 'reject'; pending?: boolean; error?: string | null
  onClose: () => void; onSubmit: (decision: TradeReviewDecision) => void | Promise<void>
}) {
  const [step, setStep] = useState<'choose' | 'approve' | 'deny'>(initialAction === 'reject' ? 'deny' : initialAction === 'approve' ? 'approve' : 'choose')
  const [itemNumber, setItemNumber] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [repNotes, setRepNotes] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return () => opener?.focus()
  }, [])
  useEffect(() => { headingRef.current?.focus() }, [step])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); if (!pending) onClose() } }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [onClose, pending])
  function keepFocusInside(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]')
    if (!controls?.length) { event.preventDefault(); headingRef.current?.focus(); return }
    const first = controls[0], last = controls[controls.length - 1]
    if (document.activeElement === headingRef.current || !dialogRef.current?.contains(document.activeElement)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus()
    } else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  const requested = request.listing.design
  const requestedLabel = [requested.itemNumber, requested.designName].filter(Boolean).join(' — ')
  const offered = offeredDimensions(request.offeredType, request.offeredFamily)
  const expired = request.photoExpired || Boolean(request.revealScreenshot && Date.parse(request.revealScreenshot.expiresAt) <= Date.now())
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || step === 'choose') return
    const notes = repNotes.trim()
    if (step === 'approve') {
      if (request.listing.quantityAvailable === 0) return
      void onSubmit({ action: 'approve', requestId: request.id,
        ...(itemNumber.trim() ? { revealedItemNumber: itemNumber.trim().toUpperCase() } : {}),
        ...(notes ? { repNotes: notes } : {}) })
    } else {
      void onSubmit({ action: 'reject', requestId: request.id,
        ...(customerMessage.trim() ? { customerMessage: customerMessage.trim() } : {}),
        ...(notes ? { repNotes: notes } : {}) })
    }
  }
  return <div className={styles.scrim} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="trade-review-heading" onKeyDown={keepFocusInside}>
      <div className={styles.topline}><h2 id="trade-review-heading" tabIndex={-1} ref={headingRef}>{step === 'choose' ? 'Review' : step === 'approve' ? 'Approve' : 'Deny'} {request.customerName}&apos;s request</h2>
        <button type="button" onClick={onClose} disabled={pending} aria-label="Close swap review">×</button></div>
      {request.manualReviewRequested && request.screening?.status === 'mismatch' ? <div className={styles.exception}><strong>Rule exception — rep review needed.</strong> {request.screening.reason}</div> : null}
      <div className={styles.facts}>
        <p><strong>Requested dancer:</strong> {requestedLabel}</p>
        {request.customerDescription ? <p>{request.customerDescription}</p> : null}
        {offered ? <p>Offered: {offered}</p> : null}
        {expired ? <p>Photo expired after 7 days. Ask the customer to resend.</p> : request.revealScreenshot ? <TradeScreenshotLink requestId={request.id} customerName={request.customerName} imageClassName={styles.screenshot} /> : null}
      </div>
      {step === 'choose' ? <div className={styles.actions}>
        <button type="button" disabled={pending} onClick={() => setStep('approve')}>Approve</button>
        <button type="button" disabled={pending} onClick={() => setStep('deny')}>Deny</button>
      </div> : <form onSubmit={submit} className={styles.form}>
        {step === 'approve' ? <label>Revealed item number (optional)<input disabled={pending} value={itemNumber} onChange={e => setItemNumber(e.target.value)} maxLength={40} placeholder="RG12345" /></label>
          : <label>Message to customer (optional)<textarea disabled={pending} value={customerMessage} onChange={e => setCustomerMessage(e.target.value)} maxLength={240} /><span className={styles.counter}>{customerMessage.length}/240</span></label>}
        <label>Private rep notes (optional)<textarea disabled={pending} value={repNotes} onChange={e => setRepNotes(e.target.value)} maxLength={1000} /></label>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}><button type="button" disabled={pending} onClick={() => setStep('choose')}>Back</button>
          <button type="submit" disabled={pending || (step === 'approve' && request.listing.quantityAvailable === 0)}>{pending ? 'Saving…' : step === 'approve' ? 'Confirm approval' : 'Confirm denial'}</button></div>
      </form>}
    </section>
  </div>
}
