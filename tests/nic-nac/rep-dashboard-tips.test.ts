import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RepDashboard } from '@/app/nic-nac/components/RepDashboard'
import {
  initialTipModel,
  stepDashboardTip,
  tipWaitMs,
  type TipModel,
  type TipSignal,
} from '@/app/nic-nac/components/dashboard-tip-state'
import {
  DASHBOARD_TIP_HOVER_MS,
  DASHBOARD_TIP_IDS,
  DASHBOARD_TIP_LONG_PRESS_MS,
  REP_DASHBOARD_TIPS,
  dashboardTipText,
  type DashboardTipId,
} from '@/app/nic-nac/components/rep-dashboard-tips'
import { createEmptyRepDashboard } from '@/lib/services/rep-dashboard-math'

const TIME_ZONE = 'America/New_York'

function run(signals: TipSignal[], start: TipModel = initialTipModel) {
  return signals.reduce((model, signal) => stepDashboardTip(model, signal).model, start)
}

function click(model: TipModel) {
  return stepDashboardTip(model, { type: 'click' })
}

describe('rep dashboard hover tips', () => {
  it('keeps two or three editable sentences and no made-up stats', () => {
    expect(DASHBOARD_TIP_HOVER_MS).toBe(2_000)
    expect(DASHBOARD_TIP_LONG_PRESS_MS).toBeGreaterThanOrEqual(500)
    expect(DASHBOARD_TIP_LONG_PRESS_MS).toBeLessThan(DASHBOARD_TIP_HOVER_MS)
    expect(DASHBOARD_TIP_IDS).toEqual([
      'shows',
      'customers',
      'dance-floor',
      'messages',
      'visitors',
      'last-month',
    ])

    for (const id of DASHBOARD_TIP_IDS) {
      const sentences = REP_DASHBOARD_TIPS[id]
      expect(sentences.length).toBeGreaterThanOrEqual(2)
      expect(sentences.length).toBeLessThanOrEqual(3)
      for (const sentence of sentences) {
        expect(sentence.endsWith('.')).toBe(true)
        expect(sentence).not.toMatch(/\d/)
        expect(sentence).not.toMatch(/[$%]|average|most reps|guaranteed/i)
      }
      expect(dashboardTipText(id)).toBe(sentences.join(' '))
    }

    expect(dashboardTipText('customers').toLowerCase()).toContain('birthday')
    expect(dashboardTipText('shows').toLowerCase()).toContain('live')
    expect(dashboardTipText('dance-floor').toLowerCase()).toContain('live')
  })

  it('opens after the pointer rests for two seconds and hides on leave', () => {
    const hovering = run([{ type: 'pointer-enter', pointer: 'mouse', at: 1_000 }])
    expect(hovering.phase).toBe('hovering')
    expect(tipWaitMs(hovering)).toBe(2_000)
    expect(run([{ type: 'clock', at: 2_999 }], hovering).phase).toBe('hovering')

    const open = run([{ type: 'clock', at: 3_000 }], hovering)
    expect(open.phase).toBe('open')
    expect(open.swallowClick).toBe(false)
    expect(run([{ type: 'pointer-leave', pointer: 'mouse' }], open).phase).toBe('idle')
    expect(run([{ type: 'pointer-enter', pointer: 'pen', at: 0 }]).phase).toBe('hovering')
    expect(run([{ type: 'pointer-enter', pointer: 'touch', at: 0 }])).toEqual(initialTipModel)
  })

  it('shows on focus and keeps a focused tip when the pointer leaves', () => {
    const open = run([{ type: 'focus' }])
    expect(open.phase).toBe('open')
    expect(click(open).preventClick).toBe(false)
    expect(run([{ type: 'pointer-leave', pointer: 'mouse', focusInside: true }], open).phase).toBe('open')
    expect(run([{ type: 'blur', staysInside: true }], open).phase).toBe('open')
    expect(run([{ type: 'blur', staysInside: false }], open).phase).toBe('idle')
    expect(run([{ type: 'dismiss' }], open).phase).toBe('idle')
  })

  it('uses a long-press on touch and lets a tap through to Manage', () => {
    const pressing = run([{ type: 'touch-start', at: 500 }])
    expect(pressing.phase).toBe('pressing')
    expect(tipWaitMs(pressing)).toBe(DASHBOARD_TIP_LONG_PRESS_MS)

    const tapped = run([{ type: 'touch-end' }], pressing)
    expect(tapped.phase).toBe('idle')
    expect(click(tapped).preventClick).toBe(false)

    const held = run(
      [{ type: 'clock', at: 500 + DASHBOARD_TIP_LONG_PRESS_MS }],
      pressing,
    )
    expect(held.phase).toBe('open')
    expect(held.swallowClick).toBe(true)
    const focusedRelease = run([{ type: 'focus' }], held)
    expect(focusedRelease.swallowClick).toBe(true)
    const release = click(run([{ type: 'touch-end' }], focusedRelease))
    expect(release.preventClick).toBe(true)
    expect(release.model.phase).toBe('open')
    expect(release.model.swallowClick).toBe(false)

    const nextTap = click(run([{ type: 'touch-start', at: 2_000 }], release.model))
    expect(nextTap.preventClick).toBe(false)
    expect(run([{ type: 'touch-move' }], pressing).phase).toBe('idle')
  })

  it('does not put tip copy on the resting cards, and leaves Manage links in place', () => {
    const now = new Date('2026-10-13T16:00:00.000Z')
    const data = createEmptyRepDashboard(now, TIME_ZONE)
    data.monthAtAGlance = {
      periodLabel: 'September 2026',
      comparedToLabel: 'August 2026',
      rows: [
        {
          key: 'shows_scheduled',
          label: 'Shows scheduled',
          value: 2,
          previous: 1,
          direction: 'up',
        },
      ],
    }
    const html = renderToStaticMarkup(
      createElement(RepDashboard, {
        onOpenSection: () => undefined,
        data,
        now,
        publicSiteHref: 'https://example.test/britt',
      }),
    )

    for (const id of DASHBOARD_TIP_IDS) {
      expect(html).toContain(`data-dashboard-tip="${id}"`)
      expect(html).not.toContain(`data-testid="dashboard-tip-${id}"`)
      expect(html).not.toContain(dashboardTipText(id))
    }

    const slice = (from: string, to: string) => html.slice(html.indexOf(from), html.indexOf(to))
    expect(slice('data-testid="shows-card"', 'data-testid="customers-card"')).toContain('Manage')
    expect(slice('data-testid="shows-card"', 'data-testid="customers-card"')).toContain('section=show-calendar')
    expect(slice('data-testid="customers-card"', 'data-testid="dance-floor-insights"')).toContain('Birthdays')
    expect(slice('data-testid="customers-card"', 'data-testid="dance-floor-insights"')).toContain('section=customer-list')
    expect(slice('data-testid="dance-floor-insights"', 'data-testid="messages-card"')).toContain('section=trade-board')
    expect(slice('data-testid="messages-card"', 'data-testid="site-visitors"')).toContain('section=messages')
    expect(slice('data-testid="site-visitors"', 'data-testid="month-at-a-glance"')).toContain('Open site')
    expect(slice('data-testid="month-at-a-glance"', 'data-testid="rep-dashboard"') || html.slice(html.indexOf('data-testid="month-at-a-glance"'))).toContain('section=show-calendar')

    const order = DASHBOARD_TIP_IDS.map((id) => html.indexOf(`data-dashboard-tip="${id}"`))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(order.every((index) => index >= 0)).toBe(true)
  })

  it('styles the bubble like the dashboard and keeps it from taking clicks', () => {
    const css = readFileSync(new URL('../../app/nic-nac/components/RepDashboard.module.css', import.meta.url), 'utf8')
    const bubble = css.slice(css.indexOf('.tipBubble {'), css.indexOf('}', css.indexOf('.tipBubble {')) + 1)
    expect(bubble).toContain('pointer-events: none')
    expect(bubble).toContain('var(--dash-amethyst)')
    expect(bubble).toContain('var(--dash-cream)')
    expect(css).toContain('#ff4cae')

    const source = readFileSync(new URL('../../app/nic-nac/components/SubjectCardTip.tsx', import.meta.url), 'utf8')
    expect(source).toContain('if (!result.preventClick) return')
    expect(source).toContain('event.preventDefault()')
    expect(source).toContain('role="tooltip"')
    const tips = Object.keys(REP_DASHBOARD_TIPS) as DashboardTipId[]
    expect(tips).toEqual([...DASHBOARD_TIP_IDS])
  })
})
