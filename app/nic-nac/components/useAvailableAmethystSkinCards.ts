'use client'

import { useEffect, useState } from 'react'
import {
  getAmethystSkinCardsForIds,
  type AmethystSkinCard,
} from '@/lib/amethyst/skin-cards'

type SkinOptionsState =
  | { status: 'loading'; cards: AmethystSkinCard[] }
  | { status: 'ready'; cards: AmethystSkinCard[] }
  | { status: 'error'; cards: AmethystSkinCard[] }

export function useAvailableAmethystSkinCards(repId?: string | null): SkinOptionsState {
  const [state, setState] = useState<SkinOptionsState>({
    status: 'loading',
    cards: [],
  })

  useEffect(() => {
    if (!repId) {
      setState({ status: 'loading', cards: [] })
      return
    }

    const controller = new AbortController()
    setState({ status: 'loading', cards: [] })

    void fetch('/api/nic-nac/skin-options', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('skin options unavailable')
        const body = (await response.json()) as { skinIds?: unknown }
        const skinIds = Array.isArray(body.skinIds)
          ? body.skinIds.filter((skinId): skinId is string => typeof skinId === 'string')
          : []
        if (!controller.signal.aborted) {
          setState({
            status: 'ready',
            cards: getAmethystSkinCardsForIds(skinIds),
          })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', cards: [] })
        }
      })

    return () => controller.abort()
  }, [repId])

  return state
}
