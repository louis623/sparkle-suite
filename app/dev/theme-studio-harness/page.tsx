import type { Metadata } from 'next'
import { ThemeStudioHarness } from './harness'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Theme studio review harness',
  robots: { index: false, follow: false },
}

export default async function ThemeStudioHarnessPage({
  searchParams,
}: {
  searchParams?: Promise<{ skin?: string }>
}) {
  const query = searchParams ? await searchParams : {}
  const skin = query.skin === 'black_diamond' ? 'black_diamond' : undefined
  return (
    <main className="main" data-workspace-skin={skin} style={{ padding: 16, background: 'var(--nic-nac-surface-dashboard, #fcf8f6)' }}>
      <p style={{ marginTop: 0, fontFamily: 'DM Sans, sans-serif' }}>
        Review harness for the My Website theme studio. It uses sample themes and does not save or call the signed-in preview.
      </p>
      <ThemeStudioHarness />
    </main>
  )
}
