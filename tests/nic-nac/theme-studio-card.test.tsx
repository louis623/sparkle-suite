// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AMETHYST_SKIN_CARDS, type AmethystSkinCard } from '@/lib/amethyst/skin-cards'
import {
  ThemeStudio,
  THEME_PREVIEW_LEGACY_NOTICE,
  THEME_PREVIEW_SESSION_EXPIRED,
  THEME_PREVIEW_UNAVAILABLE,
  type ThemePreviewRequest,
  type ThemePreviewResult,
} from '@/app/nic-nac/components/ThemeStudio'
import { sitePreviewFrameAttributes } from '@/app/nic-nac/components/SitePreviewFrame'
import { useAvailableAmethystSkinCards } from '@/app/nic-nac/components/useAvailableAmethystSkinCards'

const NOV_23 = new Date('2026-11-23T17:00:00.000Z')
const IDS = ['gobble_and_fizz', 'silver_bells', 'rose_champagne', 'rose_gold', 'black_diamond', 'halloween_pumpkin_cat', 'halloween_pumpkin_witch'] as const

function cards() {
  return IDS.map((id) => AMETHYST_SKIN_CARDS.find((card) => card.id === id)!)
}

let root: Root
let host: HTMLDivElement
let media: { set: (query: string, value: boolean) => void }
let releaseIdle: (() => void) | null
const matches = new Map<string, boolean>()

function installBrowser() {
  releaseIdle = null
  matches.clear()
  const listeners = new Map<string, Set<() => void>>()
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches.get(query) === true
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      const bucket = listeners.get(query) ?? new Set()
      bucket.add(listener)
      listeners.set(query, bucket)
    },
    removeEventListener: (_type: string, listener: () => void) => {
      listeners.get(query)?.delete(listener)
    },
    dispatchEvent: () => true,
  })) as typeof window.matchMedia
  media = {
    set(query: string, value: boolean) {
      matches.set(query, value)
      listeners.get(query)?.forEach((listener) => listener())
    },
  }
  window.requestIdleCallback = ((callback: IdleRequestCallback) => {
    releaseIdle = () => callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline)
    return 1
  }) as typeof window.requestIdleCallback
  window.cancelIdleCallback = () => {}
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
    const active = document.activeElement
    if (active instanceof HTMLElement && active.id) this.dataset.opener = active.id
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
    const opener = this.dataset.opener
    if (opener) document.getElementById(opener)?.focus()
  }
}

async function renderStudio(props: {
  status?: 'loading' | 'ready' | 'error'
  offered?: readonly AmethystSkinCard[]
  savedThemeId?: string
  draftThemeId?: string
  onDraftThemeChange?: (themeId: string) => void
  loadPreview?: (request: ThemePreviewRequest) => Promise<ThemePreviewResult>
  onRetry?: () => void
  wide?: boolean
} = {}) {
  const node = createElement(ThemeStudio, {
    status: props.status ?? 'ready',
    cards: props.offered ?? cards(),
    savedThemeId: props.savedThemeId ?? 'rose_champagne',
    draftThemeId: props.draftThemeId ?? props.savedThemeId ?? 'rose_champagne',
    onDraftThemeChange: props.onDraftThemeChange ?? (() => {}),
    now: NOV_23,
    loadPreview: props.loadPreview ?? (async () => ({ status: 200, html: '<p>Preview</p>', engine: 'ssr' as const })),
    onRetry: props.onRetry,
  })
  await act(async () => {
    root.render(node as ReactNode)
  })
  if (props.wide) {
    await act(async () => {
      media.set('(min-width: 880px)', true)
    })
  }
}

function buttonNamed(text: string) {
  return [...host.querySelectorAll('button')].find((button) =>
    button.textContent?.trim() === text || button.getAttribute('aria-label') === text,
  ) as HTMLButtonElement | undefined
}

function radio(id: string) {
  return host.querySelector(`input[type="radio"][value="${id}"]`) as HTMLInputElement
}

