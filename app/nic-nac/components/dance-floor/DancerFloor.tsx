'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TradeListingWithDesign } from '@/lib/services/types'
import { getTradeListingDisplayFields, TRADE_LISTING_TYPE_LABELS } from '@/lib/services/trade-listing-display'
import { getBoardInventoryOptions } from '@/lib/nic-nac/board-inventory-view'
import { SectionState } from './SectionState'
import { DancerEditor } from './DancerEditor'
import { defaultFloorFilters, floorQuery, mutateFloor, useEditableFloor, type FloorFilters } from './useDanceFloorData'
import type { DanceFloorBoard } from './types'
import styles from './dance-floor.module.css'
export function DancerFloor(props: {
  board?: DanceFloorBoard; listings: TradeListingWithDesign[]; search: string; onSearch: (value: string) => void;
  status: 'loading' | 'ready' | 'error'; hasMore: boolean; onEnsureLoaded?: () => Promise<void>; loadingMore: boolean; onRetry: () => void; onRefresh?: () => unknown
}) {
  const { filters, setFilters, board, status, refresh, loadedQuery } = useEditableFloor(props.board)
  const rows = board?.listings ?? props.listings
  const options = getBoardInventoryOptions((props.board?.listings ?? rows).map(row => ({ ...row, status: 'available' as const })))
  const [editor, setEditor] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [removed, setRemoved] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [target, setTarget] = useState<string | null>(null)
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty
  const guard = () => { if (dirtyRef.current) { setMessage('Save or cancel your changes first.'); return false } return true }
  const open = (id: string) => { if (id !== editor && !guard()) return; setEditor(id); setMessage('') }
  const change = (next: Partial<FloorFilters>) => { if (guard()) { setEditor(null); setFilters(current => ({ ...current, ...next })); if (next.search !== undefined) props.onSearch(next.search) } }
  const clear = () => { if (guard()) { setEditor(null); setFilters(defaultFloorFilters); props.onSearch('') } }
  const refreshAll = useCallback(async () => { await props.onRefresh?.(); await refresh() }, [props.onRefresh, refresh])
  useEffect(() => {
    const photo = () => { if (!dirtyRef.current) { setEditor(null); setFilters(current => ({ ...current, needsPhoto: true })) } else setMessage('Save or cancel your changes first.') }
    const hash = () => {
      if (!window.location.hash.startsWith('#dancer=')) return
      if (dirtyRef.current) { setMessage('Save or cancel your changes first.'); return }
      let id = ''; try { id = decodeURIComponent(window.location.hash.slice(8)) } catch { /* invalid link */ }
      setEditor(null); setFilters(defaultFloorFilters); setTarget(id); setMessage('')
    }
    window.addEventListener('dance-floor-needs-photo', photo); window.addEventListener('hashchange', hash); hash()
    return () => { window.removeEventListener('dance-floor-needs-photo', photo); window.removeEventListener('hashchange', hash) }
  }, [setFilters])
  useEffect(() => {
    if (!target || status !== 'ready' || loadedQuery !== floorQuery(defaultFloorFilters)) return
    const row = rows.find(item => item.id === target)
    if (row && row.status !== 'traded' && row.status !== 'removed') {
      setEditor(target); setTarget(null)
      requestAnimationFrame(() => document.getElementById('dancer-' + target)?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
    } else if (board?.hasMore) { void refresh(rows.length) }
    else { setTarget(null); setMessage("That dancer isn't on your Floor anymore.") }
  }, [target, status, board, rows, refresh, loadedQuery])
  const active = filters.search || filters.type || filters.collection || filters.rarity || filters.material || filters.size || filters.sort !== 'newest' || filters.needsPhoto || filters.sitting || filters.statuses.join(',') !== 'available,pending_trade'
  return <section id="floor" className={styles.section}>
    <p className={styles.kicker}>Your dancers</p><h2>My Dance Floor</h2><p>The dancers your customers can request, plus any that are mid-swap or already swapped.</p>
    <label className={styles.field}>Search<input type="search" className="ph-no-capture" value={filters.search} placeholder="Search name, collection, or size" onChange={e => change({ search: e.target.value })} /></label>
    <div className={styles.selects}>
      <label className={styles.field}>Type<select value={filters.type} onChange={e => change({ type: e.target.value })}><option value="">All types</option>{options.jewelryTypes.map(type => <option key={type} value={type}>{TRADE_LISTING_TYPE_LABELS[type as keyof typeof TRADE_LISTING_TYPE_LABELS]}</option>)}</select></label>
      <label className={styles.field}>Collection<select value={filters.collection} onChange={e => change({ collection: e.target.value })}><option value="">All collections</option>{options.collections.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className={styles.field}>Sort<select value={filters.sort} onChange={e => change({ sort: e.target.value })}><option value="newest">Newest first</option><option value="collection">Collection</option><option value="type">Jewelry type</option><option value="name">Dancer name</option><option value="rarity">Rare first</option></select></label>
    </div>
    <div className={styles.chips}>{([['available','Available'],['pending_trade','Pending swap'],['traded','Swapped']] as const).map(([value,label]) => <label className={styles.filterChip} key={value}><input type="checkbox" checked={filters.statuses.includes(value)} onChange={e => change({ statuses: e.target.checked ? [...filters.statuses,value] : filters.statuses.filter(status => status !== value) })} />{label}</label>)}
      <label className={styles.filterChip}><input type="checkbox" checked={filters.sitting} onChange={e => change({ sitting: e.target.checked })} />Sitting 30+ days</label>
      <label className={styles.filterChip}><input type="checkbox" checked={filters.needsPhoto} onChange={e => change({ needsPhoto: e.target.checked })} />Needs a photo</label>
    </div>
    <details><summary>More filters</summary><div className={styles.selects}>{(['rarity','material','size'] as const).map(key => <label className={styles.field} key={key}>{key === 'rarity' ? 'Rarity' : key === 'material' ? 'Material' : 'Size'}<select value={filters[key]} onChange={e => change({ [key]: e.target.value })}><option value="">All</option>{(key === 'rarity' ? options.rarities : key === 'material' ? options.materials : options.sizes).map(value => <option key={value}>{value}</option>)}</select></label>)}</div></details>
    <div className={styles.historyControls}><span>{board?.total ?? rows.length} {(board?.total ?? rows.length) === 1 ? 'dancer' : 'dancers'}</span><button type="button" className={styles.linkButton} onClick={clear}>Clear filters</button></div>
    {message && <p role="status">{message}</p>}
    {removed && <div className={styles.empty}><p>Taken off your Dance Floor.</p><button type="button" className={styles.secondary} disabled={restoring} onClick={async () => {
      setRestoring(true); setMessage('')
      try { await mutateFloor('/api/nic-nac/trade-board','PATCH',{ listingId: removed, action: 'restore' }); setRemoved(null); await refreshAll() }
      catch (e) { setMessage(e instanceof Error ? e.message : "Couldn't update that dancer. Try again.") }
      finally { setRestoring(false) }
    }}>Put back on the Floor</button></div>}
    <SectionState status={status} loading="Loading your dancers…" error="Couldn't load your dancers." onRetry={() => void refresh()} />
    {status === 'ready' && !rows.length && <p className={styles.empty}>{active ? 'No dancers match these filters. Clear filters or try another search.' : 'Your Dance Floor is empty. Add a dancer to show it here.'}</p>}
    <div className={styles.floorGrid}>{rows.map(listing => {
      const display = getTradeListingDisplayFields(listing)
      return <article id={'dancer-' + listing.id} className={styles.dancer + (editor === listing.id ? ' ' + styles.dancerOpen : '') + (!display.photoUrl ? ' ' + styles.needsPhoto : '')} key={listing.id} data-dancer-row={listing.id}>
        {display.photoUrl ? <img className={styles.photo} src={display.photoUrl} alt={display.designName} loading="lazy" /> : <div className={styles.noPhoto}><span aria-hidden="true">▧</span>No photo yet</div>}
        <div className={styles.dancerInfo}><p className={styles.collection}>{display.collectionName}</p><h3>{display.designName}</h3><p>{display.typeLabel}{display.size ? ' · Size ' + display.size : ''}</p>
          <div className={styles.chips}><span className={listing.status === 'available' ? styles.available : listing.status === 'pending_trade' ? styles.pending : styles.swapped}>{listing.status === 'available' ? 'Available' : listing.status === 'pending_trade' ? 'Pending swap' : 'Swapped'}</span>
          {listing.status === 'available' && listing.listed_at && Date.parse(listing.listed_at) < Date.now() - 30 * 86400000 && <span className={styles.chip}>Sitting 30+ days</span>}
          {!display.photoUrl && <span className={styles.chip}>Needs a photo</span>}</div>
          <p className={styles.facts}>{listing.daysOnFloor ?? 0}d on the Floor · {listing.requestCount ? listing.requestCount + (listing.requestCount === 1 ? ' request' : ' requests') : 'No requests yet'} · Qty {listing.quantity_available ?? 1}</p>
        </div>
        {listing.status !== 'traded' && listing.status !== 'removed' && editor !== listing.id && <button type="button" className={styles.secondary + ' ' + styles.editButton} onClick={() => open(listing.id)}>Edit</button>}
        {editor === listing.id && <DancerEditor listing={listing} onDirty={setDirty} onClose={() => { setDirty(false); setEditor(null); setMessage('') }} onRefresh={refreshAll} onRemoved={id => { setDirty(false); setEditor(null); setRemoved(id) }} />}
      </article>
    })}</div>
    {board?.hasMore && <button type="button" className={styles.secondary} disabled={status === 'loading'} onClick={() => void refresh(rows.length)}>{status === 'loading' ? 'Loading your dancers…' : 'Load more'}</button>}
  </section>
}
