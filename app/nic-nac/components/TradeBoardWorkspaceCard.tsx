'use client'

import { useEffect, useState } from 'react'

import {
  getTradeListingDisplayFields,
  TRADE_LISTING_TYPE_LABELS,
} from '@/lib/services/trade-listing-display'
import type {
  BoardResult,
  FulfillmentLogFilter,
  FulfillmentLogItem,
  TradeListingWithDesign,
  TradeRequestWithListing,
  TradeSwapCleanupItem,
} from '@/lib/services/types'
import {
  getBoardInventoryOptions,
  getBoardInventoryResults,
  getBoardInventoryMaterial,
  hasActiveBoardInventoryBrowse,
} from '@/lib/nic-nac/board-inventory-view'
import { TradeScreenshotLink } from './TradeScreenshotLink'
import surfaceStyles from './WorkspaceSurface.module.css'
import styles from './TradeBoardWorkspaceCard.module.css'

const BOARD_GRID_PAGE_SIZE = 24

type TradeBoardState = {
  status: 'loading' | 'ready' | 'error'
  board?: BoardResult
  hasMoreListings?: boolean
}

type TradeBoardActionState = {
  pendingKey: string | null
  error: string | null
  helperMessage: string | null
}

type TradeRequestsState = {
  status: 'loading' | 'ready' | 'error'
  requests?: TradeRequestWithListing[]
  pendingCount?: number
}

type FulfillmentQueueState = {
  status: 'loading' | 'ready' | 'error'
  items?: FulfillmentLogItem[]
  total?: number
  totalOpen?: number
  page?: number
  pageSize?: number
}

type TradeSwapCleanupState = {
  status: 'loading' | 'ready' | 'error'
  items?: TradeSwapCleanupItem[]
}

export type TradeBoardWorkspaceCardProps = {
  tradeBoardState: TradeBoardState
  visibleListings?: TradeListingWithDesign[]
  tradeBoardSearchQuery: string
  onTradeBoardSearchQueryChange: (value: string) => void
  quickAddItemNumber: string
  onQuickAddItemNumberChange: (value: string) => void
  actionState: TradeBoardActionState
  tradeRequestsState: TradeRequestsState
  inboxLoadError?: boolean
  fulfillmentQueueState: FulfillmentQueueState
  fulfillmentLogView?: { filter: FulfillmentLogFilter; page: number }
  onFulfillmentLogViewChange?: (view: { filter: FulfillmentLogFilter; page: number }) => void
  tradeSwapCleanupState?: TradeSwapCleanupState
  onQuickAddListing: () => void
  onRemoveListing: (listingId: string) => void
  onReviewRequest: (requestId: string, action?: 'approve' | 'reject') => void
  onAdvanceFulfillment: (
    requestId: string,
    nextStatus: 'approved' | 'shipped' | 'completed',
    shippingNotes?: string,
  ) => void
  hasMoreListings?: boolean
  onEnsureInventoryBrowseLoaded?: () => Promise<void>
  isInventoryBrowseLoading?: boolean
  onSoundSettingsTarget: (target: HTMLElement | null) => void
}

function getTradeListingPhotoUrl(listing: TradeListingWithDesign) {
  return getTradeListingDisplayFields(listing).photoUrl
}

function getTradeListingPhotoSourceLabel(listing: TradeListingWithDesign) {
  const display = getTradeListingDisplayFields(listing)
  if (display.listingPhotoUrl) return 'custom listing photo'
  if (display.canonicalPhotoUrl && listing.uses_canonical_photo) {
    return 'catalog photo'
  }
  return 'no photo yet'
}

function formatFulfillmentTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
    : value
}