beforeEach(() => {
  installBrowser()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

describe('theme studio card', () => {
  it('is one radio group with a visible legend and no internal codes', async () => {
    await renderStudio()
    const legend = host.querySelector('legend')
    expect(legend?.textContent).toBe('Choose your theme')
    const radios = [...host.querySelectorAll('input[type="radio"]')] as HTMLInputElement[]
    expect(radios.length).toBe(cards().length)
    expect(new Set(radios.map((item) => item.name))).toEqual(new Set(['customer-site-theme']))
    expect(radios.filter((item) => item.checked).map((item) => item.value)).toEqual(['rose_champagne'])
    expect(host.textContent).toContain('In season now')
    expect(host.textContent).toContain('Year-round')
    const witchRadios = host.querySelectorAll('input[value="halloween_pumpkin_witch"]')
    expect(witchRadios).toHaveLength(1)
    expect(witchRadios[0]?.closest('article')?.textContent).toContain('Halloween')
    expect(host.textContent).toContain('Just for you')
    expect(host.textContent).toContain('Live now')
    expect(host.textContent).not.toContain('original custom skin')
    expect(host.textContent).not.toMatch(/\([A-Z]{1,4}-\d{2}\)/)
    expect(host.textContent).not.toContain('BD-01')
    expect(host.textContent).not.toContain('SB-01')
    const labels = [...host.querySelectorAll('button')].map((button) => button.textContent?.trim())
    expect(labels).not.toEqual(expect.arrayContaining(['Holiday', 'Fall', 'Everyday', 'Colors', 'Halloween']))
    expect(host.querySelector('img[src="/amethyst/skins/rose-champagne/thumb.webp"]')?.getAttribute('width')).toBe('480')
    const css = readFileSync('app/nic-nac/components/ThemeStudio.module.css', 'utf8')
    expect(css).toContain('outline: 3px solid #1f140f')
    expect(css).toContain("data-workspace-skin='black_diamond'")
    expect(css).toContain('outline-color: #ffe7a8')
    expect(css).toContain('prefers-reduced-motion: no-preference')
  })

  it('changes the draft only from Use and Keep', async () => {
    const drafts: string[] = []
    await renderStudio({ onDraftThemeChange: (themeId) => drafts.push(themeId) })
    await act(async () => {
      radio('rose_gold').click()
    })
    expect(radio('rose_gold').checked).toBe(true)
    expect(drafts).toEqual([])
    await act(async () => {
      buttonNamed('Use Rose Gold').click()
    })
    expect(drafts).toEqual(['rose_gold'])
    await act(async () => {
      buttonNamed('Keep Rose Champagne').click()
    })
    expect(drafts).toEqual(['rose_gold', 'rose_champagne'])
    expect(radio('rose_champagne').checked).toBe(true)
  })

  it('shows a retired saved theme without Try it on or a preview request', async () => {
    const saved = AMETHYST_SKIN_CARDS.find((card) => card.id === 'rose_quartz')!
    const loadPreview = vi.fn(async () => ({ status: 200, html: '<p>Preview</p>', engine: 'ssr' as const }))
    await renderStudio({
      offered: cards(),
      savedThemeId: 'rose_quartz',
      draftThemeId: 'rose_quartz',
      loadPreview,
      wide: true,
    })
    await act(async () => releaseIdle?.())
    expect(host.textContent).toContain('Live now (no longer offered)')
    expect(host.querySelector('#try-on-rose_quartz')).toBeNull()
    expect(host.textContent).toContain("This theme is no longer offered, so there isn't a preview.")
    expect(loadPreview).not.toHaveBeenCalled()
    await act(async () => {
      radio('rose_gold').click()
    })
    expect(host.textContent).toContain("You can't switch back to Rose Quartz after saving.")
    expect(saved.selectable).toBe(false)
  })

  it('does not call a saved theme retired while the theme list is still loading', async () => {
    await renderStudio({
      status: 'loading',
      offered: [],
      savedThemeId: 'rose_champagne',
      wide: true,
    })
    expect(host.textContent).toContain('Preview loads after the themes are ready.')
    expect(host.textContent).not.toContain('no longer offered')
    expect(host.textContent).toContain('Loading your available themes')
  })

  it('offers Retry when the theme list fails', async () => {
    const onRetry = vi.fn()
    await renderStudio({ status: 'error', offered: [], onRetry })
    expect(host.textContent).toContain('Themes unavailable')
    await act(async () => {
      buttonNamed('Retry')?.click()
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('retries the theme list after an error', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ skinIds: ['rose_gold'] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    function Probe() {
      const options = useAvailableAmethystSkinCards('rep-1')
      return createElement(
        'div',
        null,
        createElement('p', null, options.status),
        createElement('button', { type: 'button', onClick: options.retry }, 'Retry themes'),
      )
    }
    await act(async () => {
      root.render(createElement(Probe))
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(host.textContent).toContain('error')
    await act(async () => {
      buttonNamed('Retry themes')?.click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(host.textContent).toContain('ready')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('waits for idle, aborts the previous preview, and reuses the session cache', async () => {
    const pending: Array<{ page: string; signal: AbortSignal; resolve: (result: ThemePreviewResult) => void }> = []
    const loadPreview = vi.fn(({ page, signal }: ThemePreviewRequest) => new Promise<ThemePreviewResult>((resolve) => {
      pending.push({ page, signal, resolve })
    }))
    await renderStudio({ loadPreview, wide: true })
    expect(loadPreview).not.toHaveBeenCalled()
    await act(async () => releaseIdle?.())
    expect(loadPreview).toHaveBeenCalledTimes(1)
    expect(pending[0]?.page).toBe('homepage')
    await act(async () => {
      radio('rose_gold').click()
    })
    expect(pending[0]?.signal.aborted).toBe(true)
    expect(loadPreview).toHaveBeenCalledTimes(2)
    expect(host.textContent).toContain('Loading preview')
    await act(async () => {
      pending[1]?.resolve({ status: 200, html: '<p>Rose Gold</p>', engine: 'ssr' })
    })
    const tabs = [...host.querySelectorAll('[role="tab"]')] as HTMLButtonElement[]
    const selected = tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true')
    const panel = host.querySelector('[role="tabpanel"]')
    expect(selected).toHaveLength(1)
    expect(selected[0]?.tabIndex).toBe(0)
    expect(tabs.filter((tab) => tab.tabIndex === 0)).toHaveLength(1)
    expect(selected[0]?.getAttribute('aria-controls')).toBe(panel?.id)
    expect(panel?.getAttribute('aria-labelledby')).toBe(selected[0]?.id)
    expect(host.querySelector('iframe')?.getAttribute('sandbox')).toBe('allow-scripts')
    expect(host.querySelector('iframe')?.getAttribute('sandbox')).toBe(sitePreviewFrameAttributes('Rose Gold').sandbox)
    expect(panel?.querySelector('[role="tablist"]')).toBeNull()
    expect(panel?.querySelector('iframe')).not.toBeNull()
    await act(async () => {
      buttonNamed('Dance Floor').click()
    })
    expect(loadPreview).toHaveBeenCalledTimes(3)
    expect(pending.at(-1)?.page).toBe('trade')
    await act(async () => {
      pending.at(-1)?.resolve({ status: 200, html: '<p>Dance Floor</p>', engine: 'ssr' })
    })
    await act(async () => {
      buttonNamed('Home').click()
    })
    expect(loadPreview).toHaveBeenCalledTimes(3)
    expect(host.textContent).toContain('Rose Gold')
    const homeTab = host.querySelector('#panel-tab-homepage') as HTMLButtonElement
    await act(async () => {
      homeTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    const danceFloor = host.querySelector('#panel-tab-trade') as HTMLButtonElement
    expect(danceFloor.getAttribute('aria-selected')).toBe('true')
    expect(danceFloor.tabIndex).toBe(0)
    expect(homeTab.tabIndex).toBe(-1)
    expect(loadPreview).toHaveBeenCalledTimes(3)
  })

  it('closes Try it on from X, Back to themes, and Escape, and returns focus to the card', async () => {
    await renderStudio()
    const opener = host.querySelector('#try-on-rose_gold') as HTMLButtonElement
    await act(async () => {
      opener.focus()
      opener.click()
    })
    const dialog = host.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(host.textContent).toContain('Back to themes')
    expect(host.textContent).toContain('Use this theme')
    await act(async () => {
      buttonNamed('Close').click()
    })
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(opener)
    await act(async () => {
      opener.click()
    })
    await act(async () => {
      buttonNamed('Back to themes').click()
    })
    expect(dialog.open).toBe(false)
    await act(async () => {
      opener.click()
    })
    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      dialog.close()
    })
    expect(dialog.open).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('keeps Try it on usable when the width changes and shows the legacy notice in the side panel', async () => {
    const loadPreview = vi.fn(async () => ({ status: 200, html: '<p>Preview</p>', engine: 'legacy' as const }))
    await renderStudio({ loadPreview, wide: true })
    await act(async () => releaseIdle?.())
    expect(host.textContent).toContain(THEME_PREVIEW_LEGACY_NOTICE)
    const opener = host.querySelector('#try-on-gobble_and_fizz') as HTMLButtonElement
    await act(async () => {
      opener.focus()
      opener.click()
    })
    const dialog = host.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(host.textContent).toContain(THEME_PREVIEW_LEGACY_NOTICE)
    const close = buttonNamed('Close')
    expect(dialog.contains(document.activeElement) || document.activeElement === close).toBe(true)
    await act(async () => {
      media.set('(min-width: 880px)', false)
      media.set('(max-width: 719px)', true)
    })
    expect(dialog.open).toBe(true)
    expect(dialog.contains(close)).toBe(true)
  })

  it('shows Retry after a 503 and a session message after a 401', async () => {
    const loadPreview = vi.fn<(_request: ThemePreviewRequest) => Promise<ThemePreviewResult>>()
      .mockResolvedValueOnce({ status: 503, html: '', engine: null })
    await renderStudio({ loadPreview, wide: true })
    await act(async () => releaseIdle?.())
    expect(host.textContent).toContain(THEME_PREVIEW_UNAVAILABLE)
    expect(buttonNamed('Retry')).toBeTruthy()
    loadPreview.mockResolvedValueOnce({ status: 401, html: '', engine: null })
    await act(async () => {
      buttonNamed('Retry').click()
    })
    expect(host.textContent).toContain(THEME_PREVIEW_SESSION_EXPIRED)
    expect(host.querySelector('a[href="/login"]')?.textContent).toBe('Sign in')
    expect(buttonNamed('Retry')).toBeUndefined()
  })
})
