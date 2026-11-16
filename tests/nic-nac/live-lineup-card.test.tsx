// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import { projectPublicLineup } from '@/lib/amethyst/public-live-lineup'

const audience = vi.hoisted(() => ({ matches: {} as Record<string, unknown>, finishGesture: vi.fn() }))
vi.mock('@/app/nic-nac/components/use-lineup-audience', () => ({ useLineupAudience: () => audience }))
vi.mock('@/app/nic-nac/components/LiveLineupShowControls', () => ({ LiveLineupShowControls: () => null }))
vi.mock('@/app/nic-nac/components/LiveLineupArchiveControls', () => ({ LiveLineupArchiveControls: () => null }))
vi.mock('@/app/nic-nac/components/LiveLineupPublisherControls', () => ({ LiveLineupPublisherControls: () => null }))
import { LiveLineupCard } from '@/app/nic-nac/components/LiveLineupCard'

let root: Root
let host: HTMLDivElement
let current: WorkspaceLineupSnapshot
let writes: Array<{ type: string; entryId: string; beforeEntryId?: string | null }>
function fixture(): WorkspaceLineupSnapshot {
  const entries = [
    { id: 'order-1', name: 'Dinelle', lastName: 'Smith' },
    { id: 'order-2', name: 'Danielle', lastName: 'Jones' },
    { id: 'order-3', name: 'Danielle', lastName: 'Jones' },
    { id: 'order-4', name: 'Kelly', lastName: 'Brown' },
  ].map((entry, index) => ({ ...entry, position: index + 1, held: false, identityEligible: true, sourceIdentityVersion: 'v1' }))
  return { tenantContext: 'fixture-rep', revision: 1, connection: 'connected',
    lastReceivedAt: '2026-11-16T16:47:00Z', lastChangedAt: '2026-11-16T16:47:00Z', sourceVersion: 'OPAQUE_DO_NOT_RENDER',
    canManage: true, authorized: true, runtimeWritable: true, undoAvailable: false, warning: null,
    serverTime: '2026-11-16T16:47:00Z', freshUntil: '2026-11-16T16:47:45Z', freshForMs: 45000,
    entries, heldEntries: [], management: { generation: 1, partyIds: [], excludedPartyIds: [], candidates: entries } }
}
const button = (label: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(node => node.textContent?.trim() === label || node.getAttribute('aria-label') === label)!
const click = async (node: HTMLElement) => { expect(node).toBeTruthy(); await act(async () => { node.click() }) }
const mount = async () => { await act(async () => { root.render(createElement(LiveLineupCard, { compact: true })); await Promise.resolve() }) }
const reset = async () => { await act(async () => root.unmount()); host.remove(); host = document.createElement('div'); document.body.append(host); root = createRoot(host); current = fixture(); writes = []; await mount() }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); this.querySelector<HTMLButtonElement>('button')?.focus() },
    close(this: HTMLDialogElement) { this.removeAttribute('open') },
  })
  vi.stubGlobal('CSS', { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&') })
  current = fixture(); writes = []
  audience.matches = { 'order-1': { id: 'order-1', status: 'matched', audienceId: 'customer-1', birthday: null, preferences: [] },
    'order-2': { id: 'order-2', status: 'needs_clarification', birthday: null, preferences: [] } }
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    if (init?.method === 'POST') {
      const { command } = JSON.parse(String(init.body)); writes.push(command)
      const index = current.entries.findIndex(entry => entry.id === command.entryId)
      const entries = [...current.entries], held = [...current.heldEntries]
      const [entry] = entries.splice(index, 1)
      if (command.type === 'hold') held.push(entry)
      else if (command.type === 'reveal-next') entries.unshift(entry)
      else entries.splice(command.beforeEntryId === null ? entries.length : entries.findIndex(item => item.id === command.beforeEntryId), 0, entry)
      current = { ...current, revision: current.revision + 1, undoAvailable: true,
        entries: entries.map((item, i) => ({ ...item, held: false, position: i + 1 })),
        heldEntries: held.map((item, i) => ({ ...item, held: true, position: i + 1 })) }
    }
    return { ok: true, status: 200, json: async () => structuredClone(current) }
  }))
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Concept C Live Lineup', () => {
  it('offers Customer card only on an existing matched row', async () => {
    await mount()
    const cards = Array.from(host.querySelectorAll('button')).filter(node => node.textContent === 'Customer card')
    expect(cards).toHaveLength(1)
    expect(cards[0].closest('li')?.getAttribute('aria-label')).toContain('Dinelle')
    expect(host.textContent).not.toContain('Which customer?')
  })
  it('uses the public projection for names, positions and grouped order counts', async () => {
    await mount()
    const projection = projectPublicLineup({ scope: 'fixture', entries: current.entries, events: [], cursor: 0, now: Date.now() })
    const rows = Array.from(host.querySelectorAll('ol[aria-label="Customers waiting"] > li'))
    expect(rows).toHaveLength(projection.entries.length)
    rows.forEach((row, index) => {
      const expected = projection.entries[index]
      expect(row.getAttribute('aria-label')).toBe(expected.name + ', position ' + (index + 1))
      expect(row.textContent).toContain(expected.name)
      expect(row.textContent).toContain(String(index + 1))
      expect(row.textContent?.includes(expected.remainingOrders + ' orders')).toBe(expected.remainingOrders > 1)
    })
    expect(rows[0].className).toContain('now')
  })
  it('has no helper line or stale banner in the collapsed card', async () => {
    current.connection = 'offline'; current.canManage = false
    await mount()
    expect(host.textContent).not.toContain('Grab a customer and drop them into place.')
    expect(host.textContent).not.toContain('Waiting for a fresh source update.')
    expect(host.textContent).not.toContain('OPAQUE_DO_NOT_RENDER')
  })
  it('opens labelled Status with last-received ET time and the applicable retained-order message', async () => {
    current.connection = 'offline'; current.canManage = false
    await mount(); const trigger = button('Needs attentionTap for status'); trigger.focus(); await click(trigger)
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!
    expect(dialog.getAttribute('role')).toBe('dialog'); expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Status')
    expect(dialog.textContent).toContain('11:47 AM ET'); expect(dialog.textContent).toContain('Offline')
    expect(dialog.textContent).toContain('Waiting for a fresh source update. The last received order is preserved.')
    expect(dialog.textContent).not.toContain('OPAQUE_DO_NOT_RENDER')
    expect(document.body.style.overflow).toBe('hidden')
    await click(button('Close status', dialog)); expect(document.activeElement).toBe(trigger); expect(document.body.style.overflow).toBe('')
  })
  it('opens Full lineup, traps Tab, and Escape closes and restores focus', async () => {
    await mount(); const trigger = button('↗ Full lineup'); trigger.focus(); await click(trigger)
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Full lineup')
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')).filter(node => !node.closest('[hidden]'))
    controls.at(-1)!.focus()
    await act(async () => controls.at(-1)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
    expect(document.activeElement).toBe(controls[0])
    await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    expect(document.querySelector('dialog')).toBeNull(); expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe('')
  })
  it('expands and collapses only grouped rows, preserving each order target in the card and pop-out', async () => {
    await mount()
    for (const full of [false, true]) {
      for (const action of ['move', 'hold', 'reveal-next']) {
        await reset()
        if (full) await click(button('↗ Full lineup'))
        const scope = full ? document.querySelector('dialog')! : host
        const expander = scope.querySelector<HTMLButtonElement>('button[aria-expanded]')!
        expect(scope.querySelectorAll('button[aria-expanded]')).toHaveLength(1)
        expect(expander.getAttribute('aria-expanded')).toBe('false')
        await click(expander); expect(expander.getAttribute('aria-expanded')).toBe('true')
        await click(expander); expect(expander.getAttribute('aria-expanded')).toBe('false')
        await click(expander)
        const target = scope.querySelector<HTMLElement>('[data-lineup-entry="order-3"]')!
        if (action === 'move') await act(async () => target.querySelector('button[data-lineup-grab]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })))
        else await click(button(action === 'hold' ? 'Hold' : 'Reveal next', target))
        expect(writes).toEqual([expect.objectContaining({ type: action, entryId: 'order-3' })])
        if (action === 'move') expect(writes[0].beforeEntryId).toBeNull()
      }
    }
  })
})
