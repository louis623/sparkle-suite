'use client'

import { useEffect } from 'react'
import { sanitizeClientError } from '@/lib/monitoring/client-error-payload'

export function reportClientError(error: unknown) {
  if (process.env.CLIENT_ERROR_ALERTS !== 'on') return
  try {
    const value = error instanceof Error ? error : null
    const payload = sanitizeClientError({
      message: value?.message ? `${value.name}: ${value.message}` : typeof error === 'string' ? error : '',
      stack: value?.stack ?? '',
      path: window.location.pathname,
      userAgent: navigator.userAgent,
    })
    navigator.sendBeacon('/api/public/client-error', new Blob([JSON.stringify({
      ...payload, buildId: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    })], { type: 'application/json' }))
  } catch {
    // Reporting must never affect the original exception or the visitor's page.
  }
}

export default function ClientErrorReporter() {
  useEffect(() => {
    if (process.env.CLIENT_ERROR_ALERTS !== 'on') return
    const onError = (event: ErrorEvent) => reportClientError(event.error ?? event.message)
    const onRejection = (event: PromiseRejectionEvent) => reportClientError(event.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
