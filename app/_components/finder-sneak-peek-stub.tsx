'use client'

import type { MouseEvent } from 'react'

import styles from './marketing-hub.module.css'

function stayOnThisPage(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
}

/** Empty-href stub. Louis will choose the destination later. */
export function FinderSneakPeekStub({ href, label }: { href: string; label: string }) {
  return (
    <a className={styles.sneakPeek} href={href} onAuxClick={stayOnThisPage} onClick={stayOnThisPage}>
      {label}
    </a>
  )
}
