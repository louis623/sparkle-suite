import { afterEach, describe, expect, it, vi } from 'vitest'
import { prepareMarketingPreview } from '@/lib/sparkle-suite/prepare-marketing-preview'
const documentWith = (assets: unknown) => '<html><head><script id="marketing-preview-assets" type="application/json">'+JSON.stringify(assets)+'</script></head><body></body></html>'
afterEach(() => vi.restoreAllMocks())
describe('opaque marketing preview assets', () => {
  it('rejects account endpoints and traversal before requesting media', async () => {
    for (const path of ['/api/customer/private', '/amethyst/skins/../secret.webp', 'https://other.test/file.mp4']) {
      const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(documentWith([path])))
      await expect(prepareMarketingPreview('/preview',new AbortController().signal)).rejects.toThrow('Invalid preview assets')
      expect(fetcher).toHaveBeenCalledTimes(1);fetcher.mockRestore()
    }
  })
  it('maps repository media to blobs and revokes them on disposal', async () => {
    const asset='/amethyst/skins/rose-champagne/hero-loop.mp4'
    const fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(documentWith([asset]))).mockResolvedValueOnce(new Response('sample'))
    vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:sample')
    const revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{})
    const result=await prepareMarketingPreview('/preview',new AbortController().signal)
    expect(fetcher).toHaveBeenLastCalledWith(asset,expect.objectContaining({credentials:'same-origin'}))
    expect(result.html).toContain('blob:sample');expect(result.html).toContain('HTMLMediaElement.prototype')
    result.dispose();expect(revoke).toHaveBeenCalledWith('blob:sample')
  })
  it('keeps a rejected media load from producing a partially ready frame', async () => {
    vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(documentWith(['/amethyst/skins/pearl-rose/hero-loop.mp4']))).mockResolvedValueOnce(new Response('',{status:403}))
    await expect(prepareMarketingPreview('/preview',new AbortController().signal)).rejects.toThrow('Preview media unavailable')
  })
})
