import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import { DanceFloorHeader } from '@/app/nic-nac/components/dance-floor/DanceFloorHeader'
import { ShareSheet } from '@/app/nic-nac/components/dance-floor/ShareSheet'
import { danceFloorPublication } from '@/app/nic-nac/components/dance-floor/publication'
const origin = 'https://suite.example.test'
const header = (publication: ReturnType<typeof danceFloorPublication>) => renderToStaticMarkup(createElement(DanceFloorHeader, { publication }))
const sheet = (publication: ReturnType<typeof danceFloorPublication>) => renderToStaticMarkup(createElement(ShareSheet, { publication, onClose() {} }))
describe('Share publication contract (explicit fixtures; production signal remains unknown)', () => {
  it('unpublished rep id never exposes its preview URL, Share, sheet or QR', () => {
    const publication = danceFloorPublication({ origin, published: false, repId: 'unpublished-rep', publicSiteSlug: 'reserved-slug' })
    const html = header(publication)
    expect(html).toContain('Open site setup'); expect(html).toContain('Finish setting up your public site to share a live link.')
    expect(html).not.toContain('>Share<'); expect(html).not.toContain('https://'); expect(html).not.toContain('reserved-slug')
    expect(sheet(publication)).toBe('')
  })
  it('published slug supplies only its live trade link, Copy and a QR slot', async () => {
    const publication = danceFloorPublication({ origin, published: true, publicSiteSlug: 'live-rep' })
    expect(publication.tradeUrl).toBe('https://suite.example.test/live-rep/trade')
    expect(header(publication)).toContain('>Share<')
    const html = sheet(publication)
    expect(html).toContain(publication.tradeUrl!); expect(html).toContain('Copy link'); expect(html).toContain('Dance Floor QR code'); expect(html).toContain('Download QR')
    expect(await QRCode.toDataURL(publication.tradeUrl!)).toMatch(/^data:image\/png;base64,/)
    const source = readFileSync('app/nic-nac/components/dance-floor/ShareSheet.tsx', 'utf8')
    expect(source).toContain('QRCode.toDataURL(url'); expect(source).toContain('navigator.clipboard.writeText(url)')
  })
  it('published custom domain wins over the slug', () => {
    const publication = danceFloorPublication({ origin, published: true, publicSiteSlug: 'live-rep', customDomain: 'jewelry.example.test' })
    expect(publication.tradeUrl).toBe('https://jewelry.example.test/trade')
    expect(sheet(publication)).not.toContain('/live-rep/')
  })
  it('missing publication evidence remains unknown; neither setup nor Share flashes', () => {
    const publication = danceFloorPublication({ origin, repId: 'rep', publicSiteSlug: 'slug', customDomain: 'site.example.test' })
    expect(publication).toEqual({ status: 'unknown' })
    expect(header(publication)).not.toMatch(/Open site setup|>Share<|https:\/\//)
    expect(sheet(publication)).toBe('')
  })
})
