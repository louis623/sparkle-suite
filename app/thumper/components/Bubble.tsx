import type { ReactNode } from 'react'
import { ThumperGlyph } from './ThumperGlyph'
import styles from './Bubble.module.css'

export function Bubble({
  variant,
  showGlyph,
  children,
}: {
  variant: 'rep' | 'thumper'
  showGlyph?: boolean
  children: ReactNode
}) {
  if (variant === 'rep') {
    return (
      <div className={styles.repRow}>
        <div className={`${styles.bubble} ${styles.rep}`}>{children}</div>
      </div>
    )
  }
  return (
    <div className={styles.thumperRow}>
      <div className={styles.glyphSlot}>
        {showGlyph ? <ThumperGlyph size={22} /> : null}
      </div>
      <div className={`${styles.bubble} ${styles.thumper}`}>{children}</div>
    </div>
  )
}
