'use client'

import { useState } from 'react'
import type { RequiredSetupStatus } from '@/lib/self-serve/required-setup-contract'
import { createClient } from '@/lib/supabase/client'
import styles from './WorkspaceAccessPending.module.css'

export function WorkspaceAccessPending({
  status,
}: {
  status: RequiredSetupStatus | null | undefined
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const paymentPending = status === 'payment_pending'

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

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="workspace-access-title">
        <div className={styles.mark}>S</div>
        <p className={styles.eyebrow}>Sparkle Suite</p>
        <h1 id="workspace-access-title">
          {paymentPending
            ? 'Payment is still being confirmed'
            : 'Workspace access is not active for this account'}
        </h1>
        <p>
          {paymentPending
            ? 'No new checkout will start automatically. Sign in again after payment is confirmed.'
            : 'Louis needs to finish setting up this email before it can open a Sparkle Suite workspace.'}
        </p>
        <p>
          Sparkle Suite never starts checkout just because you sign in. Once an
          account is provisioned, the first sign-in begins five days of access.
          Billing is started deliberately from <strong>Account</strong> inside
          the app.
        </p>
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
