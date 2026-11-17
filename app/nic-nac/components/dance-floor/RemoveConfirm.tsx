'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './dance-floor.module.css'
export function RemoveConfirm({ quantityZero, pending, busy, onCancel, onConfirm }: {
  quantityZero: boolean; pending: number; busy: boolean; onCancel: () => void; onConfirm: (reason: 'keeping' | 'mistake' | 'other') => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState<'keeping' | 'mistake' | 'other'>('other')
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const target = dialog.current; target?.showModal()
    return () => { target?.close(); previous?.focus() }
  }, [])
  const intro = quantityZero ? 'Setting quantity to 0 takes this dancer off your Dance Floor' : 'Removing this dancer takes it off your Dance Floor'
  return <dialog ref={dialog} className={styles.shareDialog} aria-labelledby="remove-dancer-title" onCancel={event => { if (busy) event.preventDefault(); else onCancel() }}>
    <div className={styles.shareContent}>
      <h2 id="remove-dancer-title">Take this dancer off your Floor?</h2>
      <p>{pending > 0 ? intro + ' and cancels ' + pending + ' pending swap ' + (pending === 1 ? 'request' : 'requests') + ". Their request page will say cancelled. They aren't notified." : intro + '. You can put it back for a short time after that.'}</p>
      {!quantityZero && <fieldset disabled={busy}><legend>Why? (optional)</legend>{([['keeping', 'Keeping it'], ['mistake', 'Added by mistake'], ['other', 'Other']] as const).map(([value, label]) => <label className={styles.done} key={value}><input type="radio" name="remove-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />{label}</label>)}</fieldset>}
      <div className={styles.actions}><button type="button" className={styles.secondary} disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className={styles.primary} disabled={busy} onClick={() => onConfirm(quantityZero ? 'other' : reason)}>{busy ? 'Saving…' : 'Take off Floor'}</button></div>
    </div>
  </dialog>
}
