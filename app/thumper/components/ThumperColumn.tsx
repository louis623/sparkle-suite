'use client'

import type { ReactNode } from 'react'
import { ThumperHeader } from './ThumperHeader'
import styles from './ThumperColumn.module.css'

export function ThumperColumn({
  children,
  variant,
  onClose,
  onNewConversation,
  newConversationDisabled,
}: {
  children: ReactNode
  variant: 'desktop' | 'mobile'
  onClose?: () => void
  onNewConversation?: () => void
  newConversationDisabled?: boolean
}) {
  const closeLabel = variant === 'desktop' ? 'Minimize Thumper' : 'Close Thumper'
  return (
    <aside
      className={`${styles.column} ${variant === 'mobile' ? styles.mobile : styles.desktop}`}
    >
      <ThumperHeader
        onClose={onClose}
        onNewConversation={onNewConversation}
        newConversationDisabled={newConversationDisabled}
        closeLabel={closeLabel}
      />
      {children}
    </aside>
  )
}
