'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type AuthState = 'checking' | 'signed_in' | 'signed_out'

export function SparkleSuitePublicAccountAction() {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    const supabase = createClient()
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setAuthState(data.session ? 'signed_in' : 'signed_out')
    }).catch(() => { if (!cancelled) setAuthState('signed_out') })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? 'signed_in' : 'signed_out')
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  if (authState === 'checking') {
    return <Link href="/login">Sign in here.</Link>
  }

  if (authState === 'signed_in') {
    return (
      <>
        <Link className="sl2-header__workspace-link" href="/nic-nac">
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
      <Link href="/login">Sign in here.</Link>
    </>
  )
}
