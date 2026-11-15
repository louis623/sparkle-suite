import type { BoardResult } from '@/lib/services/types'
export type DanceFloorBoard = BoardResult & { attention?: { photosToFix: number; needsPhoto?: number; sitting?: number } | null; publication?: Publication; filterOptions?: import('@/lib/nic-nac/board-inventory-view').BoardInventoryOptions; total?: number; hasMore?: boolean }
export type Publication = { status: 'unknown' | 'unpublished' | 'published'; tradeUrl?: string | null }
export type OpeningReview = { requestId: string; action: 'approve' | 'reject' } | null
