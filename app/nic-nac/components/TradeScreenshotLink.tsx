'use client'

import { useState, type ReactNode } from 'react'

export function TradeScreenshotLink({ requestId, customerName, className, imageClassName, children }: {
  requestId: string
  customerName: string
  className?: string
  imageClassName?: string
  children?: ReactNode
}) {
  const [failedId, setFailedId] = useState<string | null>(null)
  const url = `/api/nic-nac/trade-requests/${encodeURIComponent(requestId)}/reveal-screenshot`
  return <a className={className} href={url} target="_blank" rel="noreferrer">
    {failedId === requestId ? <span>Preview unavailable.</span> : <img className={imageClassName} src={url + '?variant=thumb'} alt={`Protected reveal screenshot from ${customerName}`} onError={() => setFailedId(requestId)} />}
    {children ?? 'View protected screenshot'}
  </a>
}
