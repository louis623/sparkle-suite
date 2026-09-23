'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { TradeRequestWithListing } from '@/lib/services/types'
import { screenTradeOffer } from '@/lib/services/trade-request-matcher'
import { TradeScreenshotLink } from './TradeScreenshotLink'
import styles from './TradeRequestReviewDialog.module.css'

export type TradeReviewDecision =
  | {
      action: 'approve'
      requestId: string
      verifiedOfferedFamily: string
      verifiedOfferedType: string
      verificationConfirmed: true
      finalConfirmation: true
      revealedItemNumber?: string
      revealedRingSize?: string
      repNotes?: string
    }
  | {
      action: 'reject'
      requestId: string
      reason: 'collection_mismatch' | 'jewelry_type_mismatch' | 'item_unavailable' | 'other'
      customerExplanation?: string
      repNotes?: string
    }

type ReviewableRequest = TradeRequestWithListing & {
  offeredFamily?: string | null
  offeredType?: string | null
  manualReviewRequested?: boolean
  screening?: { status: string; reason: string | null } | null
  verificationNeeded?: boolean
}

export function TradeRequestReviewDialog({
  request,
  initialAction = 'approve',
  pending = false,
  error = null,
  onClose,
  onSubmit,
}: {
  request: ReviewableRequest
  initialAction?: 'approve' | 'reject'
  pending?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (decision: TradeReviewDecision) => void | Promise<void>
}) {
  const [action, setAction] = useState<'approve' | 'reject'>(initialAction)
  const [family, setFamily] = useState(request.offeredFamily ?? '')
  const [type, setType] = useState(request.offeredType ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [finalConfirmation, setFinalConfirmation] = useState(false)
  const [itemNumber, setItemNumber] = useState('')
  const [ringSize, setRingSize] = useState('')
  const [reason, setReason] = useState<Extract<TradeReviewDecision, { action: 'reject' }>['reason'] | ''>('')
  const [customerExplanation, setCustomerExplanation] = useState('')
  const [repNotes, setRepNotes] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    headingRef.current?.focus()
    return () => previousFocus?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, pending])

  function keepFocusInside(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const requested = request.listing.design
  const requestedLabel = requested.itemNumber
    ? `${requested.itemNumber} — ${requested.designName}`
    : requested.designName
  const exception = request.manualReviewRequested && request.screening?.status === 'mismatch'
  const match = screenTradeOffer(family, type, requested.collectionName, requested.typePrefix)
  const canApprove = Boolean(family.trim() && type && confirmed && finalConfirmation && match.status === 'likely_match')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const notes = repNotes.trim()
    if (action === 'approve') {
      const verifiedOfferedFamily = family.trim()
      const verifiedOfferedType = type.trim().toUpperCase()
      if (!canApprove) return
      void onSubmit({
        action,
        requestId: request.id,
        verifiedOfferedFamily,
        verifiedOfferedType,
        verificationConfirmed: true,
        finalConfirmation: true,
        ...(itemNumber.trim() ? { revealedItemNumber: itemNumber.trim().toUpperCase() } : {}),
        ...(ringSize.trim() ? { revealedRingSize: ringSize.trim() } : {}),
        ...(notes ? { repNotes: notes } : {}),
      })
      return
    }
    if (!reason || (reason === 'other' && !customerExplanation.trim())) return
    void onSubmit({
      action,
      requestId: request.id,
      reason,
      ...(reason === 'other' ? { customerExplanation: customerExplanation.trim() } : {}),
      ...(notes ? { repNotes: notes } : {}),
    })
  }

  return (
    <div className={styles.scrim} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !pending) onClose()
    }}>
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="trade-review-heading" onKeyDown={keepFocusInside}>
        <div className={styles.topline}>
          <div>
            <span className={styles.eyebrow}>Nic-Nac · trade review</span>
            <h2 id="trade-review-heading" tabIndex={-1} ref={headingRef}>Review {request.customerName}&apos;s request</h2>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close trade review">×</button>
        </div>
        {exception ? <div className={styles.exception}><strong>Rule exception — rep review needed.</strong> {request.screening?.reason}</div> : null}
        <div className={styles.facts}>
          <p><strong>Requested dancer:</strong> {requestedLabel}</p>
          <p><strong>Requested family and type:</strong> {requested.collectionName ?? 'Needs verification'} · {requested.typePrefix}</p>
          <p><strong>Customer says they revealed:</strong> {request.customerDescription}</p>
          <p><strong>Submitted:</strong> {new Date(request.createdAt).toLocaleString()}</p>
          {request.revealScreenshot ? <TradeScreenshotLink requestId={request.id} customerName={request.customerName} imageClassName={styles.screenshot} /> : <p>No screenshot attached. Verify the offered item directly.</p>}
        </div>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.tabs} role="group" aria-label="Trade decision">
            <button type="button" aria-pressed={action === 'approve'} onClick={() => setAction('approve')}>Approve review</button>
            <button type="button" aria-pressed={action === 'reject'} onClick={() => setAction('reject')}>Deny review</button>
          </div>
          {action === 'approve' ? <>
            <p className={styles.help}>Confirm the actual offered item. Customer text and Nic-Nac screening alone are not verification. Birthday pieces may match across months and years when the jewelry type matches; OG and other families must match their own family. The server checks both facts before approval.</p>
            <label>Verified offered collection family
              <input value={family} onChange={(event) => { setFamily(event.target.value); setConfirmed(false) }} required maxLength={100} placeholder="Birthday, OG, or Sterling" autoComplete="off" list="trade-family-options" />
              <datalist id="trade-family-options"><option value="Birthday" /><option value="OG" /><option value="Sterling" /></datalist>
            </label>
            <label>Verified offered jewelry type
              <select value={type} onChange={(event) => { setType(event.target.value); setConfirmed(false) }} required>
                <option value="">Choose type</option>
                <option value="RG">Ring</option><option value="NK">Necklace</option><option value="ER">Earrings</option><option value="BR">Bracelet</option><option value="ST">Stack</option>
              </select>
            </label>
            <label className={styles.check}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I verified these facts for the offered piece.</label>
            {family && type ? <p className={match.status === 'likely_match' ? styles.match : styles.error} role="status">{match.status === 'likely_match' ? 'Collection family and jewelry type match this dancer.' : match.reason}</p> : null}
            <label>Revealed item number (optional)<input value={itemNumber} onChange={(event) => setItemNumber(event.target.value)} maxLength={40} placeholder="RG12345" /></label>
            {itemNumber.trim().toUpperCase().startsWith('RG') ? <label>Ring size (if known)<input value={ringSize} onChange={(event) => setRingSize(event.target.value)} maxLength={20} /></label> : null}
            <label className={styles.check}><input type="checkbox" checked={finalConfirmation} onChange={(event) => setFinalConfirmation(event.target.checked)} /> I confirm this one-for-one trade after checking collection family and jewelry type.</label>
          </> : <>
            <label>Reason for denial
              <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)} required>
                <option value="">Choose reason</option><option value="collection_mismatch">Collection mismatch</option><option value="jewelry_type_mismatch">Jewelry type mismatch</option><option value="item_unavailable">Requested item unavailable</option><option value="other">Other</option>
              </select>
            </label>
            {reason === 'other' ? <label>Explanation shown to customer<textarea value={customerExplanation} onChange={(event) => setCustomerExplanation(event.target.value)} required maxLength={240} /></label> : null}
          </>}
          <label>Private rep notes (optional)<textarea value={repNotes} onChange={(event) => setRepNotes(event.target.value)} maxLength={1000} /></label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actions}><button type="button" onClick={onClose} disabled={pending}>Cancel</button><button type="submit" disabled={pending || (action === 'approve' && !canApprove) || (action === 'reject' && (!reason || (reason === 'other' && !customerExplanation.trim())))}>{pending ? 'Saving…' : action === 'approve' ? 'Confirm approval' : 'Confirm denial'}</button></div>
        </form>
      </section>
    </div>
  )
}
