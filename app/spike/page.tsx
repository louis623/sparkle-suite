import { Suspense } from 'react'
import ThumperSpikeClient from './_client'

export const dynamic = 'force-dynamic'

export default function ThumperSpikePage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ThumperSpikeClient />
    </Suspense>
  )
}
