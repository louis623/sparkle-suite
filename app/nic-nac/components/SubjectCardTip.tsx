'use client'

import { useId, type ReactNode } from 'react'
import { dashboardTipText, type DashboardTipId } from './rep-dashboard-tips'
import { useDelayedHoverTip } from './use-delayed-hover-tip'
import styles from './RepDashboard.module.css'

export function SubjectCardTip({
  tip,
  testId,
  className,
  ariaLabel,
  ariaLabelledBy,
  children,
}: {
  tip: DashboardTipId
  testId: string
  className?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  children: ReactNode
}) {
  const tipId = useId()
  const { rootRef, open, handlers } = useDelayedHoverTip()

  return (
    <section
      ref={rootRef}
      className={[styles.subjectCard, styles.tipHost, className].filter(Boolean).join(' ')}
      data-testid={testId}
      data-dashboard-tip={tip}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={open ? tipId : undefined}
      {...handlers}
    >
      {open ? (
        <p
          id={tipId}
          role="tooltip"
          className={styles.tipBubble}
          data-testid={`dashboard-tip-${tip}`}
        >
          {dashboardTipText(tip)}
        </p>
      ) : null}
      {children}
    </section>
  )
}
