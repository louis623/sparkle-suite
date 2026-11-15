'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
// A cancelable event lets the shell ask the mounted Floor before unmounting it.
export function canLeaveDanceFloor() {
  return window.dispatchEvent(new Event('dance-floor-before-leave', { cancelable: true }))
}
export function useFloorSectionGuard<T extends string>(section: T, setSection: (next: T) => void, onBlocked: () => void) {
  const current = useRef(section)
  current.current = section
  const blocked = useRef(onBlocked)
  blocked.current = onBlocked
  return useCallback((update: T | ((value: T) => T)) => {
    const next = typeof update === 'function' ? update(current.current) : update
    if (current.current === 'trade-board' && next !== current.current && !canLeaveDanceFloor()) {
      blocked.current()
      return
    }
    current.current = next
    setSection(next)
  }, [setSection])
}
export async function lookupFloorListing(id: string, signal?: AbortSignal) {
  const response = await fetch('/api/nic-nac/trade-board?listingId=' + encodeURIComponent(id), { credentials: 'include', signal })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Dancer lookup failed')
  return (await response.json()).listing as { id: string; status: string }
}
export function useEditableFloor(seed: DanceFloorBoard | undefined) {
  const [filters, setFilters] = useState<FloorFilters>(defaultFloorFilters)
  const [board, setBoard] = useState(() => seed ? { ...seed, listings: seed.listings.filter(row => defaultFloorFilters.statuses.includes(row.status)) } : undefined)
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>(seed ? 'ready' : 'loading')
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null)
  const generation = useRef(0)
  const extent = useRef(24)
  const previousQuery = useRef<string | null>(null)
  const anchor = useRef<{ id: string; top: number } | null>(null)
  useLayoutEffect(() => {
    if (!anchor.current) return
    const row = document.getElementById(anchor.current.id)
    if (row) window.scrollBy(0, row.getBoundingClientRect().top - anchor.current.top)
    anchor.current = null
  }, [board])
  const query = floorQuery(filters)
  const refresh = useCallback(async (offset = 0) => {
    const run = ++generation.current
    if (previousQuery.current !== query) { extent.current = 24; previousQuery.current = query }
    if (offset) extent.current = Math.max(extent.current, offset + 24)
    setStatus('loading')
    try {
      if (!filters.statuses.length) { setBoard(current => current ? { ...current, listings: [], total: 0, hasMore: false } : current); setStatus('ready'); return }
      // Keep the requested extent even when a poll overtakes Load more.
      let next = await fetchDanceFloorBoard(floorQuery(filters))
      if (run !== generation.current) return
      for (let page = 24; page < extent.current && next.hasMore; page += 24) {
        const more = await fetchDanceFloorBoard(floorQuery(filters, page))
        if (run !== generation.current) return
        next = { ...more, listings: [...next.listings, ...more.listings] }
      }
      const visible = [...document.querySelectorAll<HTMLElement>('[data-dancer-row]')].find(row => row.getBoundingClientRect().bottom > 0)
      anchor.current = visible ? { id: visible.id, top: visible.getBoundingClientRect().top } : null
      setBoard(next)
      setLoadedQuery(floorQuery(filters)); setStatus('ready')
    } catch { if (run === generation.current) setStatus('error') }
  }, [query])
  useEffect(() => { void refresh(); return () => { generation.current++ } }, [refresh, seed])
  return { filters, setFilters, board, setBoard, status, refresh, loadedQuery }
}
