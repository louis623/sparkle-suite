'use client'

import { useEffect } from 'react'
// Reuse the installed, pinned Next fallback, including its styles and recovery behavior.
import DefaultGlobalError from 'next/dist/client/components/builtin/global-error'
import { reportClientError } from '@/components/client-error-reporter'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { reportClientError(error) }, [error])
  return <DefaultGlobalError error={error} />
}
