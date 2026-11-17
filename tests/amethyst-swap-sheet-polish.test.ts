import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
it('requires a ready attachment (or the server optional flag), preserves transport and final-send gates',()=>{
 const sheet=readFileSync('lib/amethyst/v2/swap-request-sheet.jsx','utf8')
 expect(sheet).toContain('disabled={!(ready || optional)}');expect(sheet).toContain('<fieldset disabled={disabled}>');expect(sheet).toContain('canSend(')
 expect(sheet).toContain('Upload a photo');expect(sheet).not.toContain('Take a photo');expect(sheet).not.toContain('Choose from library');expect(sheet).not.toContain('of 2');expect(sheet).not.toContain('Images are kept for 7 days.');expect(sheet).not.toContain('tp-sheet-handle')
})
it('builds the status link and copied link from the same URL with the footer return path',()=>{
 const sheet=readFileSync('lib/amethyst/v2/swap-request-sheet.jsx','utf8'),entry=readFileSync('lib/amethyst/v2/trade.jsx','utf8')
 expect(entry).toContain('danceFloorPath={FOOTER_LINKS.tradeBoard}')
 expect(sheet).toContain('receiptLink.searchParams.set("back", danceFloorPath)')
 expect(sheet).toContain('href={receiptLink.pathname + receiptLink.search}');expect(sheet).toContain('navigator.clipboard.writeText(receiptLink.href)')
})
it('top frosted sheet has safe-area bounded height and reduced-motion support, without moving expanded cards',()=>{
 const css=readFileSync('public/amethyst/trade.css','utf8'),gilded=readFileSync('public/amethyst/gilded-autumn.css','utf8')
 expect(css).toContain('z-index: 1000');expect(css).toContain('align-items: flex-start');expect(css).toContain('backdrop-filter: blur(18px)');expect(css).toContain('100dvh - var(--swap-top) - var(--swap-bottom)')
 expect(css).toContain('prefers-reduced-motion: reduce');expect(gilded).toContain('.tp-card-expand-mask {background:#35211594;z-index:140}');expect(gilded).toContain('.tp-sheet-mask {background:#35211594;z-index:1000}')
})
