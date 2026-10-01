import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import React from 'react'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

function actualFunction(page: string, name: string, context: Record<string, unknown>) {
  const source = readFileSync(`public/amethyst/${page}.jsx`, 'utf8')
  const ast = ts.createSourceFile(`${page}.jsx`, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JSX)
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  if (!declaration) throw new Error(`Missing ${name}`)
  const script = ts.transpileModule(`${declaration.getText(ast)}\n${name};`, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText
  return runInNewContext(script, { React, ...context })
}

type Tree = { type?: unknown; props?: Record<string, any> }
function descendants(node: Tree): Tree[] {
  return [node, ...React.Children.toArray(node.props?.children).flatMap(child =>
    typeof child === 'object' && child !== null ? descendants(child as Tree) : [])]
}

describe('Join FAQ keyboard semantics', () => {
  it('exposes native buttons linked to answers and updates expanded state for open, switch, and close', () => {
    let expanded = 0
    const Faq = actualFunction('join', 'Faq', {
      useState: () => [expanded, (next: number) => { expanded = next }],
      isMileHighFizzHybrid: false, isKellySparklyButterflies: false, recruitingProfile: null,
      FAQ_QUESTIONS: () => [{ q: 'First question', a: 'First answer' }, { q: 'Second question', a: 'Second answer' }],
      linkProps: (href: string) => ({ href }), BP_IDS_HREF: '#disclosure', FAQ_HREF: '#more',
    })
    const render = () => {
      const nodes = descendants(Faq({ teamName: 'Team', repName: 'Rep', locationLabel: '' }))
      return {
        buttons: nodes.filter(node => node.props?.className === 'jp-faq-q'),
        answers: nodes.filter(node => node.props?.className === 'jp-faq-a'),
      }
    }
    let view = render()
    for (const [index, button] of view.buttons.entries()) {
      // Native buttons provide Enter and Space without synthetic keyboard handlers.
      expect(button.type).toBe('button')
      expect(button.props?.type).toBe('button')
      expect(button.props?.['aria-controls']).toBe(view.answers[index].props?.id)
    }
    expect(view.buttons.map(node => node.props?.['aria-expanded'])).toEqual([true, false])
    expect(view.answers.map(node => node.props?.['aria-hidden'])).toEqual([false, true])
    view.buttons[1].props?.onClick()
    view = render()
    expect(view.buttons.map(node => node.props?.['aria-expanded'])).toEqual([false, true])
    expect(view.answers.map(node => node.props?.['aria-hidden'])).toEqual([true, false])
    view.buttons[1].props?.onClick()
    expect(render().buttons.map(node => node.props?.['aria-expanded'])).toEqual([false, false])
  })
})

function calendarFixture(open = true, withControls = true, page = 'homepage') {
  type Node = { hidden: boolean; isConnected: boolean; focus: ReturnType<typeof vi.fn> }
  const listeners = new Map<string, (event: any) => void>()
  const document = {
    activeElement: null as Node | null,
    body: { style: { overflow: 'auto' } },
    addEventListener: (name: string, callback: (event: any) => void) => { listeners.set(name, callback) },
    removeEventListener: (name: string, callback: (event: any) => void) => {
      if (listeners.get(name) === callback) listeners.delete(name)
    },
  }
  const node = (): Node => {
    const element = { hidden: false, isConnected: true, focus: vi.fn(), getClientRects: () => [{}] }
    element.focus.mockImplementation(() => { document.activeElement = element })
    return element
  }
  const trigger = node(), first = node(), last = node(), hidden = node(), outside = node()
  hidden.hidden = true
  const controls = withControls ? [first, last, hidden] : []
  const dialog = Object.assign(node(), {
    querySelectorAll: () => controls,
    contains: (element: Node) => element === dialog || controls.includes(element),
  })
  document.activeElement = trigger
  let effect: () => undefined | (() => void) = () => undefined
  const onClose = vi.fn()
  const hook = actualFunction(page, page === 'trade' ? 'useTradeDialog' : 'useCalendarDialog', {
    useRef: (current: unknown) => ({ current }),
    useEffect: (callback: typeof effect) => { effect = callback }, document,
  })
  const ref = hook(open, onClose)
  ref.current = dialog
  const cleanup = effect()
  const key = (key: string, shiftKey = false) => {
    const event = { key, shiftKey, preventDefault: vi.fn() }
    listeners.get('keydown')?.(event)
    return event
  }
  return { document, listeners, trigger, first, last, outside, dialog, onClose, cleanup, key }
}

describe('Calendar dialog keyboard lifecycle', () => {
  it('enters the dialog, wraps both Tab directions, and leaves ordinary keys/navigation alone', () => {
    const f = calendarFixture()
    expect(f.document.activeElement).toBe(f.first)
    expect(f.document.body.style.overflow).toBe('hidden')
    expect(f.key('Tab').preventDefault).not.toHaveBeenCalled()
    f.last.focus()
    expect(f.key('Tab').preventDefault).toHaveBeenCalledOnce()
    expect(f.document.activeElement).toBe(f.first)
    expect(f.key('Tab', true).preventDefault).toHaveBeenCalledOnce()
    expect(f.document.activeElement).toBe(f.last)
    expect(f.key('ArrowRight').preventDefault).not.toHaveBeenCalled()
    f.cleanup?.()
  })

  it('contains escaped focus, dismisses with Escape, then restores the connected opener and scroll state', () => {
    const f = calendarFixture()
    f.outside.focus()
    f.listeners.get('focusin')?.({ target: f.outside })
    expect(f.document.activeElement).toBe(f.first)
    expect(f.key('Escape').preventDefault).toHaveBeenCalledOnce()
    expect(f.onClose).toHaveBeenCalledOnce()
    f.cleanup?.()
    expect(f.document.activeElement).toBe(f.trigger)
    expect(f.document.body.style.overflow).toBe('auto')
    expect(f.listeners.size).toBe(0)
    f.key('Escape')
    expect(f.onClose).toHaveBeenCalledOnce()
  })

  it('does not focus an opener removed during navigation', () => {
    const f = calendarFixture()
    f.trigger.isConnected = false
    f.cleanup?.()
    expect(f.trigger.focus).not.toHaveBeenCalled()
    expect(f.listeners.size).toBe(0)
  })

  it('stays inert while closed and focuses the dialog itself when no controls exist', () => {
    const closed = calendarFixture(false)
    expect(closed.document.activeElement).toBe(closed.trigger)
    expect(closed.document.body.style.overflow).toBe('auto')
    expect(closed.listeners.size).toBe(0)
    const empty = calendarFixture(true, false)
    expect(empty.document.activeElement).toBe(empty.dialog)
    expect(empty.key('Tab').preventDefault).toHaveBeenCalledOnce()
    expect(empty.document.activeElement).toBe(empty.dialog)
    empty.cleanup?.()
  })

  it('wires the dialog ref and all existing calendar actions without conditional hooks', () => {
    const ref = { current: null }, hook = vi.fn(() => ref), onClose = vi.fn(), download = vi.fn()
    const Chooser = actualFunction('homepage', 'CalendarChooser', {
      useCalendarDialog: hook, buildGoogleCalendarHref: () => '#google', buildOutlookCalendarHref: () => '#outlook',
      downloadCalendarEvent: download,
    })
    expect(Chooser({ event: null, onClose })).toBeNull()
    expect(hook).toHaveBeenLastCalledWith(false, onClose)
    const event = { title: 'Synthetic event' }
    const nodes = descendants(Chooser({ event, onClose }))
    expect(hook).toHaveBeenLastCalledWith(true, onClose)
    const dialog = nodes.find(node => node.props?.role === 'dialog')!
    expect(dialog.props?.ref).toBe(ref)
    expect(dialog.props?.tabIndex).toBe(-1)
    expect(nodes.filter(node => node.type === 'a').map(node => node.props?.href)).toEqual(['#google', '#outlook'])
    nodes.find(node => node.props?.className === 'hp-calendar-choice other')?.props?.onClick()
    expect(download).toHaveBeenCalledWith(event)
    nodes.find(node => node.props?.className === 'hp-calendar-modal-close')?.props?.onClick()
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('Trade dialogs keyboard behavior', () => {
  it('contains focus, supports Escape, and restores the opener and scrolling on close', () => {
    const f = calendarFixture(true, true, 'trade')
    expect(f.document.activeElement).toBe(f.first)
    f.last.focus()
    expect(f.key('Tab').preventDefault).toHaveBeenCalledOnce()
    expect(f.document.activeElement).toBe(f.first)
    f.key('Tab', true)
    expect(f.document.activeElement).toBe(f.last)
    f.outside.focus()
    f.listeners.get('focusin')?.({ target: f.outside })
    expect(f.document.activeElement).toBe(f.first)
    f.key('Escape')
    expect(f.onClose).toHaveBeenCalledOnce()
    f.cleanup?.()
    expect(f.document.activeElement).toBe(f.trigger)
    expect(f.document.body.style.overflow).toBe('auto')
    expect(f.listeners.size).toBe(0)
  })

  it('keeps expanded-card actions and gives the dialog its item title', () => {
    const ref = { current: null }, hook = vi.fn(() => ref), onClose = vi.fn(), onWantThis = vi.fn()
    const Expanded = actualFunction('trade', 'ExpandedCard', { useTradeDialog: hook })
    expect(Expanded({ piece: null, onClose, onWantThis })).toBeNull()
    expect(hook).toHaveBeenLastCalledWith(false, onClose)
    const piece = { id: 'synthetic', name: 'Sample dancer', type: 'Ring', tier: 'everyday' }
    const nodes = descendants(Expanded({ piece, onClose, onWantThis }))
    expect(hook).toHaveBeenLastCalledWith(true, onClose)
    const dialog = nodes.find(node => node.props?.role === 'dialog')!
    expect(dialog.props).toMatchObject({ ref, tabIndex: -1, 'aria-modal': 'true' })
    expect(nodes.find(node => node.props?.id === dialog.props?.['aria-labelledby'])?.props?.children).toBe(piece.name)
    nodes.find(node => node.props?.className === 'tp-card-expand-cta')?.props?.onClick()
    expect(onWantThis).toHaveBeenCalledWith(piece)
    nodes.find(node => node.props?.className === 'tp-card-close')?.props?.onClick()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('labels request fields, keeps pending requests open, and gives success its own focus transition', () => {
    const ref = { current: null }, hook = vi.fn((..._args: any[]) => ref), onClose = vi.fn(), onSubmit = vi.fn()
    const Sheet = actualFunction('trade', 'RequestSheet', {
      useTradeDialog: hook,
      useRef: (current: unknown) => ({ current }), useEffect: () => {},
      useState: (initial: unknown) => [typeof initial === 'function' ? initial() : initial, () => {}],
      crypto: { randomUUID: () => 'synthetic-id' },
    })
    const props = { piece: { id: 'synthetic', name: 'Sample dancer', collection: 'OG', type: 'Ring' }, onClose, onSubmit, pending: false, success: null }
    let nodes = descendants(Sheet(props))
    const dialog = nodes.find(node => node.props?.role === 'dialog')!
    expect(dialog.props).toMatchObject({ ref, tabIndex: -1, 'aria-modal': 'true', 'aria-busy': false })
    expect(nodes.find(node => node.props?.id === dialog.props?.['aria-labelledby'])?.props?.children).toBe(props.piece.name)
    for (const id of ['tp-customer-name', 'tp-customer-reveal', 'tp-offered-family', 'tp-offered-type', 'tp-reveal-photo']) {
      expect(nodes.some(node => node.type === 'label' && node.props?.htmlFor === id)).toBe(true)
      expect(nodes.some(node => node.props?.id === id)).toBe(true)
    }
    hook.mock.calls.at(-1)?.[1]()
    expect(onClose).toHaveBeenCalledOnce()
    nodes = descendants(Sheet({ ...props, pending: true }))
    hook.mock.calls.at(-1)?.[1]()
    expect(onClose).toHaveBeenCalledOnce()
    expect(nodes.find(node => node.props?.className === 'tp-sheet-close')?.props?.disabled).toBe(true)
    expect(nodes.find(node => node.props?.role === 'dialog')?.props?.['aria-busy']).toBe(true)
    expect(nodes.find(node => node.props?.className === 'tp-sheet-mask')?.props?.onClick).toBeUndefined()
    nodes = descendants(Sheet({ ...props, success: { requestId: 'synthetic-request' } }))
    expect(hook.mock.calls.at(-1)?.[2]).toBe('success')
    expect(nodes.find(node => node.props?.id === 'trade-request-title')?.props?.children).toBe('Request sent.')
    expect(nodes.find(node => node.props?.role === 'dialog')?.props?.ref).toBe(ref)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
