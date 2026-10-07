'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type AuthState = 'checking' | 'signed_in' | 'signed_out'

export function SparkleSuitePublicAccountAction() {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let idle: number | undefined
    let timer: number | undefined

    async function initializeAccount() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        if (cancelled) return
        const supabase = createClient()
        supabase.auth.getSession().then(({ data }) => {
          if (!cancelled) setAuthState(data.session ? 'signed_in' : 'signed_out')
        }).catch(() => { if (!cancelled) setAuthState('signed_out') })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setAuthState(session ? 'signed_in' : 'signed_out')
        })
        unsubscribe = () => subscription.unsubscribe()
      } catch {
        if (!cancelled) setAuthState('signed_out')
      }
    }

    // Public copy and the sign-in link work before the account SDK is needed.
    const frame = window.requestAnimationFrame(() => {
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(() => void initializeAccount(), { timeout: 2000 })
      } else {
        timer = window.setTimeout(() => void initializeAccount(), 200)
      }
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      if (idle !== undefined) window.cancelIdleCallback(idle)
      if (timer !== undefined) window.clearTimeout(timer)
      unsubscribe?.()
    }
  }, [])

  async function handleLogout() {
    setBusy(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      await createClient().auth.signOut()
      window.location.assign('/')
    } catch {
      setBusy(false)
    }
  }

  if (authState === 'checking') {
    return <Link href="/login" prefetch={false}>Sign in here.</Link>
  }

  if (authState === 'signed_in') {
    return (
      <>
        <Link className="sl2-header__workspace-link" href="/nic-nac" prefetch={false}>
          Open workspace
        </Link>
        <button
          className="sl2-header__account-button"
          disabled={busy}
          onClick={() => void handleLogout()}
          type="button"
        >
          {busy ? 'Logging out...' : 'Log out'}
        </button>
      </>
    )
  }

  return (
    <>
      <span>Already have Sparkle Suite?</span>
      <Link href="/login" prefetch={false}>Sign in here.</Link>
    </>
  )
}
