'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

import { getTradeListingDisplayFields } from '@/lib/services/trade-listing-display'
import type {
  BoardResult,
  FulfillmentQueueItem,
  TradeListingWithDesign,
  TradeRequestWithListing,
  TradeSwapCleanupItem,
} from '@/lib/services/types'
import {
  getBoardInventoryOptions,
  getBoardInventoryResults,
  getCarouselWindow,
  hasActiveBoardInventoryBrowse,
} from '@/lib/nic-nac/board-inventory-view'
import { buildCustomerTradeBoardHref } from '@/lib/nic-nac/rep-links'
import { TradeScreenshotLink } from './TradeScreenshotLink'
import surfaceStyles from './WorkspaceSurface.module.css'
import styles from './TradeBoardWorkspaceCard.module.css'

const BOARD_INVENTORY_MOBILE_QUERY = '(max-width: 840px)'

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
  items?: FulfillmentQueueItem[]
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
  tradeSwapCleanupState?: TradeSwapCleanupState
  onQuickAddListing: () => void
  onRemoveListing: (listingId: string) => void
  onReviewRequest: (requestId: string, action?: 'approve' | 'reject') => void
  onAdvanceFulfillment: (
    requestId: string,
    nextStatus: 'shipped' | 'completed',
  ) => void
  customerBoardHref?: string
  onOpenCustomerBoardPreview?: () => void
  hasMoreListings?: boolean
  onEnsureInventoryBrowseLoaded?: () => Promise<void>
  isInventoryBrowseLoading?: boolean
}

