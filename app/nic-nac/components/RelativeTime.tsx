'use client'

import { useEffect, useState } from 'react'

// Renders a message timestamp in a human-relative form. Refreshes every 30s.
// Accepts an ISO string OR a number (epoch ms) for optimistic local timestamps.

export function RelativeTime({ value }: { value: string | number | undefined }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (value === undefined || value === null) return null
  const ts = typeof value === 'number' ? value : Date.parse(value)
  if (!Number.isFinite(ts)) return null

  const label = relativeTimeLabel(ts, now)
  const isoLabel = new Date(ts).toISOString()
  return <time dateTime={isoLabel} title={new Date(ts).toLocaleString()}>{label}</time>
}

export function relativeTimeLabel(then: number, now: number | null): string {
  if (now === null) {
    return new Date(then).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  return formatRelative(then, now)
}

function formatRelative(then: number, now: number): string {
  const deltaSec = Math.max(0, Math.round((now - then) / 1000))
  if (deltaSec < 30) return 'just now'
  if (deltaSec < 60) return `${deltaSec}s ago`
  const deltaMin = Math.round(deltaSec / 60)
  if (deltaMin < 60) return `${deltaMin} min ago`
  const deltaHr = Math.round(deltaMin / 60)
  if (deltaHr < 12) return `${deltaHr}h ago`
  // Older — show clock time. If it's not today, show date too.
  const d = new Date(then)
  const isToday = new Date(now).toDateString() === d.toDateString()
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
