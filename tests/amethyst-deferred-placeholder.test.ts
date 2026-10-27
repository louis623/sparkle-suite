import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderHomepageFirstPaint } from '@/lib/amethyst/homepage-first-paint'
import { buildAmethystHomepageBootstrapScript, defaultAmethystHomepageTemplateData as homepage } from '@/lib/amethyst/homepage-template-data'
import { defaultAmethystJoinTemplateData as join } from '@/lib/amethyst/join-template-data'
import { defaultAmethystTradeTemplateData as trade } from '@/lib/amethyst/trade-template-data'
import { delayPreviewHomepageData, previewHomepageTheme } from '@/lib/amethyst/homepage-data-budget'

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })
async function render(pending?: { events: boolean; trades: boolean }) {
  const data = { ...homepage, heroMotion: 'still', tradeBoardTickerItems: [] }
  const bootstrap = buildAmethystHomepageBootstrapScript(data, [], 'halloween_pumpkin_cat', { targeted: true }) +
    (pending ? ';window.SPARKLE_PENDING_PAGE_DATA=' + JSON.stringify(pending) + ';' : '')
  const html = await renderHomepageFirstPaint(readFileSync('public/amethyst/Homepage.html', 'utf8'),
    { homepage: data, join, trade, appearancePreset: 'halloween_pumpkin_cat' }, new URL('https://example.test/dudesfizzfest'), bootstrap)
  return html.match(/<div id="root"[^>]*>([\s\S]*?)<\/main>/)?.[1] || html
}
it('renders neutral reserved slots for missing deferred data, never a false empty state', async () => {
  const html = await render({ events: true, trades: true })
  expect(html).toContain('data-page-placeholder="trades"')
  expect(html.match(/data-page-placeholder="events"/g)).toHaveLength(2)
  expect(html).toContain('height:42rem')
  expect(html).not.toContain('Dancers will appear here')
  expect(html).not.toContain('No upcoming')
  expect(html).not.toContain('Check back for upcoming')
})
it('uses the real empty state only once the empty listings have loaded', async () => {
  const html = await render()
  expect(html).toContain('Dancers will appear here after the rep adds them to the Dance Floor.')
  expect(html).not.toContain('data-page-placeholder=')
  expect(html).not.toContain('id="events"') // Existing loaded-empty calendar behavior stays hidden.
})
it('does not replace a completed listing read with a placeholder just because events are late', async () => {
  const html = await render({ events: true, trades: false })
  expect(html).not.toContain('data-page-placeholder="trades"')
  expect(html).toContain('Dancers will appear here')
  expect(html).toContain('data-page-placeholder="events"')
})
it('allows the slow-data flag only for this slug in the preview project', async () => {
  vi.useFakeTimers()
  vi.stubEnv('SSR_PREVIEW_PAGE_DATA_DELAY_MS', '5000')
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
  vi.stubEnv('VERCEL_ENV', 'production')
  expect(delayPreviewHomepageData('dudesfizzfest')).toBeUndefined()
  vi.stubEnv('VERCEL_ENV', 'preview')
  expect(delayPreviewHomepageData('another-rep')).toBeUndefined()
  vi.stubEnv('VERCEL_PROJECT_ID', 'another-project')
  expect(delayPreviewHomepageData('dudesfizzfest')).toBeUndefined()
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
  let completed = false
  const delayed = delayPreviewHomepageData('dudesfizzfest')!.then(() => { completed = true })
  await vi.advanceTimersByTimeAsync(4999)
  expect(completed).toBe(false)
  await vi.advanceTimersByTimeAsync(1)
  await delayed
  expect(completed).toBe(true)
})

it('keeps the approved theme override in memory and impossible on production or another rep', () => {
  const data = { appearancePreset: 'sunset_beach', content: 'Smoke content' }
  vi.stubEnv('SSR_PREVIEW_THEME_OVERRIDE', 'halloween_pumpkin_cat')
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ')
  vi.stubEnv('VERCEL_ENV', 'production')
  expect(previewHomepageTheme(data, 'dudesfizzfest')).toBe(data)
  vi.stubEnv('VERCEL_ENV', 'preview')
  expect(previewHomepageTheme(data, 'another-rep')).toBe(data)
  expect(previewHomepageTheme(data, 'dudesfizzfest')).toEqual({ ...data, appearancePreset: 'halloween_pumpkin_cat' })
  expect(data.appearancePreset).toBe('sunset_beach')
})
