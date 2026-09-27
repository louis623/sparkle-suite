'use client'

import { type FormEvent, useState } from 'react'
import {
  getNewPasswordValidationError,
  getPasswordMinLength,
  getPasswordRequirements,
} from '@/lib/auth/password-policy'
import { createClient } from '@/lib/supabase/client'
import styles from './DashboardPlaceholder.module.css'

export function AccountSecurityCard({
  mutationsDisabled = false,
}: {
  mutationsDisabled?: boolean
} = {}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutationsDisabled) return
    const form = event.currentTarget
    const data = new FormData(form)
    const newPassword = String(data.get('newPassword') ?? '')
    const newPasswordConfirm = String(data.get('newPasswordConfirm') ?? '')

    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const validationError = getNewPasswordValidationError(
        newPassword,
        newPasswordConfirm,
      )
      if (validationError) throw new Error(validationError)

      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) throw updateError

      form.reset()
      setMessage('Your password has been updated.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to update your password.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.accountBillingCard} aria-labelledby="account-security-title">
      <div className={styles.workspaceSectionHeader}>
        <div>
          <div className={styles.cardTitle} id="account-security-title">
            Password &amp; security
          </div>
          <div className={styles.accountMuted}>
            Change the password you use to sign in to Sparkle Suite.
          </div>
        </div>
      </div>

      <form className={styles.siteSettingsSection} onSubmit={handleSubmit}>
        <label className={styles.sortFieldWide}>
          <span className={styles.searchLabel}>New password</span>
          <input
            className={styles.searchInput}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={getPasswordMinLength()}
            aria-describedby="account-password-requirements"
            disabled={busy || mutationsDisabled}
            required
          />
        </label>
        <label className={styles.sortFieldWide}>
          <span className={styles.searchLabel}>Confirm new password</span>
          <input
            className={styles.searchInput}
            name="newPasswordConfirm"
            type="password"
            autoComplete="new-password"
            minLength={getPasswordMinLength()}
            aria-describedby="account-password-requirements"
            disabled={busy || mutationsDisabled}
            required
          />
        </label>
        <p id="account-password-requirements" className={styles.accountMuted}>
          {getPasswordRequirements()}
        </p>

        {error ? (
          <div className={styles.actionError} role="alert">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className={styles.helperMessage} role="status">
            {message}
          </div>
        ) : null}

        <div className={styles.actionRow}>
          <button
            type="submit"
            className={styles.actionButton}
            disabled={busy || mutationsDisabled}
          >
            {busy ? 'Updating password...' : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default AccountSecurityCard
