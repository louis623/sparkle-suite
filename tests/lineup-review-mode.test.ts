import { describe, expect, it } from 'vitest'
import { resolveLineupReviewState, buildSkinPreviewDocument, renderSkinPreview } from '@/lib/amethyst/skin-preview'

describe('Smoke-only repeatable lineup review',()=>{
 const url='https://sparkle-suite-smoke.vercel.app/skin-preview/amethyst/homepage?lineupReview=empty'
 it('requires both Smoke markers and ignores state selectors in production',()=>{
   expect(resolveLineupReviewState(url,{})).toBeNull()
   expect(resolveLineupReviewState(url,{SPARKLE_ENVIRONMENT:'production',NEXT_PUBLIC_SPARKLE_ENVIRONMENT:'production'})).toBeNull()
   expect(resolveLineupReviewState(url,{SPARKLE_ENVIRONMENT:'smoke'})).toBeNull()
   expect(resolveLineupReviewState(url,{SPARKLE_ENVIRONMENT:'smoke',NEXT_PUBLIC_SPARKLE_ENVIRONMENT:'smoke'})).toBe('empty')
 })
 it('rejects unknown review states',()=>expect(resolveLineupReviewState(url.replace('=empty','=write'),{SPARKLE_ENVIRONMENT:'smoke',NEXT_PUBLIC_SPARKLE_ENVIRONMENT:'smoke'})).toBeNull())
 it('keeps normal previews free of review controls',async()=>expect(await renderSkinPreview('amethyst','homepage','https://sample.test')).not.toContain('Lineup review states'))
 it('offers labeled deterministic review controls and keeps writes blocked',async()=>{
   const outer=await renderSkinPreview('amethyst','homepage','https://sample.test','empty')
   expect(outer).toContain('Lineup review states')
   expect(outer).toContain('Names waiting')
   const doc=await buildSkinPreviewDocument('amethyst','homepage','https://sample.test','empty')
   expect(doc).toContain('"liveQueueEntries":[]')
   expect(doc).toContain("connect-src 'none'")
   expect(doc).toContain('Nothing was sent')
 })
 it('retains synthetic names in delayed review',async()=>{
   const doc=await buildSkinPreviewDocument('amethyst','homepage','https://sample.test','delayed')
   expect(doc).toContain('"liveQueueState":"delayed"')
   expect(doc).toContain('"liveQueueAgeSeconds":90')
 })
})
