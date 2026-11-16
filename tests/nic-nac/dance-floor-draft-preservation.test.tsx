// @vitest-environment jsdom
import React, { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DancerFloor } from '@/app/nic-nac/components/dance-floor/DancerFloor'
import { useFloorSectionGuard } from '@/app/nic-nac/components/dance-floor/useDanceFloorData'
import type { DanceFloorBoard } from '@/app/nic-nac/components/dance-floor/types'
import type { TradeListingWithDesign } from '@/lib/services/types'
import { dancer } from '../helpers/dance-floor-fixture'

let host: HTMLDivElement, root: Root, server: TradeListingWithDesign[], seed: DanceFloorBoard
let writes: Array<{ url: string; body: Record<string, unknown> }>, failField: string, lookupStatus: string | null | undefined
let gate: ((url: URL) => Promise<Response> | undefined) | undefined
const response = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))
const board = (rows: TradeListingWithDesign[], total = rows.length, hasMore = false) => ({ listings: rows, total, hasMore, summary: {} } as DanceFloorBoard)
const ids = (index: number) => '20000000-0000-4000-8000-' + String(index + 1).padStart(12, '0')
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r }); return { promise, resolve } }
function Harness({ data }: { data: DanceFloorBoard }) {
  const [section, setSection] = useState('trade-board')
  const change = useFloorSectionGuard(section, setSection, () => {})
  return <><button onClick={() => change('home')}>Home section</button>{section === 'trade-board'
    ? <DancerFloor board={data} listings={data.listings} search="" onSearch={() => {}} status="ready" hasMore loadingMore={false} onRetry={() => {}} />
    : <p>Home content</p>}</>
}
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) }) }
const render = async () => { await act(async () => { root.render(<Harness data={seed} />) }); await flush() }
const refresh = async () => { seed = { ...seed }; await render() }
const button = (text: string, parent: ParentNode = host) => {
  const found = [...parent.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text)
  if (!found) throw new Error('Missing button ' + text)
  return found
}
const click = async (target: HTMLElement) => { await act(async () => { target.click() }); await flush() }
const row = (index: number) => host.querySelector<HTMLElement>('[data-dancer-row="' + ids(index) + '"]')!
const notes = () => host.querySelector<HTMLTextAreaElement>('textarea')!
const quantity = () => host.querySelector<HTMLInputElement>('input[aria-label="Quantity"]')!
async function input(node: HTMLInputElement | HTMLTextAreaElement, value: string) {
  await act(async () => {
    const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(node, value)
    node.dispatchEvent(new Event('input', { bubbles: true }))
    node.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
async function dirty(index = 30) {
  await click(button('Edit', row(index)))
  await input(notes(), 'keep these notes')
  await input(quantity(), '3')
}
beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  window.history.replaceState(null, '', '/nic-nac?section=trade-board')
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false } })
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ top: 120, bottom: 220, left: 0, right: 0, width: 100, height: 100, x: 0, y: 120, toJSON() {} }))
  HTMLElement.prototype.scrollIntoView = vi.fn()
  window.matchMedia = vi.fn().mockReturnValue({ matches: true })
  server = Array.from({ length: 60 }, (_, index) => dancer({ id: ids(index), design: { ...dancer().design, design_name: 'Dancer ' + index } }) as TradeListingWithDesign)
  seed = board(server.slice(0, 24), 60, true)
  writes = []; failField = ''; lookupStatus = undefined; gate = undefined
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    const url = new URL(path, 'http://localhost')
    if (!init?.method) {
      if (url.searchParams.has('listingId')) {
        if (lookupStatus === 'error') return response({}, 503)
        if (lookupStatus === null) return response({ code: 'LISTING_NOT_FOUND' }, 404)
        return response({ listing: { id: url.searchParams.get('listingId'), status: lookupStatus ?? 'available' } })
      }
      const held = gate?.(url); if (held) return held
      const filtered = server.filter(item => !url.searchParams.get('needsPhoto') || !item.listing_photo_url)
      const offset = Number(url.searchParams.get('offset') ?? 0)
      return response(board(filtered.slice(offset, offset + 24), filtered.length, offset + 24 < filtered.length))
    }
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : {}
    writes.push({ url: url.pathname, body })
    const item = server.find(item => item.id === body.listingId)
    if (failField && (failField in body)) return response({ code: 'UPDATE_FAILED', error: 'Controlled save failure' }, 500)
    if (init.method === 'DELETE') server = server.filter(item => item.id !== body.listingId)
    if (item && 'repNotes' in body) item.rep_notes = body.repNotes
    if (item && 'quantity' in body) item.quantity_available = body.quantity
    if (item && ('listingPhotoPath' in body || body.useCanonicalPhoto)) item.listing_photo_url = '/new.jpg'
    if (url.pathname.endsWith('/uploads')) return response({ signedUrl: 'http://localhost/upload', path: 'owned/path' })
    return response({ ok: true })
  }))
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => { root.unmount() }); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('mounted Floor draft ownership and transitions', () => {
  it('keeps page-two notes and quantity, extent, filters and anchor through refresh, save and close', async () => {
    await render()
    await input(host.querySelector<HTMLInputElement>('input[type="search"]')!, 'Dancer')
    await click(button('Load more')); expect(host.querySelectorAll('[data-dancer-row]')).toHaveLength(48)
    await dirty()
    const original = notes()
    await refresh()
    expect(notes()).toBe(original); expect(notes().value).toBe('keep these notes'); expect(quantity().value).toBe('3')
    expect(host.querySelectorAll('[data-dancer-row]')).toHaveLength(48)
    await click(button('Save'))
    expect(button('Save').disabled).toBe(true)
    await refresh(); await click(button('Cancel'))
    expect(host.querySelectorAll('[data-dancer-row]')).toHaveLength(48)
    expect(host.querySelector<HTMLInputElement>('input[type="search"]')!.value).toBe('Dancer')
    expect(row(30)).not.toBeNull(); expect(window.scrollBy).toHaveBeenLastCalledWith(0, 0)
  })
  it('has no photo controls while retaining a dirty editor', async () => {
    await render(); await dirty()
    expect(host.textContent).not.toMatch(/Change photo|Use catalog photo|Needs a photo/)
    expect(host.querySelector('input[type="file"]')).toBeNull()
  })

  it('ignores stale Load more responses while the winning refresh retains its requested extent', async () => {
    await render(); await dirty(0)
    const held = deferred<Response>(); let heldOnce = false
    gate = url => { if (url.searchParams.get('offset') === '24' && !heldOnce) { heldOnce = true; return held.promise } }
    await click(button('Load more')); expect(heldOnce).toBe(true)
    await refresh()
    expect(host.querySelectorAll('[data-dancer-row]')).toHaveLength(48)
    await act(async () => held.resolve(await response(board([], 0, false)))); await flush()
    expect(host.querySelectorAll('[data-dancer-row]')).toHaveLength(48)
    expect(notes().value).toBe('keep these notes'); expect(quantity().value).toBe('3')
  })
  it('cancels a deferred hash target when another draft starts editing', async () => {
    await render()
    const held = deferred<Response>(); let once = false
    gate = url => { if (!once && url.searchParams.get('offset') === '24') { once = true; return held.promise } }
    await act(async () => { window.history.replaceState(null, '', '#dancer=' + ids(30)); window.dispatchEvent(new HashChangeEvent('hashchange')) }); await flush()
    await dirty(0)
    await act(async () => held.resolve(await response(board(server.slice(24, 48), 60, true)))); await flush()
    expect(row(0).querySelector('textarea')).toBe(notes()); expect(notes().value).toBe('keep these notes')
    expect(row(30)?.querySelector('textarea')).toBeNull()
  })
  it.each(['repNotes', 'quantity'])('keeps a failed %s field through partial success and retries only that field', async field => {
    await render(); await dirty(0); failField = field
    await click(button('Save'))
    expect(notes().value).toBe('keep these notes'); expect(quantity().value).toBe('3')
    expect(host.textContent).toContain('Controlled save failure')
    expect(writes.filter(w => 'repNotes' in w.body)).toHaveLength(1)
    expect(writes.filter(w => 'quantity' in w.body)).toHaveLength(1)
    failField = ''; await click(button('Save'))
    expect(writes.filter(w => field in w.body)).toHaveLength(2)
    expect(writes.filter(w => (field === 'repNotes' ? 'quantity' : 'repNotes') in w.body)).toHaveLength(1)
    expect(button('Save').disabled).toBe(true)
  })
  it('normal Remove Cancel preserves both fields; quantity-zero Cancel resets only quantity', async () => {
    await render(); await dirty(0); await click(button('Remove'))
    await click(button('Cancel', host.querySelector('dialog')!))
    expect(notes().value).toBe('keep these notes'); expect(quantity().value).toBe('3')
    await input(quantity(), '0'); await click(button('Save'))
    await click(button('Cancel', host.querySelector('dialog')!))
    expect(notes().value).toBe('keep these notes'); expect(quantity().value).toBe('1')
  })
  it.each([null, 'removed', 'traded'])('only authoritative %s makes the pinned draft read-only', async status => {
    await render(); await dirty(0); lookupStatus = status; server = server.slice(1); await refresh()
    expect(notes().value).toBe('keep these notes'); expect(quantity().value).toBe('3')
    expect(host.textContent).toContain("That dancer isn't on your Floor anymore.")
    for (const label of ['Save', 'Remove']) expect(button(label).disabled).toBe(true)
    expect(quantity().disabled).toBe(true)
    await click(button('Cancel')); expect(notes()).toBeNull()
  })
  it('missing rows, lookup errors and failed refresh never discard or mark the draft gone', async () => {
    await render(); await dirty(0); server = server.slice(1); lookupStatus = 'error'; await refresh()
    expect(notes().value).toBe('keep these notes'); expect(button('Save').disabled).toBe(false)
    gate = () => response({}, 503); await refresh()
    expect(notes().value).toBe('keep these notes'); expect(quantity().value).toBe('3')
    expect(host.textContent).not.toContain("That dancer isn't on your Floor anymore.")
    gate = undefined; await click(button('Try again')); expect(notes().value).toBe('keep these notes')
  })
  it.each(['remove', 'zero'])('own confirmed %s closes the draft and offers Put back', async mode => {
    await render(); await dirty(0)
    if (mode === 'zero') { await input(quantity(), '0'); await click(button('Save')) } else await click(button('Remove'))
    await click(button('Take off Floor'))
    expect(notes()).toBeNull(); expect(button('Put back on the Floor')).toBeDefined()
  })
  it('guards search, filters, Clear, other editor, hash and section navigation; unload warns only while dirty', async () => {
    await render()
    const clean = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(clean); expect(clean.defaultPrevented).toBe(false)
    await dirty(0)
    await input(host.querySelector<HTMLInputElement>('input[type="search"]')!, 'blocked')
    await click(button('Clear filters')); await click(button('Edit', row(1)))
    const checkbox = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')][0]; await click(checkbox)
    await act(async () => { window.history.replaceState(null, '', '#dancer=' + ids(1)); window.dispatchEvent(new HashChangeEvent('hashchange')) })
    await click(button('Home section'))
    expect(host.textContent).not.toContain('Home content'); expect(host.textContent).toContain('Save or cancel your changes first.')
    expect(notes().value).toBe('keep these notes'); expect(quantity().value).toBe('3')
    expect(host.querySelector<HTMLInputElement>('input[type="search"]')!.value).toBe(''); expect(checkbox.checked).toBe(true)
    const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true)
    await click(button('Cancel'))
    const saved = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(saved); expect(saved.defaultPrevented).toBe(false)
    await click(button('Home section')); expect(host.textContent).toContain('Home content')
  })
})
