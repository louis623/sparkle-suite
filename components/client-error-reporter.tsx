'use client'

import { useEffect } from 'react'
import { sanitizeClientError } from '@/lib/monitoring/client-error-payload'
import { clientErrorSource, sameOriginScript } from '@/lib/monitoring/client-error-source'

export async function reportClientError(error: unknown, filename?: string, line?: number, column?: number) {
  if (process.env.CLIENT_ERROR_ALERTS !== 'on') return
  try {
    const value = error instanceof Error ? error : null
    const source = sameOriginScript(clientErrorSource(value?.stack ?? '', filename, line, column), window.location.origin)
    if (!source) return
    const rawMessage = value?.message ? `${value.name}: ${value.message}` : typeof error === 'string' ? error : ''
    // Distinguish complete messages without transporting private exception text.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawMessage))
    const messageHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    const payload = sanitizeClientError({
      message: rawMessage,
      stack: value?.stack ?? '',
      path: window.location.pathname,
      userAgent: navigator.userAgent,
    })
    navigator.sendBeacon('/api/public/client-error', new Blob([JSON.stringify({
      ...payload, source: { url: source.url, line: source.line, column: source.column }, messageHash,
    })], { type: 'application/json' }))
  } catch {
    // Reporting must never affect the original exception or the visitor's page.
  }
}

export default function ClientErrorReporter() {
  useEffect(() => {
    if (process.env.CLIENT_ERROR_ALERTS !== 'on') return
    const onError = (event: ErrorEvent) => { void reportClientError(event.error ?? event.message, event.filename, event.lineno, event.colno) }
    const onRejection = (event: PromiseRejectionEvent) => { void reportClientError(event.reason) }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
