'use client'

import { useEffect, useState } from 'react'
import styles from './receipt-status.module.css'

type Receipt = {
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  denialExplanation: string | null
  updatedAt: string | null
}

const STATUS_COPY: Record<Receipt['status'], { heading: string; body: string }> = {
  pending: {
    heading: 'Your request is pending',
    body: 'Your rep has the request and will review the collection, jewelry type, and availability.',
  },
  approved: {
    heading: 'Your trade was approved',
    body: 'Your rep approved this trade. Approval does not mean the item has shipped or been fulfilled.',
  },
  denied: {
    heading: 'Your request was declined',
    body: 'Your rep could not approve this trade.',
  },
  cancelled: {
    heading: 'Your request was cancelled',
    body: 'This trade request is no longer active.',
  },
}

export default function ReceiptStatus({ token }: { token: string }) {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/amethyst/trade-requests/status?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(response.status === 404 ? 'This private link is invalid or no longer available.' : 'Status is unavailable right now. Please try again.')
        const data = await response.json() as Partial<Receipt>
        if (!data.status || !Object.hasOwn(STATUS_COPY, data.status)) throw new Error('Status is unavailable right now. Please try again.')
        setReceipt({
          status: data.status,
          denialExplanation: typeof data.denialExplanation === 'string' ? data.denialExplanation : null,
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
        })
      } catch (cause) {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Status is unavailable right now. Please try again.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [token])

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live="polite">
        <p className={styles.eyebrow}>Dance Floor · Private request</p>
        <h1>{loading ? 'Checking your request…' : error ? 'We could not show your request' : STATUS_COPY[receipt!.status].heading}</h1>
        {error ? <p className={styles.error}>{error}</p> : null}
        {receipt && !loading && !error ? (
          <>
            <p>{STATUS_COPY[receipt.status].body}</p>
            {receipt.status === 'denied' && receipt.denialExplanation ? <p className={styles.explanation}>{receipt.denialExplanation}</p> : null}
            {receipt.updatedAt ? <p className={styles.updated}>Updated {new Date(receipt.updatedAt).toLocaleString()}</p> : null}
          </>
        ) : null}
        <div className={styles.saveBox}>
          <strong>Keep this link private</strong>
          <p>Save it to check for changes. This page updates when you open it; it does not send notifications.</p>
          <button type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}>{copied ? 'Copied' : 'Copy status link'}</button>
        </div>
      </section>
    </main>
  )
}
