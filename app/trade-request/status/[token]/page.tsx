import { validDanceFloorBackHref } from './receipt-back'
import type { Metadata } from 'next'
import ReceiptStatus from './receipt-status'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Private swap request status',
  description: 'Private status for a Dance Floor swap request.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function TradeRequestStatusPage({
  params, searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ back?: string | string[] }>
}) {
  const { token } = await params
  const { back } = await searchParams
  return <ReceiptStatus token={token} backHref={validDanceFloorBackHref(back)} />
}
