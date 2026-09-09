import type { Metadata } from 'next'
import LocReviewerForm from './reviewer-form'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'LOC synthetic reviewer', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default function LocReviewerPage() {
  return <main style={{ maxWidth: 560, margin: '4rem auto', padding: 24 }}>
    <h1>LOC synthetic reviewer</h1>
    <p>Use a separate browser session. This opens dedicated test data inside Sparkle Suite. Your test edits are retained; no customer data is reset.</p>
    <LocReviewerForm />
  </main>
}
