import type { TradeSwapCleanupItem } from '@/lib/services/types'
import { SectionState } from './SectionState'
import styles from './dance-floor.module.css'
export function FollowUps({ items, status, onRetry }: { items: TradeSwapCleanupItem[]; status: 'loading' | 'ready' | 'error'; onRetry: () => void }) {
  const pending = items.filter(item => item.replacementStatus !== 'added_to_board')
  if (status === 'ready' && !pending.length) return null
  return <section id="follow-ups" className={styles.section}>
    <p className={styles.kicker}>Follow-ups · {pending.length}</p><h2>Follow-ups to finish</h2>
    <p>Add the missing details so this reveal can go back on your Dance Floor.</p><p>You'll be able to finish these here soon.</p>
    <SectionState status={status} error="Couldn't load your follow-ups." onRetry={onRetry} />
    <div className={styles.requestGrid}>{pending.map(item => <article className={styles.requestCard + ' ph-no-capture'} key={item.swapId}>
      <h3>{item.replacementStatus === 'needs_ring_size' ? 'Add a ring size' : 'Finish the catalog details'}</h3>
      <p>{item.customerName} · revealed {item.revealedItemNumber}</p>
      {item.replacementStatus === 'needs_ring_size' && <p>Missing: ring size</p>}
    </article>)}</div>
  </section>
}
