import { Suspense } from 'react'
import ThumperClient from './_client'
import './thumper-tokens.css'

export const dynamic = 'force-dynamic'

export default function ThumperPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ThumperClient />
    </Suspense>
  )
}
