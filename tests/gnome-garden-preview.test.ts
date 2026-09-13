import { describe, expect, it, vi } from 'vitest'
import { runInNewContext } from 'node:vm'
import { GET } from '@/app/skin-preview/[skin]/[page]/route'
import { buildGnomeSkinPreviewDocument, GNOME_PREVIEW_LINEUP, SKIN_PREVIEW_GUARDS, SKIN_PREVIEW_PAGES } from '@/lib/amethyst/skin-preview'

describe('read-only Gnome Forest skin preview', () => {
  it.each(SKIN_PREVIEW_PAGES)('serves shared %s components with isolated sample content', async (page) => {
    const response = await GET(new Request(`https://www.yoursparklesuite.com/skin-preview/gnome_garden/${page}?c=real-customer&review=ignored`), { params: Promise.resolve({ skin: 'gnome_garden', page }) })
    expect(response.status).toBe(200)
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    const html = await response.text()
    expect(html).toContain('Skin preview · Sample content')
    expect(html).toContain('sandbox="allow-scripts"')
    expect(html).toContain('html,body{height:100%;overflow:hidden}')
    expect(html).toContain('body{height:100dvh;display:flex;flex-direction:column}')
    expect(html).toContain('header{flex:0 0 auto}iframe{flex:1 1 0;min-height:0;height:auto}')
    expect(html).not.toContain('allow-same-origin')
    expect(html).not.toContain('real-customer')
    expect(html).not.toContain('review=ignored')
    const inner = await buildGnomeSkinPreviewDocument(page, 'https://www.yoursparklesuite.com')
    expect(inner).toContain('The Gnome Forest')
    expect(inner).toContain('gnome_garden')
    expect(inner).toContain("connect-src 'none'")
    expect(inner).toContain("form-action 'none'")
    expect(inner).not.toMatch(/<script[^>]+(?:src|data-template-src)="\/api\/amethyst/)
    expect(inner).not.toMatch(/<script[^>]+src="(?:homepage|trade|unsubscribe|tweaks-panel)\.jsx/)
    expect(inner).not.toMatch(/<script[^>]+src="(?:\/amethyst\/)?live-lineup\.js/)
    if (page !== 'unsubscribe') {
      expect(inner).toContain('root.SparkleLiveLineup =')
      expect(inner).toContain('Sample lineup for appearance preview. No live show is connected.')
    }
  })

  it.each([['other-skin', 'homepage'], ['gnome_garden', '../secret'], ['gnome_garden', 'pantry']])('rejects unregistered %s/%s', async (skin, page) => {
    expect((await GET(new Request('https://www.yoursparklesuite.com/skin-preview/x/y'), { params: Promise.resolve({ skin, page }) })).status).toBe(404)
  })

  it('prevents submissions and rejects mutations instead of faking success', async () => {
    const listeners: Record<string, (event: unknown) => void> = {}
    const notice = { textContent: '', remove: vi.fn() }
    const context = { window: {} as Record<string, unknown>, document: { addEventListener: (type: string, listener: (event: unknown) => void) => { listeners[type] = listener }, getElementById: () => notice }, clearTimeout: vi.fn(), setTimeout: vi.fn(), Response }
    runInNewContext(SKIN_PREVIEW_GUARDS, context)
    const fetch = context.window.fetch as (url: string, options?: { method: string }) => Promise<Response>
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      await expect(fetch('/api/amethyst/customer-audience', { method })).rejects.toThrow('Nothing was sent')
    }
    await expect(fetch('https://external.example/provider')).rejects.toThrow('Nothing was sent')
    const event = { preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() }
    listeners.submit(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopImmediatePropagation).toHaveBeenCalledOnce()
    expect(notice.textContent).toContain('Nothing is submitted or sent')
    context.window.AMETHYST_TRADE_BOARD_LISTINGS = [{ id: 'sample' }]
    expect(await (await fetch('/api/amethyst/trade-board')).json()).toEqual({ listings: [{ id: 'sample' }] })
  })

  it('routes only known sample page links and blocks provider navigation', () => {
    let click: (event: unknown) => void = () => {}
    const postMessage = vi.fn()
    const notice = { textContent: '', remove: vi.fn() }
    runInNewContext(SKIN_PREVIEW_GUARDS, {
      window: { parent: { postMessage } },
      document: { addEventListener: (type: string, handler: typeof click) => { if (type === 'click') click = handler }, getElementById: () => notice },
      setTimeout: vi.fn(), clearTimeout: vi.fn(), Response,
    })
    const eventFor = (href: string) => ({ target: { closest: (selector: string) => selector === 'a' ? { getAttribute: () => href } : null }, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() })
    const provider = eventFor('https://bombparty.com/enroll')
    click(provider)
    expect(provider.preventDefault).toHaveBeenCalledOnce()
    expect(postMessage).not.toHaveBeenCalled()
    click(eventFor('/skin-preview/gnome_garden/trade'))
    expect(postMessage).toHaveBeenCalledWith({ type: 'sparkle-skin-preview-page', page: 'trade' }, '*')
    const section = eventFor('#events')
    click(section)
    expect(section.preventDefault).not.toHaveBeenCalled()
  })

  it('answers lineup reads locally with labeled fixtures and never raises mutation notices for polling', async () => {
    const notice = { textContent: '', remove: vi.fn() }
    const originalFetch = vi.fn()
    const context = { window: { fetch: originalFetch } as Record<string, unknown>, document: { addEventListener: vi.fn(), getElementById: () => notice }, clearTimeout: vi.fn(), setTimeout: vi.fn(), Response }
    runInNewContext(SKIN_PREVIEW_GUARDS, context)
    const fetch = context.window.fetch as (url: string, options?: { method: string }) => Promise<Response>
    for (let i = 0; i < 3; i++) {
      const response = await fetch('/api/amethyst/live-lineup?publicSiteSlug=real-customer-ignored')
      const body = await response.json()
      expect(body.liveQueueEntries).toEqual(GNOME_PREVIEW_LINEUP.liveQueueEntries)
      expect(body.liveQueueSummary).toContain('Sample lineup')
      expect(body.liveQueueAgeSeconds).toBe(0)
      expect(JSON.stringify(body)).not.toContain('real-customer')
    }
    expect(originalFetch).not.toHaveBeenCalled()
    expect(context.setTimeout).not.toHaveBeenCalled()
    expect(notice.textContent).toBe('')
    await expect(fetch('/api/amethyst/live-lineup', { method: 'POST' })).rejects.toThrow('Nothing was sent')
    await expect(fetch('https://www.yoursparklesuite.com/api/amethyst/live-lineup')).rejects.toThrow('Nothing was sent')
    expect(originalFetch).not.toHaveBeenCalled()
  })

  it('shows an honest notice on submission buttons before sandbox form handling and disables file inputs', () => {
    let click: (event: unknown) => void = () => {}
    let observeChanges = () => {}
    const fileInput = { disabled: false, title: '', setAttribute: vi.fn() }
    const notice = { textContent: '', remove: vi.fn() }
    runInNewContext(SKIN_PREVIEW_GUARDS, {
      window: {},
      document: {
        addEventListener: (type: string, handler: typeof click) => { if (type === 'click') click = handler },
        getElementById: () => notice,
        querySelectorAll: () => [fileInput],
      },
      MutationObserver: class { constructor(handler: () => void) { observeChanges = handler } observe() {} },
      setTimeout: vi.fn(), clearTimeout: vi.fn(), Response,
    })
    expect(fileInput.disabled).toBe(true)
    fileInput.disabled = false
    observeChanges()
    expect(fileInput.disabled).toBe(true)
    const event = { target: { closest: (selector: string) => selector.includes('.tp-sheet-submit') ? {} : null }, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn() }
    click(event)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopImmediatePropagation).toHaveBeenCalledOnce()
    expect(notice.textContent).toContain('Nothing is submitted or sent')
  })

  it('shares fixture dancers in the homepage ticker and keeps sample business language consistent', async () => {
    const inner = await buildGnomeSkinPreviewDocument('homepage', 'https://www.yoursparklesuite.com')
    const data = JSON.parse(inner.match(/window\.AMETHYST_HOMEPAGE_TEMPLATE_DATA = (.*);/)![1])
    expect(data.tradeBoardTickerItems.map((item: { name: string }) => item.name)).toEqual(['Woodland Wishes', 'Lantern Light', 'Moonlit Garden'])
    expect(data.footerLinks.tradeBoard).toBe('/skin-preview/gnome_garden/trade')
    expect(data.legalDisclaimer).toContain('The Gnome Forest')
    expect(data.signupConsent).toContain('The Gnome Forest')
    expect(JSON.stringify(data)).not.toContain('Sparkle by Sasha')
  })
})
