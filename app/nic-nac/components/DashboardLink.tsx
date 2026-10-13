'use client'

import type { MouseEvent, ReactNode } from 'react'
import styles from './RepDashboard.module.css'

export function ClickCue({ kind = 'manage' }: { kind?: 'manage' | 'details' | 'site' }) {
  const label = kind === 'site' ? 'Open site ›' : kind === 'details' ? 'See details ›' : 'Manage ›'
  return <span className={styles.clickCue}>{label}</span>
}

export function DashboardLink({
  href,
  className,
  onOpen,
  children,
  label,
  testId,
  target,
  rel,
}: {
  href: string
  className?: string
  onOpen?: () => void
  children: ReactNode
  label?: string
  testId?: string
  target?: string
  rel?: string
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onOpen) return
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    onOpen()
  }

  return (
    <a
      className={[className, styles.cardLink].filter(Boolean).join(' ')}
      href={href}
      onClick={onClick}
      aria-label={label}
      data-testid={testId}
      target={target}
      rel={rel}
    >
      {children}
    </a>
  )
}
