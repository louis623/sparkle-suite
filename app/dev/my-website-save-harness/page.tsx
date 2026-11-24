import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isMyWebsiteSaveHarnessEnabled } from './access'
import { MyWebsiteSaveHarness } from './harness'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Website save bar review harness',
  robots: { index: false, follow: false },
}

export default async function MyWebsiteSaveHarnessPage({
  searchParams,
}: {
  searchParams?: Promise<{ clean?: string }>
}) {
  if (!isMyWebsiteSaveHarnessEnabled()) notFound()
  const query = searchParams ? await searchParams : {}
  return (
    <main style={{ minHeight: '100vh', background: 'var(--nic-nac-surface-dashboard, #fcf8f6)' }}>
      <MyWebsiteSaveHarness clean={query.clean === '1'} />
    </main>
  )
}
