import type { BoardResult } from '@/lib/services/types'
export type DanceFloorBoard = BoardResult & { attention?: { photosToFix: number; needsPhoto?: number; sitting?: number } | null; publication?: Publication; total?: number; hasMore?: boolean }
export type Publication = { status: 'unknown' | 'unpublished' | 'published'; tradeUrl?: string | null }
export type OpeningReview = { requestId: string; action: 'approve' | 'reject' } | null
