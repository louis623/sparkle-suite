'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DanceFloorBoard } from './types'

export async function fetchDanceFloorBoard(url: string, signal?: AbortSignal): Promise<DanceFloorBoard> {
  const response = await fetch(url, { credentials: 'include', signal })
  if (!response.ok) throw new Error(`dance floor request failed: ${response.status}`)
  return response.json()
}

// Keep retry state here rather than growing the Workspace shell. Existing loaders own polling.
export function useDanceFloorData(refresh?: () => Promise<unknown>) {
  const [retrying, setRetrying] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)
  const retry = useCallback(async () => {
    if (!refresh || retrying) return
    setRetrying(true)
    setRetryFailed(false)
    try { await refresh() } catch { setRetryFailed(true) }
    finally { setRetrying(false) }
  }, [refresh, retrying])
  return { retry, retrying, retryFailed }
}

export const defaultFloorFilters = { statuses: ['available', 'pending_trade'], search: '', type: '', collection: '', sort: 'newest', rarity: '', material: '', size: '', needsPhoto: false, sitting: false }
export type FloorFilters = typeof defaultFloorFilters
export function floorQuery(filters: FloorFilters, offset = 0) {
  const query = new URLSearchParams({ status: filters.statuses.join(','), limit: '24', offset: String(offset) })
  for (const [key, value] of Object.entries(filters)) {
    if (key !== 'statuses' && value) query.set(key, String(value))
  }
  return '/api/nic-nac/trade-board?' + query
}
export class FloorMutationError extends Error {
  code: string
  blockers: Array<{ requestId: string; customerName: string; status: string | null }>
  constructor(payload: { code?: string; error?: string; blockers?: FloorMutationError['blockers'] }) {
    super(payload.error ?? "Couldn't update that dancer. Try again.")
    this.code = payload.code ?? 'UPDATE_FAILED'; this.blockers = payload.blockers ?? []
  }
}
export async function mutateFloor(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const payload = await response.json()
  if (!response.ok) throw new FloorMutationError(payload)
  return payload
}
export async function changeFloorPhoto(listingId: string, file: File) {
  const target = await mutateFloor('/api/nic-nac/trade-board/uploads', 'POST', { listingId })
  const upload = await fetch(target.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file })
  if (!upload.ok) throw new Error("Couldn't update that dancer. Try again.")
  return mutateFloor('/api/nic-nac/trade-board', 'PATCH', { listingId, listingPhotoPath: target.path })
}
export function useEditableFloor(seed: DanceFloorBoard | undefined) {
  const [filters, setFilters] = useState<FloorFilters>(defaultFloorFilters)
  const [board, setBoard] = useState(() => seed ? { ...seed, listings: seed.listings.filter(row => defaultFloorFilters.statuses.includes(row.status)) } : undefined)
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>(seed ? 'ready' : 'loading')
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null)
  const generation = useRef(0)
  const query = floorQuery(filters)
  const refresh = useCallback(async (offset = 0) => {
    const run = ++generation.current
    setStatus('loading')
    try {
      if (!filters.statuses.length) { setBoard(current => current ? { ...current, listings: [], total: 0, hasMore: false } : current); setStatus('ready'); return }
      const next = await fetchDanceFloorBoard(floorQuery(filters, offset))
      if (run !== generation.current) return
      setBoard(current => offset && current ? { ...next, listings: [...current.listings, ...next.listings] } : next)
      setLoadedQuery(floorQuery(filters)); setStatus('ready')
    } catch { if (run === generation.current) setStatus('error') }
  }, [query])
  useEffect(() => { void refresh(); return () => { generation.current++ } }, [refresh, seed])
  return { filters, setFilters, board, setBoard, status, refresh, loadedQuery }
}
