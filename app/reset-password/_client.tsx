'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getNewPasswordValidationError,
  getPasswordMinLength,
  getPasswordRequirements,
} from '@/lib/auth/password-policy'
import { createClient } from '@/lib/supabase/client'

type ResetMode = 'request' | 'update'

export default function ResetPasswordClient() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<ResetMode>('request')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) setMode('update')
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setMode('update')
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const supabase = createClient()
      const resetCallbackUrl = new URL('/api/auth/callback', window.location.origin)
      resetCallbackUrl.searchParams.set('next', '/reset-password')
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: resetCallbackUrl.toString(),
        },
      )
      if (resetError) throw resetError
      setMessage('Check your email for a Sparkle Suite password reset link.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to send the password reset link.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)

    const form = new FormData(event.currentTarget)
    const newPassword = String(form.get('newPassword') ?? '')
    const newPasswordConfirm = String(form.get('newPasswordConfirm') ?? '')

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
      setMessage('Your password has been updated. You can sign in now.')
      router.replace('/login?reset=success')
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
    <div className="sl2-login__card sl2-password-card">
      <h1>Reset your Sparkle Suite password</h1>
      <p>
        Use the email on your Sparkle Suite account. When you set a new password,
        enter it twice so we can check it before saving.
      </p>

      {mode === 'update' ? (
        <form onSubmit={updatePassword} className="sl2-password-form">
          <label>
            <span>New password</span>
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={getPasswordMinLength()}
              aria-describedby="password-requirements"
              required
            />
          </label>
          <label>
            <span>Confirm new password</span>
            <input
              name="newPasswordConfirm"
              type="password"
              autoComplete="new-password"
              minLength={getPasswordMinLength()}
              aria-describedby="password-requirements"
              required
            />
          </label>
          <p id="password-requirements">{getPasswordRequirements()}</p>
          <button type="submit" disabled={busy}>
            {busy ? 'Updating...' : 'Update password'}
          </button>
        </form>
      ) : (
        <form onSubmit={requestReset} className="sl2-password-form">
          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}

      {error ? <div className="sl2-login__error">{error}</div> : null}
      {message ? <div className="sl2-login__message">{message}</div> : null}

      <Link className="sl2-login__secondary-link" href="/login">
        Back to sign in
      </Link>
    </div>
  )
}
