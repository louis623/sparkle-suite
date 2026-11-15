'use client'
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { TradeListingWithDesign } from '@/lib/services/types'
import { changeFloorPhoto, FloorMutationError, mutateFloor } from './useDanceFloorData'
import { RemoveConfirm } from './RemoveConfirm'
import styles from './dance-floor.module.css'
export type DancerDraft = {
  listing: TradeListingWithDesign; index: number; notes: string; savedNotes: string;
  quantity: number; savedQuantity: number; gone: boolean
}
export function DancerEditor({ draft, setDraft, onDirty, onClose, onRefresh, onRemoved }: {
  draft: DancerDraft; setDraft: Dispatch<SetStateAction<DancerDraft | null>>; onDirty: (blocked: boolean, dirty: boolean) => void; onClose: () => void; onRefresh: () => Promise<unknown>; onRemoved: (id: string) => void
}) {
  const { listing, notes, savedNotes, quantity, savedQuantity, gone } = draft
  const setNotes = (value: string) => setDraft(current => current && { ...current, notes: value })
  const setSavedNotes = (value: string) => setDraft(current => current && { ...current, savedNotes: value })
  const setQuantity = (value: number | ((q: number) => number)) => setDraft(current => current && { ...current, quantity: typeof value === 'function' ? value(current.quantity) : value })
  const setSavedQuantity = (value: number) => setDraft(current => current && { ...current, savedQuantity: value })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [blockers, setBlockers] = useState<FloorMutationError['blockers']>([])
  const [confirm, setConfirm] = useState<'zero' | 'remove' | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const dirty = notes !== savedNotes || quantity !== savedQuantity
  useEffect(() => { onDirty(dirty || busy || confirm !== null, dirty) }, [dirty, busy, confirm, onDirty])
  async function attempt(action: () => Promise<unknown>) {
    setBusy(true); setError(''); setBlockers([])
    try { await action() }
    catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update that dancer. Try again.")
      if (e instanceof FloorMutationError) {
        setBlockers(e.blockers)
      }
    } finally { try { await onRefresh() } finally { setBusy(false) } }
  }
  async function save() {
    if (gone || busy) return
    if (quantity === 0) { setConfirm('zero'); return }
    await attempt(async () => {
      // Independent successes clear only their own dirty field; failed fields stay editable.
      const failures: unknown[] = []
      if (notes !== savedNotes) {
        try { await mutateFloor('/api/nic-nac/trade-board', 'PATCH', { listingId: listing.id, repNotes: notes }); setSavedNotes(notes) }
        catch (e) { failures.push(e) }
      }
      if (quantity !== savedQuantity) {
        try { await mutateFloor('/api/nic-nac/trade-board/quantity', 'POST', { listingId: listing.id, quantity, expectedQuantity: savedQuantity }); setSavedQuantity(quantity) }
        catch (e) { failures.push(e) }
      }
      if (failures.length) throw failures[0]
    })
  }
  return <div className={styles.editor + ' ph-no-capture'}>
    <label className={styles.field}>Notes<textarea value={notes} placeholder="Size, preference, or a reminder for you" onChange={e => setNotes(e.target.value)} disabled={busy || gone} /></label>
    <p className={styles.muted}>Private. Only you can see notes.</p>
    <div className={styles.chips}>
      <input ref={file} type="file" accept="image/*" className={styles.srOnly} disabled={busy || gone} onChange={e => { if (gone || busy) return; const selected = e.target.files?.[0]; e.target.value = ''; if (selected) void attempt(() => changeFloorPhoto(listing.id, selected)) }} />
      <button type="button" className={styles.secondary} disabled={busy || gone} onClick={() => file.current?.click()}>Change photo</button>
      {listing.design?.canonical_photo_url && <button type="button" className={styles.secondary} disabled={busy || gone} onClick={() => void attempt(() => mutateFloor('/api/nic-nac/trade-board', 'PATCH', { listingId: listing.id, useCanonicalPhoto: true }))}>Use catalog photo</button>}
    </div>
    <label className={styles.field}>Quantity<span className={styles.stepper}>
      <button type="button" aria-label="Decrease quantity" disabled={busy || gone || quantity <= 0} onClick={() => setQuantity(q => q - 1)}>−</button>
      <input type="number" aria-label="Quantity" min={0} max={Math.max(99, savedQuantity)} value={quantity} disabled={busy || gone} onChange={e => setQuantity(Math.max(0, Math.min(Math.max(99, savedQuantity), Math.floor(Number(e.target.value)))))} />
      <button type="button" aria-label="Increase quantity" disabled={busy || gone || quantity >= Math.max(99, savedQuantity)} onClick={() => setQuantity(q => q + 1)}>+</button>
    </span></label>
    <p className={styles.muted}>Set to 0 to take this dancer off your Floor.</p>
    {savedQuantity > 99 && <p>{"You can reduce this quantity, but you can't raise it above its current amount."}</p>}
    {gone && <p role="alert">{"That dancer isn't on your Floor anymore."}</p>}
    {error && <p role="alert">{error}</p>}
    {blockers.length > 0 && <ul>{blockers.map(item => <li key={item.requestId}>{item.customerName} · {item.status ?? 'Open'} · <a href="#history">Swap history</a></li>)}</ul>}
    <div className={styles.chips}>
      <button type="button" className={styles.primary} disabled={busy || gone || !dirty} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>
      <button type="button" className={styles.linkButton} disabled={busy || gone} onClick={() => setConfirm('remove')}>Remove</button>
      <button type="button" className={styles.secondary} disabled={busy} onClick={onClose}>Cancel</button>
    </div>
    {confirm && !gone && <RemoveConfirm quantityZero={confirm === 'zero'} pending={listing.pendingRequestCount ?? 0} busy={busy} onCancel={() => { if (confirm === 'zero') setQuantity(savedQuantity); setConfirm(null) }} onConfirm={reason => void attempt(async () => {
      await mutateFloor('/api/nic-nac/trade-board', 'DELETE', { listingId: listing.id, reason })
      setConfirm(null); onRemoved(listing.id)
    }).then(() => setConfirm(null))} />}
  </div>
}
