'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { safeRelativeRedirectPath } from '@/lib/auth/safe-redirect'
import { createClient } from '@/lib/supabase/client'

export default function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [magicLinkBusy, setMagicLinkBusy] = useState(false)
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null)
  const controlsDisabled = busy || magicLinkBusy
  const redirect = safeRelativeRedirectPath(searchParams.get('redirect'))
  const passwordResetSuccess = searchParams.get('reset') === 'success'
  const signInErrorCode = searchParams.get('error')
  const callbackError =
    signInErrorCode === 'account_not_found'
      ? 'No Sparkle Suite account is associated with this email. Try a different Google account or contact Louis.'
      : signInErrorCode === 'self_serve_not_open'
        ? 'This email has not been set up for Sparkle Suite yet. Contact Louis before signing in.'
        : signInErrorCode === 'missing_oauth_code' ||
            signInErrorCode === 'oauth_exchange_failed'
          ? 'Sign-in did not finish. Please try again.'
          : null

  async function sendMagicLink() {
    const trimmedEmail = email.trim()
    setError(null)
    setMagicLinkSentTo(null)
    if (!trimmedEmail) {
      setError('Enter your email and we will send a sign-in link. No password needed.')
      return
    }

    setMagicLinkBusy(true)
    try {
      const supabase = createClient()
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirect)}`,
          shouldCreateUser: false,
        },
      })
      if (otpError) {
        setError(otpError.message)
        return
      }
      setMagicLinkSentTo(trimmedEmail)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setMagicLinkBusy(false)
    }
  }

  return (
    <div
      className="sl2-login__card"
      style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system',
        maxWidth: 360,
        margin: '0 auto',
        padding: 24,
        border: '1px solid #e5e5e5',
        borderRadius: 6,
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0, marginBottom: 16 }}>Sign in</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          setBusy(true)
          try {
            const supabase = createClient()
            const { error: signErr } = await supabase.auth.signInWithPassword({
              email,
              password,
            })
            if (signErr) {
              setError(signErr.message)
              return
            }
            const trialResponse = await fetch('/api/account/activate-trial', {
              method: 'POST',
            })
            if (!trialResponse.ok) {
              await supabase.auth.signOut()
              const payload = (await trialResponse.json().catch(() => null)) as
                | { error?: string; message?: string }
                | null
              setError(
                payload?.error === 'account_not_found'
                  ? 'No Sparkle Suite account is associated with this email. Contact Louis or sign in with a different email.'
                  : payload?.message ??
                      payload?.error ??
                      'We could not start your trial. Please sign in again.',
              )
              return
            }
            router.replace(redirect)
          } catch (err) {
            setError((err as Error).message)
          } finally {
            setBusy(false)
          }
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4 }}
          required
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #ccc', borderRadius: 4 }}
          required
        />
        {passwordResetSuccess ? (
          <div className="sl2-login__message">
            Your password has been updated. Sign in with your new password.
          </div>
        ) : null}
        {(error || callbackError) && (
          <div style={{ color: '#b00020', fontSize: 13 }}>
            {error ?? callbackError}
          </div>
        )}
        <button
          type="submit"
          disabled={controlsDisabled}
          style={{
            padding: '8px 16px',
            background: controlsDisabled ? '#ccc' : '#111',
            color: 'white',
            border: 0,
            borderRadius: 4,
            cursor: controlsDisabled ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button
        type="button"
        disabled={controlsDisabled}
        onClick={async () => {
          setError(null)
          setBusy(true)
          try {
            const supabase = createClient()
            await supabase.auth.signOut({ scope: 'local' })
            const { error: signErr } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(redirect)}`,
                queryParams: {
                  prompt: 'select_account',
                },
              },
            })
            if (signErr) {
              setError(signErr.message)
              setBusy(false)
            }
          } catch (err) {
            setError((err as Error).message)
            setBusy(false)
          }
        }}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '8px 16px',
          background: 'white',
          color: '#111',
          border: '1px solid #ccc',
          borderRadius: 4,
          cursor: controlsDisabled ? 'default' : 'pointer',
        }}
      >
        Continue with Google
      </button>
      <button
        type="button"
        disabled={controlsDisabled}
        onClick={() => {
          void sendMagicLink()
        }}
        style={{
          marginTop: 12,
          width: '100%',
          padding: '8px 16px',
          background: 'white',
          color: '#111',
          border: '1px solid #ccc',
          borderRadius: 4,
          cursor: controlsDisabled ? 'default' : 'pointer',
        }}
      >
        {magicLinkBusy ? 'Sending link…' : 'Email me a magic link'}
      </button>
      {magicLinkSentTo ? (
        <div className="sl2-login__message" style={{ marginTop: 12 }}>
          Check your email. We sent a sign-in link to {magicLinkSentTo}. Open it
          in this browser to finish signing in. You do not need a password.
        </div>
      ) : null}
      <Link className="sl2-login__secondary-link" href="/reset-password">
        Forgot or need to change your password?
      </Link>
    </div>
  )
}
