'use client'
import { useState } from 'react'
import type { FulfillmentLogFilter, FulfillmentLogItem } from '@/lib/services/types'
import { TradeScreenshotLink } from '../TradeScreenshotLink'
import { SectionState } from './SectionState'
import styles from './dance-floor.module.css'
export function SwapHistory({ state, view, onView, pendingKey, onAdvance, onRetry }: {
  state: { status: 'loading' | 'ready' | 'error'; items?: FulfillmentLogItem[]; total?: number; totalOpen?: number; pageSize?: number };
  view: { filter: FulfillmentLogFilter; page: number }; onView: (view: { filter: FulfillmentLogFilter; page: number }) => void; pendingKey: string | null;
  onAdvance: (id: string, status: 'approved' | 'shipped' | 'completed', note?: string) => void; onRetry: () => void
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editor, setEditor] = useState<string | null>(null)
  const items = state.items ?? []
  const size = state.pageSize ?? 10
  const pages = Math.max(1, Math.ceil((state.total ?? 0) / size))
  return <section id="history" className={styles.section}>
    <p className={styles.kicker}>Fulfillment</p><h2>Swap history</h2><p>A log of approved swaps from the last 90 days.</p>
    <div className={styles.historyControls}><div role="group" aria-label="Swap history filter" className={styles.chips}>
      {(['open', 'done', 'all'] as const).map(filter => <button key={filter} type="button" className={styles.secondary} aria-pressed={view.filter === filter} onClick={() => onView({ filter, page: 1 })}>{filter === 'open' ? 'Open' : filter === 'done' ? 'Done' : 'All'}</button>)}
    </div><span>{state.totalOpen ?? 0} open</span></div>
    <SectionState status={state.status} error="Couldn't load the swap log." onRetry={onRetry} />
    {state.status === 'ready' && !items.length && <p className={styles.empty}>{view.filter === 'open' ? 'No open swaps to ship or hand off. When you approve a request, it will land here.' : view.filter === 'done' ? 'No finished swaps in the last 90 days yet.' : 'No swaps in the last 90 days yet. Approved requests will show up here.'}</p>}
    {items.map(item => {
      const pending = pendingKey === `fulfillment:${item.requestId}`
      const done = item.status === 'completed'
      const notes = drafts[item.fulfillmentId] ?? item.shippingNotes
      return <article key={item.fulfillmentId} className={styles.historyRow + ' ph-no-capture'}>
        <div className={styles.historyWho}>
          {item.hasRevealScreenshot && <TradeScreenshotLink requestId={item.requestId} customerName={item.customerName} className={styles.historyThumb} imageClassName={styles.photo}><span className={styles.srOnly}>View reveal screenshot</span></TradeScreenshotLink>}
          <div><strong>{item.customerName}</strong><p>Gave {item.gave}</p><p>Got {item.got}</p></div>
        </div>
        <div>{editor === item.fulfillmentId ? <div className={styles.quickAdd}>
          <label className={styles.field}>Note<input className="ph-no-capture" maxLength={300} value={notes} placeholder="Tracking, swap details, or pickup" onChange={e => setDrafts(current => ({ ...current, [item.fulfillmentId]: e.target.value }))} /></label>
          <button type="button" className={styles.secondary} disabled={pending || notes === item.shippingNotes} onClick={() => onAdvance(item.requestId, item.status, notes)}>Save</button>
        </div> : <p>{item.shippingNotes}</p>}
        <button type="button" className={styles.linkButton} aria-expanded={editor === item.fulfillmentId} onClick={() => setEditor(editor === item.fulfillmentId ? null : item.fulfillmentId)}>Note</button></div>
        <label className={styles.done}><input type="checkbox" checked={done} disabled={pending} aria-label={done ? `Return ${item.customerName} to open` : `Mark ${item.customerName} done`} onChange={() => onAdvance(item.requestId, done ? 'approved' : 'completed')} />{pending ? 'Saving' : 'Done'}</label>
      </article>
    })}
    {(state.total ?? 0) > size && <div className={styles.pager}><button type="button" className={styles.secondary} disabled={view.page <= 1} onClick={() => onView({ ...view, page: view.page - 1 })}>Previous</button><span>Page {view.page} of {pages}</span><button type="button" className={styles.secondary} disabled={view.page >= pages} onClick={() => onView({ ...view, page: view.page + 1 })}>Next</button></div>}
  </section>
}