function subscribeBoardInventoryViewport(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  const mediaQuery = window.matchMedia(BOARD_INVENTORY_MOBILE_QUERY)
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

function getBoardInventoryPageSizeSnapshot() {
  if (typeof window === 'undefined') return 3
  return window.matchMedia(BOARD_INVENTORY_MOBILE_QUERY).matches ? 1 : 3
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

function getNextFulfillmentStatus(status: FulfillmentQueueItem['status']) {
  if (status === 'approved') return 'shipped'
  if (status === 'shipped') return 'completed'
  return null
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
  tradeSwapCleanupState = { status: 'ready', items: [] },
  onQuickAddListing,
  onRemoveListing,
  onReviewRequest,
  onAdvanceFulfillment,
  customerBoardHref = buildCustomerTradeBoardHref(),
  onOpenCustomerBoardPreview,
  hasMoreListings = false,
  onEnsureInventoryBrowseLoaded,
  isInventoryBrowseLoading = false,
}: TradeBoardWorkspaceCardProps) {
  const [previewListing, setPreviewListing] = useState<TradeListingWithDesign | null>(
    null,
  )
  const [inventoryJewelryType, setInventoryJewelryType] = useState('')
  const [inventoryCollection, setInventoryCollection] = useState('')
  const [inventoryCarouselIndex, setInventoryCarouselIndex] = useState(0)
  const [isFilterDisclosureOpen, setIsFilterDisclosureOpen] = useState(false)

  const boardSummary = tradeBoardState.board?.summary
  const boardListings = (visibleListings ?? tradeBoardState.board?.listings ?? []).filter(
    (listing) => listing.status === 'available',
  )
  const inventoryFilters = {
    search: tradeBoardSearchQuery,
    jewelryType: inventoryJewelryType,
    collection: inventoryCollection,
  }
  const hasActiveInventoryBrowse = hasActiveBoardInventoryBrowse(inventoryFilters)
  const inventoryOptions = getBoardInventoryOptions(boardListings)
  const inventoryResults = getBoardInventoryResults(boardListings, inventoryFilters)
  const inventoryCarouselPageSize = useSyncExternalStore(
    subscribeBoardInventoryViewport,
    getBoardInventoryPageSizeSnapshot,
    () => 3,
  )
  const carousel = getCarouselWindow(
    inventoryResults,
    inventoryCarouselIndex,
    inventoryCarouselPageSize,
  )
  const requests = tradeRequestsState.requests ?? []
  const queueItems = fulfillmentQueueState.items ?? []
  const cleanupItems = tradeSwapCleanupState.items ?? []
  const pendingCount = tradeRequestsState.pendingCount
  const tradeWorkCount = (pendingCount ?? requests.length) + cleanupItems.length + queueItems.length
  const tradeStatusReady =
    tradeRequestsState.status === 'ready' &&
    tradeSwapCleanupState.status === 'ready' &&
    fulfillmentQueueState.status === 'ready'
  const hasActiveBrowseCriteria =
    tradeBoardSearchQuery.trim() !== '' ||
    inventoryJewelryType !== '' ||
    inventoryCollection !== ''

  useEffect(() => {
    if (!hasMoreListings) return
    if (!hasActiveBrowseCriteria && !isFilterDisclosureOpen) return
    void onEnsureInventoryBrowseLoaded?.()
  }, [
    hasActiveBrowseCriteria,
    hasMoreListings,
    isFilterDisclosureOpen,
    onEnsureInventoryBrowseLoaded,
  ])

  function handleResetInventoryBrowse() {
    onTradeBoardSearchQueryChange('')
    setInventoryJewelryType('')
    setInventoryCollection('')
    setInventoryCarouselIndex(0)
    setIsFilterDisclosureOpen(false)
  }

  return (
    <div className={styles.stack}>
      <section className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div>
            <div className={surfaceStyles.cardTitle}>Dance Floor</div>
            <div className={surfaceStyles.cardSubtitle}>
              Keep today&apos;s swaps, quick adds, and Dance Floor checks moving without
              digging through the whole queue.
            </div>
            <div className={surfaceStyles.helperNote}>
              Live-show tip: ask customers to save a screenshot of their reveal before leaving it. They can crop personal or order details before uploading it with a request.
            </div>
          </div>
          <div className={styles.heroActions}>
            {onOpenCustomerBoardPreview ? (
              <button
                type="button"
                className={surfaceStyles.helperButton}
                onClick={onOpenCustomerBoardPreview}
              >
                Customer view
              </button>
            ) : (
              <a
                className={surfaceStyles.helperLink}
                href={customerBoardHref}
                target="_blank"
                rel="noreferrer"
              >
                Customer view
              </a>
            )}
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
        <div className={styles.summaryStats} aria-label="Dance Floor work summary">
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
              queueItems.length > 0 ? styles.summaryStatActive : ''
            }`}
          >
            <span className={styles.summaryCount}>
              {fulfillmentQueueState.status === 'ready' ? queueItems.length : '...'}
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

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={surfaceStyles.walletSettingsTitle}>Browse dancers</div>
            <div className={surfaceStyles.helperNote}>
              Start with search. Open filters only when you need a tighter match.
            </div>
          </div>
          <span className={surfaceStyles.rosterTag}>
            {tradeBoardState.status === 'ready' && boardSummary
              ? `${boardSummary.totalPieces} live dancer${boardSummary.totalPieces === 1 ? '' : 's'}`
              : 'Loading Dance Floor'}
          </span>
        </div>
        {tradeBoardState.status === 'ready' && boardSummary ? (
          <>
            <label className={surfaceStyles.searchField}>
              <span className={surfaceStyles.searchLabel}>Search your active dancers</span>
              <input
                type="text"
                className={`${surfaceStyles.searchInput} ph-no-capture`}
                value={tradeBoardSearchQuery}
                onChange={(event) => {
                  setInventoryCarouselIndex(0)
                  onTradeBoardSearchQueryChange(event.target.value)
                }}
                placeholder="Search by item number, design, or collection"
              />
            </label>
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
                  aria-label="Jewelry Type"
                  value={inventoryJewelryType}
                  className={`${surfaceStyles.selectInput} ${styles.boardInventorySelect}`}
                  disabled={boardListings.length === 0}
                  onChange={(event) => {
                    setInventoryCarouselIndex(0)
                    setInventoryJewelryType(event.target.value)
                  }}
                >
                  <option value="">Jewelry Type</option>
                  {inventoryOptions.jewelryTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Collection"
                  value={inventoryCollection}
                  className={`${surfaceStyles.selectInput} ${styles.boardInventorySelect}`}
                  disabled={boardListings.length === 0}
                  onChange={(event) => {
                    setInventoryCarouselIndex(0)
                    setInventoryCollection(event.target.value)
                  }}
                >
                  <option value="">Collection</option>
                  {inventoryOptions.collections.map((collection) => (
                    <option key={collection} value={collection}>
                      {collection}
                    </option>
                  ))}
                </select>
                {hasActiveInventoryBrowse ? (
                  <button
                    type="button"
                    className={`${surfaceStyles.helperButton} ${styles.inventoryButton}`}
                    onClick={handleResetInventoryBrowse}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </details>
            {hasActiveInventoryBrowse ? (
              inventoryResults.length > 0 ? (
                <div
                  className={styles.boardInventoryCarousel}
                  aria-label="Filtered active dancers"
                >
                  <div className={styles.boardInventoryCarouselHeader}>
                    <span className={surfaceStyles.helperNote}>{carousel.rangeLabel}</span>
                    <div className={styles.boardInventoryArrowGroup}>
                      <button
                        type="button"
                        className={`${surfaceStyles.helperButton} ${styles.inventoryButton}`}
                        disabled={!carousel.canGoPrevious}
                        onClick={() =>
                          setInventoryCarouselIndex(
                            Math.max(0, carousel.startIndex - inventoryCarouselPageSize),
                          )
                        }
                        aria-label="Previous Dance Floor dancers"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className={`${surfaceStyles.helperButton} ${styles.inventoryButton}`}
                        disabled={!carousel.canGoNext}
                        onClick={() =>
                          setInventoryCarouselIndex(
                            carousel.startIndex + inventoryCarouselPageSize,
                          )
                        }
                        aria-label="Next Dance Floor dancers"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  {isInventoryBrowseLoading ? (
                    <div className={surfaceStyles.helperNote}>Loading Dance Floor dancers...</div>
                  ) : null}
                  <div className={styles.boardInventoryCarouselGrid}>
                    {carousel.visibleItems.map((listing) => {
                      const photoUrl = getTradeListingPhotoUrl(listing)
                      const display = getTradeListingDisplayFields(listing)
                      return (
                        <div key={listing.id} className={styles.boardInventoryPieceCard}>
                          <button
                            type="button"
                            className={styles.boardInventoryMediaButton}
                            aria-label={`Open image preview for ${display.designName}`}
                            onClick={() => setPreviewListing(listing)}
                          >
                            <span className={styles.boardInventoryMedia}>
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
                            <div className={styles.customerName}>{display.designName}</div>
                            <div className={styles.tradePieceMetaLine}>
                              {display.itemNumber
                                ? `${display.itemNumber}${display.material ? ` · ${display.material}` : ''}${display.mainStone ? ` · ${display.mainStone}` : ''}`
                                : display.repFacingNote}
                            </div>
                            <div className={styles.tradePieceMetaLine}>
                              {display.typePrefix}
                              {display.collectionName ? ` - ${display.collectionName}` : ''}
                            </div>
                            <div className={styles.tradePieceQuantity}>
                              {Math.max(0, listing.quantity_available ?? 1)} available
                            </div>
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
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className={surfaceStyles.emptyState}>
                  {isInventoryBrowseLoading
                    ? 'Loading Dance Floor dancers...'
                    : 'No live dancers match that search. Reset filters or try another keyword.'}
                </div>
              )
            ) : (
              <div
                className={styles.browseHint}
                aria-label="Search the Dance Floor or open filters to find a live dancer."
              >
                Search by item number, design, or collection to pull up a live dancer fast.
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
                  aria-label={`${previewDisplay.designName} image preview`}
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
                        : 'Review to approve'}
                    </button>
                    <button
                      type="button"
                      className={surfaceStyles.helperButton}
                      disabled={actionState.pendingKey === `reject:${request.id}`}
                      onClick={() => onReviewRequest(request.id, 'reject')}
                    >
                      {actionState.pendingKey === `reject:${request.id}`
                        ? 'Denying...'
                        : 'Review to deny'}
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

      {fulfillmentQueueState.status === 'ready' && queueItems.length > 0 ? (
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div>
              <div className={surfaceStyles.walletSettingsTitle}>Fulfillment queue</div>
              <div className={surfaceStyles.helperNote}>
                Keep approved swaps moving until they are shipped and fully closed out.
              </div>
            </div>
            <span className={surfaceStyles.rosterTag}>{`${queueItems.length} active swaps`}</span>
          </div>
          <div className={styles.tradeList}>
            {queueItems.map((item) => {
              const nextStatus = getNextFulfillmentStatus(item.status)
              return (
                <div key={item.fulfillmentId} className={styles.tradeRow}>
                  <div className={styles.tradeIdentity}>
                    <div className={styles.customerName}>{item.customerName}</div>
                    <div className={styles.customerDate}>
                      {item.itemNumber ? `${item.itemNumber} - ${item.designName}` : item.designName}
                    </div>
                    <div className={surfaceStyles.helperNote}>
                      {item.daysSinceLastUpdate} day(s) since last update
                    </div>
                  </div>
                  <div className={styles.tradeMeta}>
                    <span className={styles.statusBadgeWarning}>{item.status}</span>
                  </div>
                  <div className={`${surfaceStyles.actionRow} ${styles.tradeActions}`}>
                    {nextStatus ? (
                      <button
                        type="button"
                        className={surfaceStyles.actionButton}
                        disabled={actionState.pendingKey === `fulfillment:${item.requestId}`}
                        onClick={() => onAdvanceFulfillment(item.requestId, nextStatus)}
                      >
                        {actionState.pendingKey === `fulfillment:${item.requestId}`
                          ? 'Saving...'
                          : nextStatus === 'shipped'
                            ? 'Mark shipped'
                            : 'Mark completed'}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}

