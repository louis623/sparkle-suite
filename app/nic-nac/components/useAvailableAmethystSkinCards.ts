'use client'

import { useEffect, useState } from 'react'
import {
  getAmethystSkinCardsForIds,
  type AmethystSkinCard,
} from '@/lib/amethyst/skin-cards'

type SkinOptionState =
  | { repId: string | null; status: 'loading'; cards: AmethystSkinCard[] }
  | { repId: string; status: 'ready'; cards: AmethystSkinCard[] }
  | { repId: string; status: 'error'; cards: AmethystSkinCard[] }

const EMPTY_SKIN_OPTIONS: SkinOptionState = {
  repId: null,
  status: 'loading',
  cards: [],
}

export function useAvailableAmethystSkinCards(repId: string | null | undefined) {
  const [state, setState] = useState<SkinOptionState>(EMPTY_SKIN_OPTIONS)

  useEffect(() => {
    if (!repId) return

    let cancelled = false
    void fetch('/api/nic-nac/skin-options')
      .then(async (response) => {
        if (!response.ok) throw new Error('Skin options request failed')
        const payload = (await response.json()) as { skinIds?: unknown }
        const skinIds = Array.isArray(payload.skinIds)
          ? payload.skinIds.filter((value): value is string => typeof value === 'string')
          : []
        if (!cancelled) {
          setState({
            repId,
            status: 'ready',
            cards: getAmethystSkinCardsForIds(skinIds),
          })
        }
      })
      .catch(() => {
        if (!cancelled) setState({ repId, status: 'error', cards: [] })
      })

    return () => {
      cancelled = true
    }
  }, [repId])

  // Never render a previous account's list while another account is loading.
  return state.repId === repId ? state : EMPTY_SKIN_OPTIONS
}
