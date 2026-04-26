'use client'

import type { ReactNode } from 'react'
import { ThumperHeader } from './ThumperHeader'
import styles from './ThumperColumn.module.css'

export function ThumperColumn({
  children,
  variant,
  onClose,
}: {
  children: ReactNode
  variant: 'desktop' | 'mobile'
  onClose?: () => void
}) {
  return (
    <aside className={`${styles.column} ${variant === 'mobile' ? styles.mobile : styles.desktop}`}>
      <ThumperHeader onClose={onClose} />
      {children}
    </aside>
  )
}
