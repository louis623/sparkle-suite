'use client'
import { useEffect, useState } from 'react'
import type { TradeListingWithDesign } from '@/lib/services/types'
import { getTradeListingDisplayFields, TRADE_LISTING_TYPE_LABELS } from '@/lib/services/trade-listing-display'
import { getBoardInventoryOptions, getBoardInventoryResults, hasActiveBoardInventoryBrowse, type BoardInventoryFilters } from '@/lib/nic-nac/board-inventory-view'
import { SectionState } from './SectionState'
import styles from './dance-floor.module.css'
const PAGE_SIZE = 24
export function DancerFloor({ listings, search, onSearch, status, hasMore, onEnsureLoaded, loadingMore, onRetry }: {
  listings: TradeListingWithDesign[]; search: string; onSearch: (value: string) => void;
  status: 'loading' | 'ready' | 'error'; hasMore: boolean; onEnsureLoaded?: () => Promise<void>; loadingMore: boolean; onRetry: () => void
}) {
  const [filters, setFilters] = useState<Omit<BoardInventoryFilters, 'search'>>({ jewelryType: '', collection: '', sortMode: 'newest', rarity: '', material: '', size: '' })
  const [visible, setVisible] = useState(PAGE_SIZE)
  const board = listings.filter(listing => listing.status !== 'removed')
  // The shared browser helper is available-only. Adapt only its input view; restore
  // each original row afterward so already-returned pending/swapped statuses survive.
  const browseRows = board.map(listing => ({ ...listing, status: 'available' as const }))
  const options = getBoardInventoryOptions(browseRows)
  const active = hasActiveBoardInventoryBrowse({ ...filters, search })
  const originals = new Map(board.map(listing => [listing.id, listing]))
  const results = getBoardInventoryResults(browseRows, { ...filters, search }).map(listing => originals.get(listing.id)!)
  useEffect(() => { if (active && hasMore) void onEnsureLoaded?.() }, [active, hasMore, onEnsureLoaded])
  function change(key: keyof typeof filters, value: string) { setFilters(current => ({ ...current, [key]: value })); setVisible(PAGE_SIZE) }
  function clear() { setFilters({ jewelryType: '', collection: '', sortMode: 'newest', rarity: '', material: '', size: '' }); onSearch(''); setVisible(PAGE_SIZE) }
  return <section id="floor" className={styles.section}>
    <p className={styles.kicker}>Your dancers</p><h2>My Dance Floor</h2><p>The dancers your customers can request, plus any that are mid-swap or already swapped.</p>
    <label className={styles.field}>Search<input type="search" className="ph-no-capture" value={search} placeholder="Search name, collection, or size" onChange={event => { onSearch(event.target.value); setVisible(PAGE_SIZE) }} /></label>
    <div className={styles.selects}>
      <label className={styles.field}>Type<select value={filters.jewelryType} onChange={e => change('jewelryType', e.target.value)}><option value="">All types</option>{options.jewelryTypes.map(type => <option key={type} value={type}>{TRADE_LISTING_TYPE_LABELS[type as keyof typeof TRADE_LISTING_TYPE_LABELS]}</option>)}</select></label>
      <label className={styles.field}>Collection<select value={filters.collection} onChange={e => change('collection', e.target.value)}><option value="">All collections</option>{options.collections.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className={styles.field}>Sort<select value={filters.sortMode} onChange={e => change('sortMode', e.target.value)}><option value="newest">Newest first</option><option value="collection">Collection</option><option value="type">Jewelry type</option><option value="name">Dancer name</option>{options.rarities.length > 0 && <option value="rarity">Rare first</option>}</select></label>
    </div>
    <details><summary>More filters</summary><div className={styles.selects}>
      {(['rarity', 'material', 'size'] as const).map(key => <label className={styles.field} key={key}>{key === 'rarity' ? 'Rarity' : key === 'material' ? 'Material' : 'Size'}
        <select value={filters[key] ?? ''} onChange={e => change(key, e.target.value)}><option value="">All</option>{(key === 'rarity' ? options.rarities : key === 'material' ? options.materials : options.sizes).map(value => <option key={value}>{value}</option>)}</select></label>)}
    </div></details>
    {active && <button type="button" className={styles.linkButton} onClick={clear}>Clear filters</button>}
    <SectionState status={status} loading="Loading your dancers…" error="Couldn't load your dancers." onRetry={onRetry} />
    {status === 'ready' && !results.length && <p className={styles.empty}>{active ? 'No dancers match these filters. Clear filters or try another search.' : 'Your Dance Floor is empty. Add a dancer to show it here.'}</p>}
    <div className={styles.floorGrid}>{results.slice(0, visible).map(listing => {
      const display = getTradeListingDisplayFields(listing)
      return <article className={styles.dancer} key={listing.id} data-dancer-row={listing.id}>
        {display.photoUrl ? <img className={styles.photo} src={display.photoUrl} alt={display.designName} loading="lazy" /> : <div className={styles.noPhoto}><span aria-hidden="true">▧</span>No photo yet</div>}
        <div className={styles.dancerInfo}><p className={styles.collection}>{display.collectionName}</p><h3>{display.designName}</h3><p>{display.typeLabel}{display.size ? ` · Size ${display.size}` : ''}</p>
          <div className={styles.chips}><span className={listing.status === 'available' ? styles.available : listing.status === 'pending_trade' ? styles.pending : styles.swapped}>{listing.status === 'available' ? 'Available' : listing.status === 'pending_trade' ? 'Pending swap' : 'Swapped'}</span></div>
          <p>Qty {listing.quantity_available ?? 1}</p>
        </div>
      </article>
    })}</div>
    {(results.length > visible || hasMore) && <button type="button" className={styles.secondary} disabled={loadingMore} onClick={() => { setVisible(n => n + PAGE_SIZE); if (hasMore) void onEnsureLoaded?.() }}>{loadingMore ? 'Loading your dancers…' : 'Load more'}</button>}
  </section>
}