export function TradeBoardWorkspaceCard({
  tradeBoardState,
  visibleListings,
  tradeBoardSearchQuery,
  onTradeBoardSearchQueryChange,
  quickAddItemNumber,
  onQuickAddItemNumberChange,
  actionState,
  tradeRequestsState,
  inboxLoadError = false,
  fulfillmentQueueState,
  fulfillmentLogView = { filter: 'open', page: 1 },
  onFulfillmentLogViewChange = () => {},
  tradeSwapCleanupState = { status: 'ready', items: [] },
  onQuickAddListing,
  onRemoveListing,
  onReviewRequest,
  onAdvanceFulfillment,
  hasMoreListings = false,
  onEnsureInventoryBrowseLoaded,
  isInventoryBrowseLoading = false,
  onSoundSettingsTarget,
}: TradeBoardWorkspaceCardProps) {
  const [previewListing, setPreviewListing] = useState<TradeListingWithDesign | null>(
    null,
  )
  const [inventoryJewelryType, setInventoryJewelryType] = useState('')
  const [inventoryCollection, setInventoryCollection] = useState('')
  const [inventoryRarity, setInventoryRarity] = useState('')
  const [inventoryMaterial, setInventoryMaterial] = useState('')
  const [inventorySize, setInventorySize] = useState('')
  const [inventorySortMode, setInventorySortMode] = useState<
    'newest' | 'collection' | 'type' | 'rarity' | 'name'
  >('newest')
  const [inventoryVisibleCount, setInventoryVisibleCount] = useState(BOARD_GRID_PAGE_SIZE)
  const [isFilterDisclosureOpen, setIsFilterDisclosureOpen] = useState(false)
  const [shippingNoteDrafts, setShippingNoteDrafts] = useState<Record<string, string>>({})

  const boardSummary = tradeBoardState.board?.summary
  const boardListings = (visibleListings ?? tradeBoardState.board?.listings ?? []).filter(
    (listing) => listing.status === 'available',
  )
  const inventoryFilters = {
    search: tradeBoardSearchQuery,
    jewelryType: inventoryJewelryType,
    collection: inventoryCollection,
    rarity: inventoryRarity,
    material: inventoryMaterial,
    size: inventorySize,
    sortMode: inventorySortMode,
  }
  const hasActiveInventoryBrowse = hasActiveBoardInventoryBrowse(inventoryFilters)
  const inventoryOptions = getBoardInventoryOptions(boardListings)
  const inventoryResults = getBoardInventoryResults(boardListings, inventoryFilters)
  const visibleInventoryResults = inventoryResults.slice(0, inventoryVisibleCount)
  const requests = tradeRequestsState.requests ?? []
  const queueItems = fulfillmentQueueState.items ?? []
  const openFulfillmentCount = fulfillmentQueueState.totalOpen ?? 0
  const cleanupItems = tradeSwapCleanupState.items ?? []
  const pendingCount = tradeRequestsState.pendingCount
  const tradeWorkCount = (pendingCount ?? requests.length) + cleanupItems.length + openFulfillmentCount
  const tradeStatusReady =
    tradeRequestsState.status === 'ready' &&
    tradeSwapCleanupState.status === 'ready' &&
    fulfillmentQueueState.status === 'ready'
  useEffect(() => {
    if (!hasMoreListings) return
    if (!hasActiveInventoryBrowse) return
    void onEnsureInventoryBrowseLoaded?.()
  }, [
    hasActiveInventoryBrowse,
    hasMoreListings,
    onEnsureInventoryBrowseLoaded,
  ])

  function handleResetInventoryBrowse() {
    onTradeBoardSearchQueryChange('')
    setInventoryJewelryType('')
    setInventoryCollection('')
    setInventoryRarity('')
    setInventoryMaterial('')
    setInventorySize('')
    setInventorySortMode('newest')
    setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
    setIsFilterDisclosureOpen(false)
  }

  return (
    <div className={styles.stack}>
      <section className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div>
            <div className={surfaceStyles.cardTitle}>Dance Floor Management</div>
          </div>
        </div>
        {actionState.error ? (
          <div className={surfaceStyles.actionError}>{actionState.error}</div>
        ) : null}
        {actionState.helperMessage ? (
          <div className={surfaceStyles.helperMessage}>{actionState.helperMessage}</div>
        ) : null}
      </section>

      <section className={styles.summaryCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={surfaceStyles.walletSettingsTitle}>Today&apos;s trade work</div>
            <div className={surfaceStyles.helperNote}>
              {tradeStatusReady
                ? tradeWorkCount > 0
                  ? `${tradeWorkCount} item${tradeWorkCount === 1 ? '' : 's'} need attention. Start with requests, then trade follow-up, then fulfillment.`
                  : 'Everything is caught up. New requests, trade follow-up, and fulfillment work will land here.'
                : tradeRequestsState.status === 'error' && pendingCount !== undefined
                  ? 'Cannot refresh requests right now. Showing the last known pending count.'
                  : 'Checking requests, trade follow-up, and fulfillment.'}
            </div>
          </div>
        </div>
        <div ref={onSoundSettingsTarget} className={styles.tradeSoundSlot} />
        <div className={styles.summaryStats} aria-label="Dance Floor work summary">
          <div className={styles.summaryStat}>
            <span className={styles.summaryCount}>
              {boardSummary?.availableDancerCount ?? (tradeBoardState.status === 'loading' ? '…' : '—')}
            </span>
            <span className={styles.summaryLabel}>Dancers on the Floor</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryCount}>
              {boardSummary?.newDancersTodayCount ?? (tradeBoardState.status === 'loading' ? '…' : '—')}
            </span>
            <span className={styles.summaryLabel}>New dancers today</span>
          </div>
          <div
            className={`${styles.summaryStat} ${
              requests.length > 0 ? styles.summaryStatActive : ''
            }`}
          >
            <span className={styles.summaryCount}>
              {pendingCount ?? (tradeRequestsState.status === 'loading' ? '…' : '—')}
            </span>
            <span className={styles.summaryLabel}>Pending requests</span>
          </div>
          <div
            className={`${styles.summaryStat} ${
              cleanupItems.length > 0 ? styles.summaryStatActive : ''
            }`}
          >
            <span className={styles.summaryCount}>
              {tradeSwapCleanupState.status === 'ready' ? cleanupItems.length : '...'}
            </span>
            <span className={styles.summaryLabel}>Follow-ups</span>
          </div>
          <div
            className={`${styles.summaryStat} ${
              openFulfillmentCount > 0 ? styles.summaryStatActive : ''
            }`}
          >
            <span className={styles.summaryCount}>
              {fulfillmentQueueState.totalOpen ?? '...'}
            </span>
            <span className={styles.summaryLabel}>Fulfillment swaps</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={surfaceStyles.walletSettingsTitle}>Quick add</div>
            <div className={surfaceStyles.helperNote}>
              Know the item number? Add a dancer in one step.
            </div>
          </div>
        </div>
        {tradeBoardState.status === 'ready' && boardSummary ? (
          <div className={styles.quickAddRow}>
            <label className={surfaceStyles.searchField}>
              <span className={surfaceStyles.searchLabel}>Quick add by item number</span>
              <input
                type="text"
                className={`${surfaceStyles.searchInput} ph-no-capture`}
                value={quickAddItemNumber}
                onChange={(event) =>
                  onQuickAddItemNumberChange(event.target.value.toUpperCase())
                }
                placeholder="RG100"
              />
            </label>
            <button
              type="button"
              className={surfaceStyles.actionButton}
              disabled={actionState.pendingKey === 'quick-add'}
              onClick={onQuickAddListing}
            >
              {actionState.pendingKey === 'quick-add' ? 'Adding...' : 'Add dancer'}
            </button>
          </div>
        ) : (
          <div className={surfaceStyles.cardFill}>
            <div className={surfaceStyles.loadingLine} />
            <div className={surfaceStyles.loadingLineShort} />
          </div>
        )}
      </section>

      <section className={styles.sectionCard} id="trade-fulfillment-log">
        <div className={styles.sectionHeader}>
          <div>
            <div className={surfaceStyles.walletSettingsTitle}>Trade fulfillment log</div>
            <div className={surfaceStyles.helperNote}>
              Track approved swaps and mark post-show logistics done. Recent 90 days stay here for reference.
            </div>
          </div>
          <span className={surfaceStyles.rosterTag}>{openFulfillmentCount} open</span>
        </div>
        <div className={styles.fulfillmentTabs} role="group" aria-label="Trade fulfillment filter">
          {(['open', 'done', 'all'] as const).map((filter) => (
            <button key={filter} type="button"
              className={fulfillmentLogView.filter === filter ? styles.boardChipActive : styles.boardChip}
              aria-pressed={fulfillmentLogView.filter === filter}
              onClick={() => onFulfillmentLogViewChange({ filter, page: 1 })}>
              {filter === 'open' ? 'Open' : filter === 'done' ? 'Done' : 'All'}
            </button>
          ))}
        </div>
        {fulfillmentQueueState.status === 'error' ? (
          <p role="alert" className={surfaceStyles.helperNote}>Could not load the trade log. Try another tab to retry.</p>
        ) : fulfillmentQueueState.status === 'loading' ? (
          <div className={surfaceStyles.cardFill}><div className={surfaceStyles.loadingLine} /></div>
        ) : queueItems.length === 0 ? (
          <p className={surfaceStyles.helperNote}>No {fulfillmentLogView.filter} trades in the last 90 days.</p>
        ) : (
          <div className={styles.tradeList}>
            {queueItems.map((item) => {
              const notes = shippingNoteDrafts[item.fulfillmentId] ?? item.shippingNotes
              const pending = actionState.pendingKey === `fulfillment:${item.requestId}`
              return <article key={item.fulfillmentId} className={styles.tradeRow}>
                <div className={styles.fulfillmentRowHeader}>
                  <div className={styles.tradeIdentity}>
                    <strong className={styles.customerName}>{item.customerName}</strong>
                    <span className={styles.customerDate}>
                      Approved <time dateTime={item.approvedAt}>{formatFulfillmentTime(item.approvedAt)}</time>
                      {' · '}Updated <time dateTime={item.statusUpdatedAt}>{formatFulfillmentTime(item.statusUpdatedAt)}</time>
                      {' · '}{item.status}
                    </span>
                  </div>
                  <label className={styles.fulfillmentDoneControl}>
                    <input type="checkbox" checked={item.status === 'completed'} disabled={pending}
                      onChange={() => onAdvanceFulfillment(item.requestId,
                        item.status === 'completed' ? 'approved' : 'completed')} />
                    <span>{pending ? 'Saving…' : item.status === 'completed' ? 'Done' : 'Mark done'}</span>
                  </label>
                </div>
                <div className={styles.fulfillmentPieces}>
                  <div><span className={styles.fulfillmentFieldLabel}>Gave</span><span>{item.gave}</span></div>
                  <div><span className={styles.fulfillmentFieldLabel}>Got / reveal</span><span>{item.got}</span></div>
                </div>
                {item.hasRevealScreenshot ? (
                  <TradeScreenshotLink requestId={item.requestId} customerName={item.customerName}
                    className={styles.tradeScreenshotLink} imageClassName={styles.tradeScreenshotThumb}>
                    <span>View protected reveal screenshot</span>
                  </TradeScreenshotLink>
                ) : <span className={surfaceStyles.helperNote}>Reveal screenshot unavailable or expired</span>}
                <div className={styles.fulfillmentNotesRow}>
                  <label className={surfaceStyles.searchField}>
                    <span className={surfaceStyles.searchLabel}>Shipping notes</span>
                    <input type="text" maxLength={300} className={`${surfaceStyles.searchInput} ph-no-capture`}
                      value={notes} onChange={(event) => setShippingNoteDrafts((drafts) => ({
                        ...drafts, [item.fulfillmentId]: event.target.value,
                      }))} placeholder="Tracking, swap details, or pickup" />
                  </label>
                  <button type="button" className={surfaceStyles.helperButton}
                    disabled={pending || notes === item.shippingNotes}
                    onClick={() => onAdvanceFulfillment(item.requestId, item.status, notes)}>
                    Save note
                  </button>
                </div>
                <span className={styles.fulfillmentId}>Request {item.requestId} · Trade {item.fulfillmentId}</span>
              </article>
            })}
          </div>
        )}
        {(fulfillmentQueueState.total ?? 0) > (fulfillmentQueueState.pageSize ?? 10) ? (
          <div className={styles.fulfillmentPagination}>
            <button type="button" className={surfaceStyles.helperButton}
              disabled={fulfillmentLogView.page <= 1}
              onClick={() => onFulfillmentLogViewChange({ ...fulfillmentLogView, page: fulfillmentLogView.page - 1 })}>
              Previous
            </button>
            <span>Page {fulfillmentLogView.page} of {Math.ceil((fulfillmentQueueState.total ?? 0) / 10)}</span>
            <button type="button" className={surfaceStyles.helperButton}
              disabled={fulfillmentLogView.page * 10 >= (fulfillmentQueueState.total ?? 0)}
              onClick={() => onFulfillmentLogViewChange({ ...fulfillmentLogView, page: fulfillmentLogView.page + 1 })}>
              Next
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={surfaceStyles.walletSettingsTitle}>Browse dancers</div>
            <div className={surfaceStyles.helperNote}>
              Browse the same dancers your customers see.
            </div>
          </div>
          <span className={surfaceStyles.rosterTag}>
            {tradeBoardState.status === 'ready' && boardSummary
              ? boardSummary.availableDancerCount === undefined
                ? 'Dancer count unavailable'
                : `${boardSummary.availableDancerCount} live dancer${boardSummary.availableDancerCount === 1 ? '' : 's'}`
              : 'Loading Dance Floor'}
          </span>
        </div>
        {tradeBoardState.status === 'ready' && boardSummary ? (
          <>
            <div className={styles.boardSearchRow}>
              <label className={surfaceStyles.searchField}>
                <span className={surfaceStyles.searchLabel}>Search Dance Floor</span>
                <input
                  type="search"
                  className={`${surfaceStyles.searchInput} ph-no-capture`}
                  value={tradeBoardSearchQuery}
                  onChange={(event) => {
                    setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                    onTradeBoardSearchQueryChange(event.target.value)
                  }}
                  placeholder="Search by dancer, collection, size"
                />
              </label>
              <label className={surfaceStyles.searchField}>
                <span className={surfaceStyles.searchLabel}>Sort dancers</span>
                <select
                  className={`${surfaceStyles.selectInput} ${styles.boardInventorySelect}`}
                  value={inventorySortMode}
                  onChange={(event) => {
                    setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                    setInventorySortMode(event.target.value as typeof inventorySortMode)
                  }}
                >
                  <option value="newest">Newest added</option>
                  <option value="collection">Collection</option>
                  <option value="type">Jewelry type</option>
                  <option value="rarity">Rare first</option>
                  <option value="name">Dancer name</option>
                </select>
              </label>
            </div>
            <div className={styles.boardPrimaryFilters} aria-label="Dance Floor filters">
              <div className={styles.boardFilterChips} aria-label="Filter by jewelry type">
                <button
                  type="button"
                  className={inventoryJewelryType === '' ? styles.boardChipActive : styles.boardChip}
                  onClick={() => {
                    setInventoryJewelryType('')
                    setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                  }}
                >
                  All types
                </button>
                {inventoryOptions.jewelryTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={inventoryJewelryType === type ? styles.boardChipActive : styles.boardChip}
                    onClick={() => {
                      setInventoryJewelryType(type)
                      setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                    }}
                  >
                    {TRADE_LISTING_TYPE_LABELS[type as keyof typeof TRADE_LISTING_TYPE_LABELS]}
                  </button>
                ))}
              </div>
              <div className={styles.boardFilterChips} aria-label="Filter by rarity">
                <button
                  type="button"
                  className={inventoryRarity === '' ? styles.boardChipActive : styles.boardChip}
                  onClick={() => {
                    setInventoryRarity('')
                    setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                  }}
                >
                  All rarity
                </button>
                {inventoryOptions.rarities.map((rarity) => (
                  <button
                    key={rarity}
                    type="button"
                    className={inventoryRarity === rarity ? styles.boardChipActive : styles.boardChip}
                    onClick={() => {
                      setInventoryRarity(rarity)
                      setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                    }}
                  >
                    {rarity === 'unicorn' ? 'Unicorn' : 'Diamond'}
                  </button>
                ))}
              </div>
              {inventoryOptions.collections.length > 0 ? (
                <div className={styles.boardFilterChips} aria-label="Filter by collection">
                  {inventoryOptions.collections.map((collection) => (
                    <button
                      key={collection}
                      type="button"
                      className={inventoryCollection === collection ? styles.boardChipActive : styles.boardChip}
                      onClick={() => {
                        setInventoryCollection(inventoryCollection === collection ? '' : collection)
                        setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                      }}
                    >
                      {collection}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {hasActiveInventoryBrowse ? (
              <button
                type="button"
                className={`${surfaceStyles.helperButton} ${styles.boardClearFilters}`}
                onClick={handleResetInventoryBrowse}
              >
                Clear filters
              </button>
            ) : null}
            <details
              className={styles.filterDisclosure}
              open={isFilterDisclosureOpen}
              onToggle={(event) =>
                setIsFilterDisclosureOpen(event.currentTarget.open)
              }
            >
              <summary className={styles.filterSummary} aria-label="Filters">
                More filters
              </summary>
              <div className={styles.filterGrid}>
                <select
                  aria-label="Material"
                  value={inventoryMaterial}
                  className={`${surfaceStyles.selectInput} ${styles.boardInventorySelect}`}
                  disabled={boardListings.length === 0}
                  onChange={(event) => {
                    setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                    setInventoryMaterial(event.target.value)
                  }}
                >
                  <option value="">All materials</option>
                  {inventoryOptions.materials.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Size"
                  value={inventorySize}
                  className={`${surfaceStyles.selectInput} ${styles.boardInventorySelect}`}
                  disabled={boardListings.length === 0}
                  onChange={(event) => {
                    setInventoryVisibleCount(BOARD_GRID_PAGE_SIZE)
                    setInventorySize(event.target.value)
                  }}
                >
                  <option value="">All sizes</option>
                  {inventoryOptions.sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </details>
            {inventoryResults.length > 0 ? (
                <div
                  className={styles.boardInventoryGridShell}
                  aria-label="Dance Floor dancers"
                >
                  <div className={styles.boardInventoryGridHeader}>
                    <span className={surfaceStyles.helperNote}>
                      Showing {visibleInventoryResults.length} of {hasActiveInventoryBrowse
                        ? `${inventoryResults.length}${hasMoreListings ? '+' : ''}`
                        : boardSummary.availableDancerCount ?? `${inventoryResults.length}${hasMoreListings ? '+' : ''}`} dancers
                    </span>
                  </div>
                  {isInventoryBrowseLoading ? (
                    <div className={surfaceStyles.helperNote}>Loading Dance Floor dancers...</div>
                  ) : null}
                  <div className={styles.boardInventoryGrid}>
                    {visibleInventoryResults.map((listing) => {
                      const photoUrl = getTradeListingPhotoUrl(listing)
                      const display = getTradeListingDisplayFields(listing)
                      const material = getBoardInventoryMaterial(listing)
                      const stone = display.mainStone ?? (display.listingSource === 'non_item_number' ? 'Shown in photo' : null)
                      const rarity = listing.rarity_classification ?? listing.design?.rarity_classification ?? 'standard'
                      return (
                        <article key={listing.id} className={styles.boardInventoryPieceCard}>
                          <button
                            type="button"
                            className={styles.boardInventoryMediaButton}
                            aria-label={`View ${display.designName}`}
                            onClick={() => setPreviewListing(listing)}
                          >
                            <span className={styles.boardInventoryMedia}>
                              {rarity !== 'standard' ? (
                                <span className={styles.boardRarityBadge}>
                                  {rarity === 'unicorn' ? 'Unicorn' : 'Diamond'}
                                </span>
                              ) : null}
                              {photoUrl ? (
                                <img
                                  className={styles.tradePieceImage}
                                  src={photoUrl}
                                  alt={display.designName}
                                  loading="lazy"
                                />
                              ) : (
                                <span className={styles.tradePieceFallback}>
                                  {display.typePrefix}
                                </span>
                              )}
                            </span>
                          </button>
                          <div className={styles.boardInventoryPieceBody}>
                            <div className={styles.boardCardCollection}>{display.collectionName ?? 'Jewelry'}</div>
                            <div className={styles.customerName}>{display.designName}</div>
                            <div className={styles.tradePieceMetaLine}>
                              {display.typeLabel}{display.size ? ` · Size ${display.size}` : ''}
                            </div>
                            <div className={styles.tradePieceQuantity}>
                              {Math.max(0, listing.quantity_available ?? 1)} available
                            </div>
                            {material || stone ? (
                              <div className={styles.tradePieceMetaLine}>
                                {[material, stone].filter(Boolean).join(' · ')}
                              </div>
                            ) : null}
                            <button type="button" className={styles.boardCardViewButton} onClick={() => setPreviewListing(listing)}>
                              View dancer
                            </button>
                          </div>
                          <button
                            type="button"
                            className={`${surfaceStyles.helperButton} ${styles.inventoryButton} ${styles.boardInventoryRemoveButton}`}
                            disabled={actionState.pendingKey === `remove:${listing.id}`}
                            onClick={() => onRemoveListing(listing.id)}
                          >
                            {actionState.pendingKey === `remove:${listing.id}`
                              ? 'Removing...'
                              : 'Remove'}
                          </button>
                        </article>
                      )
                    })}
                  </div>
                  {inventoryVisibleCount < inventoryResults.length || hasMoreListings ? (
                    <button
                      type="button"
                      className={`${surfaceStyles.helperButton} ${styles.boardLoadMore}`}
                      disabled={isInventoryBrowseLoading}
                      onClick={async () => {
                        if (inventoryVisibleCount >= inventoryResults.length && hasMoreListings) {
                          await onEnsureInventoryBrowseLoaded?.()
                        }
                        setInventoryVisibleCount((count) => count + BOARD_GRID_PAGE_SIZE)
                      }}
                    >
                      {isInventoryBrowseLoading ? 'Loading dancers…' : 'Load more'}
                    </button>
                  ) : null}
                </div>
            ) : (
                <div className={surfaceStyles.emptyState}>
                  {isInventoryBrowseLoading
                    ? 'Loading Dance Floor dancers...'
                    : boardListings.length === 0
                      ? 'Your Dance Floor is empty. Add a dancer to show it here.'
                      : 'No dancers match these filters. Clear filters or try another search.'}
                </div>
            )}
            {previewListing ? (() => {
              const previewDisplay = getTradeListingDisplayFields(previewListing)
              const previewPhotoUrl = getTradeListingPhotoUrl(previewListing)
              return (
                <div
                  className={styles.imagePreviewMask}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${previewDisplay.designName} dancer details`}
                  onClick={() => setPreviewListing(null)}
                >
                  <div
                    className={styles.imagePreviewDialog}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={styles.imagePreviewClose}
                      aria-label="Close image preview"
                      onClick={() => setPreviewListing(null)}
                    >
                      x
                    </button>
                    <div className={styles.imagePreviewFrame}>
                      {previewPhotoUrl ? (
                        <img
                          src={previewPhotoUrl}
                          alt={previewDisplay.designName}
                          className={styles.imagePreviewImage}
                        />
                      ) : (
                        <div className={styles.tradePieceFallback}>
                          {previewDisplay.typePrefix}
                        </div>
                      )}
                    </div>
                    <div className={surfaceStyles.walletSettingsTitle}>
                      {previewDisplay.designName}
                    </div>
                    <div className={surfaceStyles.helperNote}>
                      {[previewDisplay.collectionName, previewDisplay.typeLabel, previewDisplay.size ? `Size ${previewDisplay.size}` : null].filter(Boolean).join(' · ')}
                    </div>
                    <div className={surfaceStyles.helperNote}>
                      {Math.max(0, previewListing.quantity_available ?? 1)} available
                      {getBoardInventoryMaterial(previewListing) ? ` · ${getBoardInventoryMaterial(previewListing)}` : ''}
                      {previewDisplay.mainStone ? ` · ${previewDisplay.mainStone}` : ''}
                    </div>
                    {previewDisplay.itemNumber ? (
                      <div className={surfaceStyles.helperNote}>Item {previewDisplay.itemNumber}</div>
                    ) : null}
                    <div className={surfaceStyles.helperNote}>
                      Image source: {getTradeListingPhotoSourceLabel(previewListing)}
                    </div>
                  </div>
                </div>
              )
            })() : null}
          </>
        ) : (
          <div className={surfaceStyles.cardFill}>
            <div className={surfaceStyles.loadingLine} />
            <div className={surfaceStyles.loadingLineShort} />
          </div>
        )}
      </section>

      {requests.length > 0 ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={surfaceStyles.walletSettingsTitle}>Request inbox</div>
              <div className={surfaceStyles.helperNote}>
                Review each request, check the screenshot if there is one, and approve the right swap.
              </div>
            </div>
            <span className={surfaceStyles.rosterTag}>{`${pendingCount ?? requests.length} pending`}</span>
          </div>
          {inboxLoadError ? <p className={surfaceStyles.helperNote} role="status">Could not load the full request inbox. Showing the last available requests; try again shortly.</p> : null}
          <div className={styles.tradeList}>
            {requests.map((request) => {
              const ruleCheckTarget = request.listing.design.collectionName
                ? `${request.listing.design.typePrefix} / ${request.listing.design.collectionName}`
                : request.listing.design.typePrefix
              const requestedItemLabel = request.listing.design.itemNumber
                ? `${request.listing.design.itemNumber} - ${request.listing.design.designName}`
                : `${request.listing.design.designName}${
                    request.listing.repFacingNote ? ` ${request.listing.repFacingNote}` : ''
                  }`

              return (
                <div key={request.id} className={styles.tradeRow}>
                  <div className={styles.tradeIdentity}>
                    <div className={styles.customerName}>{request.customerName}</div>
                    <div className={styles.customerDate}>
                      Wants {requestedItemLabel}
                    </div>
                    <div className={surfaceStyles.helperNote}>{request.customerDescription}</div>
                    {request.revealScreenshot ? (
                      <TradeScreenshotLink requestId={request.id} customerName={request.customerName} className={styles.tradeScreenshotLink} imageClassName={styles.tradeScreenshotThumb}>
                        <span>
                          <span className={styles.tradeScreenshotTitle}>
                            Reveal screenshot
                          </span>
                          <span className={styles.tradeScreenshotMeta}>
                            View customer upload
                          </span>
                        </span>
                      </TradeScreenshotLink>
                    ) : null}
                    <div className={surfaceStyles.helperNote}>Rule check: compare against {ruleCheckTarget}</div>
                    {'manualReviewRequested' in request && request.manualReviewRequested && 'screening' in request && request.screening?.status === 'mismatch' ? (
                      <div className={styles.tradeException}><strong>Rule exception — rep review needed.</strong> {request.screening.reason}</div>
                    ) : null}
                  </div>
                  <div className={`${surfaceStyles.actionRow} ${styles.tradeActions}`}>
                    <button
                      type="button"
                      className={surfaceStyles.actionButton}
                      disabled={actionState.pendingKey === `approve:${request.id}`}
                      onClick={() => onReviewRequest(request.id, 'approve')}
                    >
                      {actionState.pendingKey === `approve:${request.id}`
                        ? 'Approving...'
                        : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className={surfaceStyles.helperButton}
                      disabled={actionState.pendingKey === `reject:${request.id}`}
                      onClick={() => onReviewRequest(request.id, 'reject')}
                    >
                      {actionState.pendingKey === `reject:${request.id}`
                        ? 'Denying...'
                        : 'Deny'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {tradeSwapCleanupState.status === 'ready' && cleanupItems.length > 0 ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={surfaceStyles.walletSettingsTitle}>Trade follow-up</div>
              <div className={surfaceStyles.helperNote}>
                Approved trades stay here until the missing ring size or catalog details are finished.
              </div>
            </div>
            <span className={surfaceStyles.rosterTag}>{`${cleanupItems.length} to finish`}</span>
          </div>
          <div className={styles.tradeList}>
            {cleanupItems.map((item) => (
              <div key={item.swapId} className={styles.tradeRow}>
                <div className={styles.tradeIdentity}>
                  <div className={styles.customerName}>{item.customerName}</div>
                  <div className={styles.customerDate}>
                    Revealed item number: {item.revealedItemNumber}
                  </div>
                  <div className={surfaceStyles.helperNote}>
                    {item.replacementStatus === 'needs_ring_size'
                      ? 'Add ring size to put this reveal back on the Dance Floor.'
                      : 'Finish catalog details after the show to put this reveal back on the Dance Floor.'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

    </div>
  )
}

