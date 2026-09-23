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

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>New trade request</div>
        <div className={styles.customer}>{request.customerName}</div>
      </div>

      <div className={styles.details}>
        <div className={styles.row}>
          <div className={styles.label}>Requested item</div>
          <div className={styles.value}>{requestedItem}</div>
        </div>
        <div className={styles.row}>
          <div className={styles.label}>Offered</div>
          <div className={styles.value}>{request.offeredText}</div>
        </div>
        <div className={`${styles.row} ${styles.rule}`}>
          <div className={styles.label}>Rule check</div>
          <div className={styles.value}>{request.ruleCheck.label}</div>
        </div>
        {request.revealScreenshot ? (
          <a
            className={styles.screenshotLink}
            href={request.revealScreenshot.viewUrl}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={request.revealScreenshot.viewUrl}
              alt={`Reveal screenshot from ${request.customerName}`}
              className={styles.screenshotThumb}
            />
            <span>
              <span className={styles.label}>Reveal screenshot</span>
              <span className={styles.value}>View customer upload</span>
            </span>
          </a>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${styles.approve}`}
          type="button"
          disabled={buttonsDisabled}
          aria-busy={pendingAction === 'approve'}
          aria-label={`Review approval for trade request from ${request.customerName} for ${requestedItem}`}
          onClick={() => onDecision('approve', request.requestId)}
        >
          {pendingAction === 'approve' ? 'Opening...' : 'Review to approve'}
        </button>
        <button
          className={`${styles.button} ${styles.deny}`}
          type="button"
          disabled={buttonsDisabled}
          aria-busy={pendingAction === 'reject'}
          aria-label={`Review denial for trade request from ${request.customerName} for ${requestedItem}`}
          onClick={() => onDecision('reject', request.requestId)}
        >
          {pendingAction === 'reject' ? 'Opening...' : 'Review to deny'}
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
