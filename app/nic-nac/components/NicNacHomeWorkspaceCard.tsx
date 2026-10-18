'use client'

import { CalendarDays, ExternalLink, Gem, Sparkles } from 'lucide-react'

import type { WorkspaceLaunchAction } from '@/lib/nic-nac/workspace-launch-actions'

import styles from './NicNacHomeWorkspaceCard.module.css'

export function NicNacHomeWorkspaceCard({
  tradeRequestsCount,
  cleanupCount,
  fulfillmentCount,
  nextShowLabel,
  onLaunchAction,
  onOpenTradeBoard,
  onOpenCalendar,
  onOpenCustomerBoardPreview,
}: {
  tradeRequestsCount: number
  cleanupCount: number
  fulfillmentCount: number
  nextShowLabel: string
  onLaunchAction: (action: WorkspaceLaunchAction) => void
  onOpenTradeBoard: () => void
  onOpenCalendar: () => void
  onOpenCustomerBoardPreview: () => void
}) {
  return (
    <section className={styles.homeShell}>
      <div className={styles.chatIntro}>
        <div className={styles.chatTitleRow}>
          <Sparkles className={styles.chatMark} aria-hidden="true" />
          <span className={styles.chatTitle}>Nic-Nac</span>
        </div>
        <p className={styles.chatSubtitle}>
          Start here. I can add pieces, set up shows, and walk you through the
          next step.
        </p>
      </div>

      <div className={styles.quickActions}>
        <button type="button" onClick={() => onLaunchAction('add_trade_piece')}>
          <Gem aria-hidden="true" />
          <span>Add a piece</span>
        </button>
        <button type="button" onClick={() => onLaunchAction('add_calendar_show')}>
          <CalendarDays aria-hidden="true" />
          <span>Add a show</span>
        </button>
      </div>

      <div className={styles.todayPanel}>
        <div>
          <span className={styles.todayLabel}>Today&apos;s swap work</span>
          <span className={styles.todayCopy}>The fast things worth checking.</span>
        </div>
        <div className={styles.todayStrip}>
          <span>
            <strong>{tradeRequestsCount}</strong> Pending requests
          </span>
          <span>
            <strong>{cleanupCount}</strong> Swap follow-up
          </span>
          <span>
            <strong>{fulfillmentCount}</strong> Fulfillment swaps
          </span>
        </div>
      </div>

      <div className={styles.glanceGrid}>
        <button type="button" onClick={onOpenTradeBoard}>
          <Gem aria-hidden="true" />
          <span>Dance Floor</span>
        </button>
        <button type="button" onClick={onOpenCalendar}>
          <CalendarDays aria-hidden="true" />
          <span>{nextShowLabel}</span>
        </button>
        <button type="button" onClick={onOpenCustomerBoardPreview}>
          <ExternalLink aria-hidden="true" />
          <span>Customer board</span>
        </button>
      </div>
    </section>
  )
}
