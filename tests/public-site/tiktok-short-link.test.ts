import { describe, expect, it, vi } from 'vitest'

import {
  isTikTokShortVideoUrl,
  publicVideoDraftUrl,
} from '@/lib/public-site/media-url'
import {
  resolveTikTokShortVideoUrl,
  TikTokShortLinkError,
  type TikTokRedirectProbe,
} from '@/lib/public-site/tiktok-short-link'

const CANONICAL_FIRST =
  'https://www.tiktok.com/@sparklesuiteandfinder/video/7690739569876094239'
const CANONICAL_SECOND =
  'https://www.tiktok.com/@sparklesuiteandfinder/video/7698055528752106782'

function redirectProbe(
  locations: Record<string, { status?: number; location?: string }>,
): TikTokRedirectProbe & { calls: string[] } {
  const calls: string[] = []
  const probe = vi.fn(async (url: string) => {
    calls.push(url)
    const host = new URL(url).hostname
    if (host !== 'tiktok.com' && !host.endsWith('.tiktok.com')) {
      throw new Error(`blocked non-TikTok request ${url}`)
    }
    const match = locations[url]
    if (!match) return { status: 404, location: '' }
    return { status: match.status ?? 302, location: match.location ?? '' }
  }) as TikTokRedirectProbe & { calls: string[] }
  probe.calls = calls
  return probe
}

describe('TikTok short video links', () => {
  it('resolves a tiktok.com/t share link and strips tracking params', async () => {
    const probe = redirectProbe({
      'https://www.tiktok.com/t/ZPLAqbfCY/': {
        location: `${CANONICAL_FIRST}?is_from_webapp=1&sender_device=pc`,
      },
    })

    await expect(
      resolveTikTokShortVideoUrl('https://www.tiktok.com/t/ZPLAqbfCY/', probe),
    ).resolves.toBe(CANONICAL_FIRST)
    expect(probe.calls).toEqual(['https://www.tiktok.com/t/ZPLAqbfCY/'])
  })

  it('resolves a vm.tiktok.com share link to the full video URL', async () => {
    const probe = redirectProbe({
      'https://vm.tiktok.com/ZPLAqv7hL/': {
        location: `${CANONICAL_SECOND}?_r=1`,
      },
    })

    await expect(
      resolveTikTokShortVideoUrl('https://vm.tiktok.com/ZPLAqv7hL/', probe),
    ).resolves.toBe(CANONICAL_SECOND)
  })

  it('resolves a vt.tiktok.com share link through another TikTok host', async () => {
    const probe = redirectProbe({
      'https://vt.tiktok.com/ZPLAqbfCY': {
        location: 'https://m.tiktok.com/@sparklesuiteandfinder/video/7690739569876094239/',
      },
    })

    await expect(
      resolveTikTokShortVideoUrl('https://vt.tiktok.com/ZPLAqbfCY', probe),
    ).resolves.toBe(CANONICAL_FIRST)
  })

  it('leaves a full TikTok video URL unchanged and does not request it', async () => {
    const videoUrl = `${CANONICAL_FIRST}?is_from_webapp=1&sender_device=pc`
    const probe = redirectProbe({})

    expect(isTikTokShortVideoUrl(videoUrl)).toBe(false)
    expect(publicVideoDraftUrl(videoUrl)).toBe(videoUrl)
    await expect(resolveTikTokShortVideoUrl(videoUrl, probe)).rejects.toBeInstanceOf(
      TikTokShortLinkError,
    )
    expect(probe.calls).toEqual([])
  })

  it('rejects a share link that opens a TikTok photo post', async () => {
    const probe = redirectProbe({
      'https://www.tiktok.com/t/ZPLAqv7hL/': {
        location: 'https://www.tiktok.com/@brittwithbling/photo/7680907837425388814',
      },
    })

    await expect(
      resolveTikTokShortVideoUrl('https://www.tiktok.com/t/ZPLAqv7hL/', probe),
    ).rejects.toBeInstanceOf(TikTokShortLinkError)
    expect(probe.calls).toEqual(['https://www.tiktok.com/t/ZPLAqv7hL/'])
  })

  it('rejects a share link that does not open a video', async () => {
    const probe = redirectProbe({
      'https://vm.tiktok.com/ZPLAqbfCY/': {
        status: 302,
        location: 'https://www.tiktok.com/@sparklesuiteandfinder',
      },
      'https://vt.tiktok.com/ZPLAqv7hL': { status: 200, location: '' },
    })

    await expect(
      resolveTikTokShortVideoUrl('https://vm.tiktok.com/ZPLAqbfCY/', probe),
    ).rejects.toBeInstanceOf(TikTokShortLinkError)
    await expect(
      resolveTikTokShortVideoUrl('https://vt.tiktok.com/ZPLAqv7hL', probe),
    ).rejects.toBeInstanceOf(TikTokShortLinkError)
  })

  it('stops after four TikTok redirects', async () => {
    const probe = vi.fn(async (url: string) => {
      const hop = Number(new URL(url).searchParams.get('hop') ?? '0')
      return {
        status: 302,
        location: `https://vm.tiktok.com/ZPLAqbfCY/?hop=${hop + 1}`,
      }
    })

    await expect(
      resolveTikTokShortVideoUrl('https://vm.tiktok.com/ZPLAqbfCY/', probe),
    ).rejects.toBeInstanceOf(TikTokShortLinkError)
    expect(probe).toHaveBeenCalledTimes(4)
  })

  it('does not follow a redirect off TikTok', async () => {
    const probe = redirectProbe({
      'https://vm.tiktok.com/ZPLAqbfCY/': {
        location: 'http://127.0.0.1/latest/meta-data',
      },
    })

    await expect(
      resolveTikTokShortVideoUrl('https://vm.tiktok.com/ZPLAqbfCY/', probe),
    ).rejects.toBeInstanceOf(TikTokShortLinkError)
    expect(probe.calls).toEqual(['https://vm.tiktok.com/ZPLAqbfCY/'])
  })

  it('keeps other public video links available in the settings draft', () => {
    expect(publicVideoDraftUrl('https://www.youtube.com/shorts/abcdefghijk')).toBe(
      'https://www.youtube.com/shorts/abcdefghijk',
    )
    expect(publicVideoDraftUrl('https://www.instagram.com/reel/C7Example_9/')).toBe(
      'https://www.instagram.com/reel/C7Example_9/',
    )
    expect(isTikTokShortVideoUrl('https://www.youtube.com/shorts/abcdefghijk')).toBe(false)
    expect(publicVideoDraftUrl('https://www.tiktok.com/t/ZPLAqbfCY/')).toBe(
      'https://www.tiktok.com/t/ZPLAqbfCY/',
    )
    expect(
      publicVideoDraftUrl('https://www.tiktok.com/@brittwithbling/photo/7680907837425388814'),
    ).toBe('')
  })
})
