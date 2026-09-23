'use client'

import { useState, type ReactNode } from 'react'

export function TradeScreenshotLink({ requestId, customerName, className, imageClassName, children }: {
  requestId: string
  customerName: string
  className?: string
  imageClassName?: string
  children?: ReactNode
}) {
  const [unavailable, setUnavailable] = useState(false)
  if (unavailable) return <span role="status">Screenshot unavailable or expired. Verify the offered item directly.</span>
  const url = `/api/nic-nac/trade-requests/${encodeURIComponent(requestId)}/reveal-screenshot`
  return <a className={className} href={url} target="_blank" rel="noreferrer">
    <img className={imageClassName} src={url} alt={`Protected reveal screenshot from ${customerName}`} onError={() => setUnavailable(true)} />
    {children ?? 'View protected screenshot'}
  </a>
}
