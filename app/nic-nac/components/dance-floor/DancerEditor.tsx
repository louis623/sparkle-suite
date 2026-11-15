'use client'
import { useEffect, useRef, useState } from 'react'
import type { TradeListingWithDesign } from '@/lib/services/types'
import { changeFloorPhoto, FloorMutationError, mutateFloor } from './useDanceFloorData'
import { RemoveConfirm } from './RemoveConfirm'
import styles from './dance-floor.module.css'
export function DancerEditor({ listing, onDirty, onClose, onRefresh, onRemoved }: {
  listing: TradeListingWithDesign; onDirty: (dirty: boolean) => void; onClose: () => void; onRefresh: () => Promise<unknown>; onRemoved: (id: string) => void
}) {
  const [savedNotes, setSavedNotes] = useState(listing.rep_notes ?? '')
  const [notes, setNotes] = useState(savedNotes)
  const [savedQuantity, setSavedQuantity] = useState(listing.quantity_available ?? 1)
  const [quantity, setQuantity] = useState(savedQuantity)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [blockers, setBlockers] = useState<FloorMutationError['blockers']>([])
  const [confirm, setConfirm] = useState<'zero' | 'remove' | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const dirty = notes !== savedNotes || quantity !== savedQuantity
  useEffect(() => { onDirty(dirty || busy || confirm !== null) }, [dirty, busy, confirm, onDirty])
  async function attempt(action: () => Promise<unknown>) {
    setBusy(true); setError(''); setBlockers([])
    try { await action(); await onRefresh() }
    catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update that dancer. Try again.")
      if (e instanceof FloorMutationError) {
        setBlockers(e.blockers)
        if (['LISTING_NOT_ACTIVE', 'LISTING_NOT_FOUND'].includes(e.code)) await onRefresh()
      }
    } finally { setBusy(false) }
  }
  async function save() {
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
    <label className={styles.field}>Notes<textarea value={notes} placeholder="Size, preference, or a reminder for you" onChange={e => setNotes(e.target.value)} disabled={busy} /></label>
    <p className={styles.muted}>Private. Only you can see notes.</p>
    <div className={styles.chips}>
      <input ref={file} type="file" accept="image/*" className={styles.srOnly} onChange={e => { const selected = e.target.files?.[0]; e.target.value = ''; if (selected) void attempt(() => changeFloorPhoto(listing.id, selected)) }} />
      <button type="button" className={styles.secondary} disabled={busy} onClick={() => file.current?.click()}>Change photo</button>
      {listing.design?.canonical_photo_url && <button type="button" className={styles.secondary} disabled={busy} onClick={() => void attempt(() => mutateFloor('/api/nic-nac/trade-board', 'PATCH', { listingId: listing.id, useCanonicalPhoto: true }))}>Use catalog photo</button>}
    </div>
    <label className={styles.field}>Quantity<span className={styles.stepper}>
      <button type="button" aria-label="Decrease quantity" disabled={busy || quantity <= 0} onClick={() => setQuantity(q => q - 1)}>−</button>
      <input type="number" aria-label="Quantity" min={0} max={Math.max(99, savedQuantity)} value={quantity} disabled={busy} onChange={e => setQuantity(Math.max(0, Math.min(Math.max(99, savedQuantity), Math.floor(Number(e.target.value)))))} />
      <button type="button" aria-label="Increase quantity" disabled={busy || quantity >= Math.max(99, savedQuantity)} onClick={() => setQuantity(q => q + 1)}>+</button>
    </span></label>
    <p className={styles.muted}>Set to 0 to take this dancer off your Floor.</p>
    {savedQuantity > 99 && <p>You can reduce this quantity, but you can't raise it above its current amount.</p>}
    {error && <p role="alert">{error}</p>}
    {blockers.length > 0 && <ul>{blockers.map(item => <li key={item.requestId}>{item.customerName} · {item.status ?? 'Open'} · <a href="#history">Swap history</a></li>)}</ul>}
    <div className={styles.chips}>
      <button type="button" className={styles.primary} disabled={busy || !dirty} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>
      <button type="button" className={styles.linkButton} disabled={busy} onClick={() => setConfirm('remove')}>Remove</button>
      <button type="button" className={styles.secondary} disabled={busy} onClick={onClose}>Cancel</button>
    </div>
    {confirm && <RemoveConfirm quantityZero={confirm === 'zero'} pending={listing.pendingRequestCount ?? 0} busy={busy} onCancel={() => { setQuantity(savedQuantity); setConfirm(null) }} onConfirm={reason => void attempt(async () => {
      await mutateFloor('/api/nic-nac/trade-board', 'DELETE', { listingId: listing.id, reason })
      setConfirm(null); onRemoved(listing.id)
    }).then(() => setConfirm(null))} />}
  </div>
}
