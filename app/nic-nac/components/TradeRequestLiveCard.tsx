import { offeredDimensions, orderLabel, requestTiming, screeningLabel } from '@/lib/nic-nac/swap-request-display'
import { TradeScreenshotLink } from './TradeScreenshotLink'
import type { TradeRequestCardPart } from '@/lib/nic-nac/trade-request-card-parts'
import styles from './TradeRequestLiveCard.module.css'

export function TradeRequestLiveCard({
  request,
  pendingAction,
  actionsDisabled = false,
  terminalNote = null,
  errorMessage = null,
  onDecision,
}: {
  request: TradeRequestCardPart['data']
  pendingAction: 'approve' | 'reject' | null
  actionsDisabled?: boolean
  terminalNote?: string | null
  errorMessage?: string | null
  onDecision: (decision: 'approve' | 'reject', requestId: string) => void
}) {
  const requestedItem = request.requestedItem.itemNumber
    ? `${request.requestedItem.itemNumber} - ${request.requestedItem.designName}`
    : `${request.requestedItem.designName}${
        request.requestedItem.repFacingNote
          ? ` ${request.requestedItem.repFacingNote}`
          : ''
      }`
  const buttonsDisabled = actionsDisabled || pendingAction !== null || terminalNote !== null

  const timing = requestTiming(request.createdAt, request.revealScreenshot?.expiresAt)
  const expired = request.photoExpired || timing.expired
  const position = request.status === 'pending' || !request.status ? orderLabel(request.pendingPosition) : null
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>New swap request</div>
        <div className={styles.customer}>{request.customerName}</div>
      </div>

      <div className={styles.comparison}>
        {request.revealScreenshot && !expired ? <TradeScreenshotLink requestId={request.requestId} customerName={request.customerName}>View full photo</TradeScreenshotLink> : <span>{expired ? 'Photo expired after 7 days. Ask the customer to resend.' : 'No screenshot attached'}</span>}
        {request.dancerPhotoUrl && <img src={request.dancerPhotoUrl} alt={requestedItem}/>}
      </div>
      {timing.age && <small>{timing.age}</small>}
      {position && <small>{position}</small>}
      {!expired && timing.expiry && <small>{timing.expiry}</small>}
      <div className={styles.details}>
        <div className={styles.row}>
          <div className={styles.label}>Requested item</div>
          <div className={styles.value}>{requestedItem}</div>
        </div>
        <div className={styles.row}>
          <div className={styles.label}>Offered</div>
          <div className={styles.value}>{request.customerDescription === undefined ? request.offeredText : offeredDimensions(request.offeredType, request.offeredFamily) || 'Not given'}</div>
        </div>
        {request.customerDescription && <div className={styles.row}><div className={styles.label}>Customer says they revealed</div><div className={styles.value}>{request.customerDescription}</div></div>}
        <div className={`${styles.row} ${styles.rule}`}>
          <div className={styles.label}>Rule check</div>
          <div className={styles.value}>{request.screeningStatus ? <span className={styles.screeningChip}>{screeningLabel(request.screeningStatus)}</span> : request.ruleCheck.label}</div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.approve}`}
          type="button"
          disabled={buttonsDisabled}
          aria-busy={pendingAction === 'approve'}
          aria-label={`Review approval for swap request from ${request.customerName} for ${requestedItem}`}
          onClick={() => onDecision('approve', request.requestId)}
        >
          {pendingAction === 'approve' ? 'Opening...' : 'Approve'}
        </button>
        <button
          className={`${styles.button} ${styles.deny}`}
          type="button"
          disabled={buttonsDisabled}
          aria-busy={pendingAction === 'reject'}
          aria-label={`Review denial for swap request from ${request.customerName} for ${requestedItem}`}
          onClick={() => onDecision('reject', request.requestId)}
        >
          {pendingAction === 'reject' ? 'Opening...' : 'Deny'}
        </button>
      </div>

      {terminalNote ? (
        <div className={styles.terminalNote}>{terminalNote}</div>
      ) : null}
      {errorMessage ? (
        <div className={styles.errorNote} role="status">
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
