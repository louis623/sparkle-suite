import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isMyWebsiteLayoutHarnessEnabled } from './access'
import { MyWebsiteLayoutHarness } from './harness'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Website layout review harness',
  robots: { index: false, follow: false },
}

export default async function MyWebsiteLayoutHarnessPage({
  searchParams,
}: {
  searchParams?: Promise<{ case?: string; open?: string }>
}) {
  if (!isMyWebsiteLayoutHarnessEnabled()) notFound()
  const query = searchParams ? await searchParams : {}
  const mode = query.case === 'full' || query.case === 'states' || query.case === 'load-error' || query.case === 'no-photo'
    ? query.case
    : 'gaps'
  return (
    <main style={{ minHeight: '100vh', background: 'var(--nic-nac-surface-dashboard, #fcf8f6)' }}>
      <MyWebsiteLayoutHarness
        mode={mode}
        openSection={query.open === 'about' ? 'about' : null}
      />
    </main>
  )
}
