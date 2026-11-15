'use client'
import { useCallback, useState } from 'react'
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
