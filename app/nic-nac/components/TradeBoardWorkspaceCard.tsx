'use client'
import type { BoardResult, FulfillmentLogFilter, FulfillmentLogItem, TradeListingWithDesign, TradeRequestWithListing, TradeSwapCleanupItem } from '@/lib/services/types'
import { DanceFloorHeader } from './dance-floor/DanceFloorHeader'
import { NeedsYouStrip } from './dance-floor/NeedsYouStrip'
import { RequestInbox } from './dance-floor/RequestInbox'
import { FollowUps } from './dance-floor/FollowUps'
import { AddDancers } from './dance-floor/AddDancers'
import { DancerFloor } from './dance-floor/DancerFloor'
import { SwapHistory } from './dance-floor/SwapHistory'
import { useDanceFloorData } from './dance-floor/useDanceFloorData'
import type { DanceFloorBoard, Publication, OpeningReview } from './dance-floor/types'
import palette from './RepDashboard.module.css'
import styles from './dance-floor/dance-floor.module.css'

type TradeBoardState = {
  status: 'loading' | 'ready' | 'error'
  board?: DanceFloorBoard
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
  publication?: Publication
  openingReview?: OpeningReview
  onRetry?: () => Promise<unknown>
  onSiteSetup?: () => void
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
  onRemoveListing?: (listingId: string) => void
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


export function formatFulfillmentTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(date)
    : value
}


export function TradeBoardWorkspaceCard(props: TradeBoardWorkspaceCardProps) {
  const { retry, retrying, retryFailed } = useDanceFloorData(props.onRetry)
  const board = props.tradeBoardState
  const requests = props.tradeRequestsState
  const cleanup = props.tradeSwapCleanupState ?? { status: 'ready' as const, items: [] }
  const followUps = cleanup.items?.filter(item => item.replacementStatus !== 'added_to_board')
  const photos = board.board?.attention?.photosToFix
  const pending = requests.pendingCount ?? requests.requests?.filter(request => request.status === 'pending').length
  const status = retryFailed || props.inboxLoadError || [board.status, requests.status, cleanup.status].includes('error') || (board.status === 'ready' && photos == null)
    ? 'error' : retrying || [board.status, requests.status, cleanup.status].includes('loading') ? 'loading' : 'ready'
  return <div className={`${palette.palette} ${styles.page}`}>
    <DanceFloorHeader publication={props.publication ?? { status: 'unknown' }} onSiteSetup={props.onSiteSetup} />
    {props.actionState.error && <p role="alert" className="ph-no-capture">{props.actionState.error}</p>}
    {props.actionState.helperMessage && <p role="status" className="ph-no-capture">{props.actionState.helperMessage}</p>}
    <NeedsYouStrip requests={pending} followUps={followUps?.length} photos={photos} status={status} onRetry={retry} />
    <RequestInbox requests={requests.requests ?? []} pendingCount={pending} status={props.inboxLoadError ? 'error' : requests.status} openingReview={props.openingReview} onReviewRequest={props.onReviewRequest} onRetry={retry} />
    <div ref={props.onSoundSettingsTarget} />
    <FollowUps items={followUps ?? []} status={cleanup.status} onRetry={retry} />
    <AddDancers value={props.quickAddItemNumber} onChange={props.onQuickAddItemNumberChange} onAdd={props.onQuickAddListing} adding={props.actionState.pendingKey === 'quick-add'} />
    <DancerFloor listings={props.visibleListings ?? board.board?.listings ?? []} search={props.tradeBoardSearchQuery} onSearch={props.onTradeBoardSearchQueryChange} status={board.status} hasMore={props.hasMoreListings ?? false} onEnsureLoaded={props.onEnsureInventoryBrowseLoaded} loadingMore={props.isInventoryBrowseLoading ?? false} onRetry={retry} />
    <SwapHistory state={props.fulfillmentQueueState} view={props.fulfillmentLogView ?? { filter: 'open', page: 1 }} onView={props.onFulfillmentLogViewChange ?? (() => {})} pendingKey={props.actionState.pendingKey} onAdvance={props.onAdvanceFulfillment} onRetry={retry} />
  </div>
}
