import type { Metadata } from 'next'
import ReceiptStatus from './receipt-status'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Private trade request status',
  description: 'Private status for a Dance Floor trade request.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function TradeRequestStatusPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <ReceiptStatus token={token} />
}
