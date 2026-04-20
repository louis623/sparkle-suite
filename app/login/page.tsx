'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div
      style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system',
        maxWidth: 360,
        margin: '80px auto',
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
            const redirect = searchParams.get('redirect') || '/spike'
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
        {error && <div style={{ color: '#b00020', fontSize: 13 }}>{error}</div>}
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: '8px 16px',
            background: busy ? '#ccc' : '#111',
            color: 'white',
            border: 0,
            borderRadius: 4,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
