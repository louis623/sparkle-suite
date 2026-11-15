'use client'
import { useState } from 'react'
import type { Publication } from './types'
import { ShareSheet } from './ShareSheet'
import styles from './dance-floor.module.css'

export function DanceFloorHeader({ publication, onSiteSetup }: { publication: Publication; onSiteSetup?: () => void }) {
  const [sharing, setSharing] = useState(false)
  return <header id="top" className={styles.header}>
    <div><p className={styles.kicker}>Workspace</p><h1>Dance Floor</h1>
      <p>Review requests, keep your dancers up to date, and share your public Floor.</p></div>
    {publication.status === 'published' && <button type="button" className={styles.primary} onClick={() => setSharing(true)}>Share</button>}
    {publication.status === 'unpublished' && <div className={styles.setup}>
      <p>Your public Dance Floor isn't published yet. Finish setting up your public site to share a live link.</p>
      <button type="button" className={styles.secondary} onClick={onSiteSetup}>Open site setup</button></div>}
    {publication.status === 'published' && sharing && <ShareSheet publication={publication} onClose={() => setSharing(false)} />}
  </header>
}
