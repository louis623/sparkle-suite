'use client'
import { useState } from 'react'
import type { TradeSwapCleanupItem } from '@/lib/services/types'
import { SectionState } from './SectionState'
import { mutateFloor } from './useDanceFloorData'
import styles from './dance-floor.module.css'
function FollowUpRow({ item, onRefresh }: { item: TradeSwapCleanupItem; onRefresh?: () => unknown }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const fields = item.missingFields ?? (item.replacementStatus === 'needs_ring_size' ? ['ringSize' as const] : [])
  const names = { ringSize: 'Ring size', collectionName: 'Collection', material: 'Material' }
  return <article className={styles.requestCard + ' ph-no-capture'}>
    <h3>{item.replacementStatus === 'needs_ring_size' ? 'Add a ring size' : 'Finish the catalog details'}</h3>
    <p>{item.customerName} · revealed {item.revealedItemNumber}</p>
    {status === 'done' ? <p role="status">Added to your Dance Floor.</p> : <form onSubmit={async event => {
      event.preventDefault(); setStatus('saving')
      try { await mutateFloor('/api/nic-nac/trade-swap-cleanup', 'POST', { swapId: item.swapId, ...Object.fromEntries(fields.map(key => [key, values[key]])) }); setStatus('done'); await onRefresh?.() }
      catch { setStatus('error') }
    }}>
      {fields.length > 0 && <p>Missing: {fields.map(key => names[key].toLowerCase()).join(' and ')}</p>}
      <div className={styles.selects}>{fields.map(key => <label key={key} className={styles.field}>{names[key]}<input required maxLength={120} disabled={status === 'saving'} value={values[key] ?? ''} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))} /></label>)}</div>
      <button className={styles.primary} type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Adding…' : 'Add to Floor'}</button>
      {status === 'error' && <p role="alert">Couldn't add that dancer. Check the details and try again.</p>}
    </form>}
  </article>
}
export function FollowUps({ items, status, onRetry, onRefresh }: { items: TradeSwapCleanupItem[]; status: 'loading' | 'ready' | 'error'; onRetry: () => void; onRefresh?: () => unknown }) {
  const pending = items.filter(item => item.replacementStatus !== 'added_to_board')
  if (status === 'ready' && !pending.length) return null
  return <section id="follow-ups" className={styles.section}>
    <p className={styles.kicker}>Follow-ups · {pending.length}</p><h2>Follow-ups to finish</h2>
    <p>Add the missing details so this reveal can go back on your Dance Floor.</p>
    <SectionState status={status} error="Couldn't load your follow-ups." onRetry={onRetry} />
    <div className={styles.requestGrid}>{pending.map(item => <FollowUpRow key={item.swapId} item={item} onRefresh={onRefresh} />)}</div>
  </section>
}
