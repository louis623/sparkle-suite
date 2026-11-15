import type { BoardResult } from '@/lib/services/types'
export type DanceFloorBoard = BoardResult & { attention?: { photosToFix: number } | null }
export type Publication = { status: 'unknown' | 'unpublished' | 'published'; tradeUrl?: string | null }
export type OpeningReview = { requestId: string; action: 'approve' | 'reject' } | null
