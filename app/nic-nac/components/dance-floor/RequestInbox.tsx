import type { TradeRequestWithListing } from '@/lib/services/types'
import { offeredDimensions, orderLabel, requestTiming, requestCardAge, screeningLabel } from '@/lib/nic-nac/swap-request-display'
import { TradeScreenshotLink } from '../TradeScreenshotLink'
import { SectionState } from './SectionState'
import type { OpeningReview } from './types'
import styles from './dance-floor.module.css'

export function RequestCard({ request, openingReview, onReviewRequest, now = Date.now() }: {
  request: TradeRequestWithListing; openingReview?: OpeningReview;
  onReviewRequest: (id: string, action: 'approve' | 'reject') => void; now?: number
}) {
  const timing = requestTiming(request.createdAt, request.revealScreenshot?.expiresAt, now)
  const expired = request.photoExpired || timing.expired
  const opening = openingReview?.requestId === request.id
  return <article className={styles.requestCard + ' ph-no-capture'}>
    <div className={styles.photoPair}>
      <figure>{request.revealScreenshot && !expired ?
        <TradeScreenshotLink requestId={request.id} customerName={request.customerName} className={styles.photoLink} imageClassName={styles.photo}>
          <span className={styles.srOnly}>View reveal screenshot</span>
        </TradeScreenshotLink> : <div className={styles.noPhoto}>{expired ? 'Photo expired after 7 days. Ask the customer to resend.' : 'No screenshot attached'}</div>}
        <figcaption>Their reveal photo</figcaption></figure>
      <figure>{request.dancerPhotoUrl ? <img className={styles.photo} src={request.dancerPhotoUrl} alt={request.listing.design.designName} /> :
        <div className={styles.noPhoto}>No photo yet</div>}<figcaption>Your dancer</figcaption></figure>
    </div>
    <h3>{request.customerName} wants {request.listing.design.designName}</h3>
    <div className={styles.chips}>
      <span className={request.screening?.status === 'likely_match' ? styles.available : request.screening?.status === 'mismatch' ? styles.mismatch : styles.pending}>{screeningLabel(request.screening?.status)}</span>
      <span className={styles.chip}>Offering: {offeredDimensions(request.offeredType, request.offeredFamily) || 'Not given'}</span>
      <span className={styles.chip}>{requestCardAge(request.createdAt, now)}</span>
      {orderLabel(request.pendingPosition) && <span className={styles.chip}>{orderLabel(request.pendingPosition)}</span>}
      {!expired && timing.expiry && <span className={styles.chip}>{timing.expiry}</span>}
    </div>
    <div className={styles.actions} data-opening-action={opening ? openingReview?.action : undefined}>
      <button type="button" className={styles.primary} disabled={Boolean(openingReview)} onClick={() => onReviewRequest(request.id, 'approve')}>{opening ? 'Opening…' : 'Approve'}</button>
      <button type="button" className={styles.secondary} disabled={Boolean(openingReview)} onClick={() => onReviewRequest(request.id, 'reject')}>{opening ? 'Opening…' : 'Deny'}</button>
    </div>
  </article>
}
export function RequestInbox({ requests, pendingCount, status, openingReview, onReviewRequest, onRetry }: {
  requests: TradeRequestWithListing[]; pendingCount?: number; status: 'loading' | 'ready' | 'error'; openingReview?: OpeningReview;
  onReviewRequest: (id: string, action: 'approve' | 'reject') => void; onRetry: () => void
}) {
  const pending = requests.filter(request => request.status === 'pending')
  if (status === 'ready' && !pending.length) return null
  return <section id="requests" className={styles.section}>
    <p className={styles.kicker}>New swap requests · {pendingCount ?? pending.length}</p><h2>Swap requests</h2><p>Compare the photos, then approve or deny.</p>
    <SectionState status={status} error="Couldn't load your swap requests." onRetry={onRetry} />
    <div className={styles.requestGrid}>{pending.map(request => <RequestCard key={request.id} request={request} openingReview={openingReview} onReviewRequest={onReviewRequest} />)}</div>
  </section>
}
