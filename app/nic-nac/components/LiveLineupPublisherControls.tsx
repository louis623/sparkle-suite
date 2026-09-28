'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { isIssuedPublisher, isPublisherList, type LineupPublisher } from './live-lineup-client'
import styles from './LiveLineupCard.module.css'

const ENDPOINT = '/api/workspace/live-lineup'

/** Secrets exist only in this mounted view; never persist them or include them in links. */
export function LiveLineupPublisherControls({ onChanged, disabled = false, creationDisabled = disabled, recoveryOnly = false }: {
  onChanged: () => void
  disabled?: boolean
  creationDisabled?: boolean
  recoveryOnly?: boolean
}) {
  const labelId = useId()
  const [publishers, setPublishers] = useState<LineupPublisher[] | null>(null)
  const [label, setLabel] = useState('Show laptop')
  const [issued, setIssued] = useState<{ publisher: LineupPublisher; token: string } | null>(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [reviewRequired, setReviewRequired] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const opened = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; controllerRef.current?.abort() }
  }, [])

  async function request(method: 'GET' | 'POST' | 'DELETE', publisherId?: string) {
    if (disabled || (method === 'POST' && (creationDisabled || recoveryOnly)) || controllerRef.current) return
    const controller = new AbortController()
    controllerRef.current = controller
    setPending(true)
    setMessage('')
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    try {
      const response = await fetch(`${ENDPOINT}/publishers`, {
        method, cache: 'no-store', signal: controller.signal,
        ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(method === 'POST' ? { label: label.trim() } : { publisherId }) }),
      })
      const next: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const code = next && typeof next === 'object' ? (next as { error?: unknown }).error : null
        if (method === 'POST' && response.status === 409 && code === 'publisher_limit_reached') {
          throw new Error('publisher_limit_reached')
        }
        throw new Error('Publisher request failed')
      }
      if (!mounted.current) return
      if (method === 'GET') {
        if (!isPublisherList(next)) throw new Error('Invalid publisher list')
        setPublishers(next.publishers)
        setReviewRequired(false)
      } else if (method === 'POST') {
        if (!isIssuedPublisher(next)) throw new Error('Invalid pairing receipt')
        if (opened.current) setIssued(next)
        setPublishers(current => [next.publisher, ...(current ?? [])])
        setMessage(opened.current ? 'Private connection key created. Copy it into the updated Sparkle Suite extension, then dismiss it here.'
          : 'Connection created while this section was closed. Its key was discarded; revoke it before creating another.')
      } else {
        if (!next || typeof next !== 'object' || (next as { ok?: unknown }).ok !== true) throw new Error('Invalid revoke receipt')
        setPublishers(current => current?.map(p => p.id === publisherId ? { ...p, revokedAt: new Date().toISOString(), active: false } : p) ?? null)
        setIssued(current => current?.publisher.id === publisherId ? null : current)
        setRevokeId(null)
        setMessage('Connection revoked. That key can no longer send updates.')
      }
      if (method !== 'GET') onChanged()
    } catch (error) {
      const limitReached = error instanceof Error && error.message === 'publisher_limit_reached'
      if (mounted.current && method !== 'GET') setReviewRequired(!limitReached)
      if (mounted.current) setMessage(limitReached
        ? 'Eight usable extension connections already exist. Revoke one you no longer use, then create the new connection.'
        : method === 'GET'
        ? 'Connection setup is unavailable. Your existing lineup is unchanged. Try refreshing this list.'
        : 'Change not confirmed. Refresh the connections before trying again; a request may have reached the server.')
    } finally {
      window.clearTimeout(timeout)
      if (controllerRef.current === controller) controllerRef.current = null
      if (mounted.current) setPending(false)
    }
  }

  async function copyKey() {
    if (!issued) return
    try {
      await navigator.clipboard.writeText(issued.token)
      if (mounted.current) setMessage('Private key copied. Paste it only into the Sparkle Suite extension.')
    } catch {
      if (mounted.current) setMessage('Clipboard access was unavailable. Use the private key field to select and copy manually.')
    }
  }

  return <details className={styles.pairing} onToggle={event => {
    opened.current = event.currentTarget.open
    if (event.currentTarget.open) void request('GET')
    else { setIssued(null); setRevokeId(null) }
  }}>
    <summary>{recoveryOnly ? 'Saved connection recovery' : 'Extension connection setup'}</summary>
    {recoveryOnly ? <p>Keep using your assigned Live Lineup code in the extension. You can review or revoke an existing saved private connection here.</p>
      : <p>Connect only the upgraded Sparkle Suite extension. Creating a key does not change the active source or mark it connected.</p>}
    {!recoveryOnly && <div className={styles.pairForm}>
      <label htmlFor={labelId}>Computer name</label>
      <input id={labelId} value={label} maxLength={80} autoComplete="off" disabled={creationDisabled || pending} onChange={event => setLabel(event.target.value)} />
      <button type="button" disabled={creationDisabled || pending || reviewRequired || !publishers || !label.trim() || !!issued} onClick={() => void request('POST')}>Create private connection key</button>
    </div>}
    {!recoveryOnly && issued && <div className={styles.privateKey}>
      <label>Private key—shown once<input aria-label="One-time private extension key" type="password" readOnly value={issued.token} autoComplete="off" onFocus={event => event.currentTarget.select()} /></label>
      <div><button type="button" onClick={() => void copyKey()}>Copy key</button> <button type="button" onClick={() => { setIssued(null); setMessage('Private key dismissed. It cannot be retrieved here again.') }}>Dismiss key</button></div>
      <p>Do not share this key or include it in screenshots. Closing this section removes it from this view.</p>
    </div>}
    <p role="status" aria-live="polite">{pending ? 'Updating connections…' : message}</p>
    <button type="button" disabled={disabled || pending} onClick={() => void request('GET')}>Refresh connections</button>
    {publishers && !publishers.length && <p>{recoveryOnly ? 'No saved private connections. Use your assigned Live Lineup code in the extension.' : 'No upgraded connections yet.'}</p>}
    <ul className={styles.publisherList}>{publishers?.map(p => <li key={p.id}>
      <strong>{p.label}</strong>
      <span>{p.revokedAt ? 'Revoked' : Date.parse(p.expiresAt) <= Date.now() ? 'Expired' : p.active ? 'Selected source' : 'Ready to pair'}</span>
      {!p.revokedAt && <div>{revokeId === p.id ? <>
        <p>Revoke this connection? It will stop accepting updates from this computer.</p>
        <button type="button" disabled={disabled || pending || reviewRequired} onClick={() => void request('DELETE', p.id)}>Confirm revoke {p.label}</button>
        <button type="button" disabled={disabled || pending} onClick={() => setRevokeId(null)}>Cancel</button>
      </> : <button type="button" disabled={disabled || pending} onClick={() => setRevokeId(p.id)}>Revoke {p.label}</button>}</div>}
    </li>)}</ul>
  </details>
}
