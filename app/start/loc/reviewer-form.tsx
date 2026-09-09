'use client'
import { useState } from 'react'
export default function LocReviewerForm() {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function open(state: 'dashboard_unlocked' | 'required_setup') {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/reviewer-smoke/loc-session', { method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, state }), cache: 'no-store' })
      const result = await response.json(); setToken('')
      if (!response.ok || !result.ok) throw new Error(result.error || 'Reviewer access failed.')
      window.location.assign('/nic-nac')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Reviewer access failed.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={event => { event.preventDefault(); void open('dashboard_unlocked') }}>
    <label htmlFor="review-key">Reviewer access key</label>
    <input id="review-key" type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)}
      required minLength={32} maxLength={512} style={{ display: 'block', width: '100%', minHeight: 48, margin: '12px 0', boxSizing: 'border-box' }} />
    <button type="submit" disabled={busy || token.length < 32} style={{ minHeight: 48, marginRight: 12 }}>Open test workspace</button>
    <button type="button" disabled={busy || token.length < 32} onClick={() => void open('required_setup')} style={{ minHeight: 48 }}>Open test setup</button>
    {busy && <p role="status">Preparing the dedicated reviewer…</p>}
    {error && <p role="alert">{error}</p>}
  </form>
}
