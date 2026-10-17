'use client'

import { useEffect, useState } from 'react'
import type { RequiredSetupStatus } from '@/lib/self-serve/required-setup-contract'
import type { AccountBillingDashboardResult } from '@/lib/services/types'
import { createClient } from '@/lib/supabase/client'
import styles from './WorkspaceAccessPending.module.css'

export function WorkspaceAccessPending({
  status,
}: {
  status: RequiredSetupStatus | null | undefined
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [billing, setBilling] = useState<AccountBillingDashboardResult | null>(
    null,
  )
  const paymentPending = status === 'payment_pending'
  const grandfatheredCheckout = billing?.grandfatheredCheckout ?? null

  useEffect(() => {
    if (paymentPending) return
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch('/api/nic-nac/account-billing', {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload = (await response.json()) as AccountBillingDashboardResult
        setBilling(payload)
      } catch {
        if (controller.signal.aborted) return
      }
    })()
    return () => controller.abort()
  }, [paymentPending])

  async function handleUseDifferentEmail() {
    setBusy(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) throw signOutError
      window.location.assign('/login')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We could not sign out. Please try again.',
      )
      setBusy(false)
    }
  }

  async function handleCheckout() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agreementAccepted: true }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; url?: string }
        | null
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Unable to open checkout.')
      }
      window.location.assign(payload.url)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to open checkout.',
      )
      setBusy(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="workspace-access-title">
        <div className={styles.mark}>S</div>
        <p className={styles.eyebrow}>Sparkle Suite</p>
        <h1 id="workspace-access-title">
          {paymentPending
            ? 'Payment is still being confirmed'
            : 'Finish checkout to open your workspace'}
        </h1>
        <p>
          {paymentPending
            ? 'No new checkout will start automatically. Sign in again after payment is confirmed.'
            : 'Your account can sign in now. The workspace opens after your first payment goes through.'}
        </p>
        {paymentPending ? null : grandfatheredCheckout ? (
          <a className={styles.payLink} href={grandfatheredCheckout.href}>
            Continue to checkout
          </a>
        ) : (
          <>
            <label className={styles.agreement}>
              <input
                type="checkbox"
                checked={agreementAccepted}
                onChange={(event) => setAgreementAccepted(event.target.checked)}
              />
              <span>
                I accept the Sparkle Suite Terms and Conditions and understand
                the first payment is collected at checkout.
              </span>
            </label>
            <button
              type="button"
              disabled={busy || !agreementAccepted}
              onClick={() => void handleCheckout()}
            >
              {busy ? 'Opening checkout...' : 'Continue to checkout'}
            </button>
          </>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleUseDifferentEmail()}
        >
          {busy ? 'Signing out...' : 'Sign in with a different email'}
        </button>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  )
}
