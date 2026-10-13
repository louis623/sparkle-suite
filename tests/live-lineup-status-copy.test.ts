import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LIVE_LINEUP_STATUS,
  SOURCE_NOT_READY_WARNING,
  workspaceLineupStatus,
} from '@/lib/live-lineup/status-copy'

const root = process.cwd()
const popupSource = readFileSync(resolve(root, 'chrome-extension/popup.js'), 'utf8')
const extensionLineupStatus = new Function(
  `${popupSource.slice(0, popupSource.indexOf('(function(){'))}\nreturn extensionLineupStatus;`,
)() as (value: Record<string, unknown>) => { title: string; detail: string; tone: string }

function popup(overrides: Record<string, unknown> = {}) {
  return extensionLineupStatus({
    enabled: true,
    needsConnection: false,
    lastError: null,
    parserReason: null,
    parserState: 'loading',
    connected: false,
    scopePending: false,
    lastReadyAckAt: null,
    ...overrides,
  })
}

describe('Live Lineup status copy', () => {
  it('uses one phrase everywhere', () => {
    const phrases = Object.values(LIVE_LINEUP_STATUS)
    expect(phrases).toEqual([
      'Connecting',
      'Connected + Updating',
      'Reconnecting',
      'Needs attention',
      'Off',
    ])
    for (const phrase of phrases) expect(popupSource).toContain(phrase)
    const card = readFileSync(resolve(root, 'app/nic-nac/components/LiveLineupCard.tsx'), 'utf8')
    expect(card).toContain('workspaceLineupStatus')
    expect(card).not.toContain('Checking connection')
    expect(card).not.toContain('Waiting for an update')
    expect(card).not.toContain("error ? 'Not connected'")
    const css = readFileSync(resolve(root, 'app/nic-nac/components/LiveLineupCard.module.css'), 'utf8')
    expect(css).toContain(".connection[data-connection='updating'] > span { background: #178159; }")
    expect(css).toContain(".connection[data-connection='attention'] > span { background: #c53855; }")
    expect(css).not.toContain("data-connection='delayed'")
    expect(readFileSync(resolve(root, 'lib/live-lineup/model.ts'), 'utf8')).toContain(SOURCE_NOT_READY_WARNING)
    expect(readFileSync(resolve(root, 'chrome-extension/popup.html'), 'utf8')).toContain('>Connecting<')
    for (const retired of ['"Paused"', '"Connection needs attention"', '"Waiting for Party Orders"', '"Applying party selection"', '"Connected"']) {
      expect(popupSource).not.toContain(retired)
    }
  })

  it('keeps Workspace green for a healthy heartbeat and a routine source refresh', () => {
    expect(workspaceLineupStatus({ connection: 'connected', warning: null })).toEqual({
      label: 'Connected + Updating',
      tone: 'updating',
    })
    expect(workspaceLineupStatus({ connection: 'connected', warning: 'Kept a restored order.' })).toEqual({
      label: 'Connected + Updating',
      tone: 'updating',
    })
    expect(workspaceLineupStatus({ connection: 'delayed', warning: SOURCE_NOT_READY_WARNING })).toEqual({
      label: 'Connected + Updating',
      tone: 'updating',
    })
  })

  it('uses red only when the Workspace publisher is offline, and amber while retrying', () => {
    expect(workspaceLineupStatus({ connection: null })).toEqual({ label: 'Connecting', tone: 'connecting' })
    expect(workspaceLineupStatus({ connection: 'connecting', warning: 'Waiting for the selected publisher.' })).toEqual({
      label: 'Connecting',
      tone: 'connecting',
    })
    expect(workspaceLineupStatus({
      connection: 'delayed',
      warning: 'Updates are delayed. The last known lineup is retained.',
    })).toEqual({ label: 'Reconnecting', tone: 'reconnecting' })
    expect(workspaceLineupStatus({ connection: 'connected', readError: true })).toEqual({
      label: 'Reconnecting',
      tone: 'reconnecting',
    })
    expect(workspaceLineupStatus({
      connection: 'offline',
      warning: 'Publisher is offline. The last known lineup is retained.',
    })).toEqual({ label: 'Needs attention', tone: 'attention' })
  })

  it('keeps the extension popup green during a healthy heartbeat and a routine refresh', () => {
    expect(popup({ connected: true, parserState: 'ready', lastReadyAckAt: 1 })).toMatchObject({
      title: 'Connected + Updating',
      tone: 'good',
    })
    expect(popup({ scopePending: true, lastReadyAckAt: 1, parserState: 'loading' })).toMatchObject({
      title: 'Connected + Updating',
      tone: 'good',
    })
    expect(popup({ parserReason: 'table_busy', parserState: 'loading', lastReadyAckAt: 1 })).toMatchObject({
      title: 'Connected + Updating',
      tone: 'good',
      detail: 'Bomb Party is updating its orders.',
    })
    expect(popup({ parserReason: 'table_settling', lastReadyAckAt: 1 })).toMatchObject({
      title: 'Connected + Updating',
      tone: 'good',
    })
  })

  it('reserves the red popup dot for real failures', () => {
    expect(popup({ enabled: false, lastError: 'unauthorized' })).toEqual({
      title: 'Off',
      detail: 'Turn Live Lineup on when you are ready.',
      tone: '',
    })
    expect(popup()).toMatchObject({ title: 'Connecting', tone: '' })
    expect(popup({ parserReason: 'table_missing' })).toMatchObject({ title: 'Connecting', tone: '' })
    expect(popup({ scopePending: true })).toMatchObject({ title: 'Connecting', tone: '' })
    expect(popup({ lastError: 'lease_expired', lastReadyAckAt: 1 })).toMatchObject({
      title: 'Reconnecting',
      tone: 'warn',
    })
    expect(popup({ lastError: 'source_unavailable' })).toMatchObject({ title: 'Reconnecting', tone: 'warn' })
    expect(popup({ parserReason: 'table_missing', lastReadyAckAt: 1 })).toMatchObject({
      title: 'Reconnecting',
      tone: 'warn',
    })
    expect(popup({ parserState: 'ready', lastReadyAckAt: 1 })).toMatchObject({
      title: 'Reconnecting',
      tone: 'warn',
    })
    expect(popup({ needsConnection: true })).toMatchObject({ title: 'Needs attention', tone: 'bad' })
    expect(popup({ lastError: 'unauthorized' })).toMatchObject({ title: 'Needs attention', tone: 'bad' })
    expect(popup({ lastError: 'publisher_conflict' })).toMatchObject({ title: 'Needs attention', tone: 'bad' })
    expect(popup({ parserReason: 'columns_changed', lastReadyAckAt: 1 })).toMatchObject({
      title: 'Needs attention',
      tone: 'bad',
    })
    expect(popup({ parserReason: 'selected_party_not_visible' })).toMatchObject({
      title: 'Needs attention',
      tone: 'bad',
    })
  })
})
