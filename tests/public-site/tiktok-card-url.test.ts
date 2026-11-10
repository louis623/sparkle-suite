import { it, expect } from 'vitest'
import { isTikTokCardUrl } from '@/lib/public-site/tiktok-video-id'

it('isTikTokCardUrl: HTTP and HTTPS links share removal eligibility without accepting unsafe URLs', () => {
  for (const host of ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com']) {
    for (const protocol of ['http:', 'https:']) {
      expect(isTikTokCardUrl(`${protocol}//${host}/@user/video/12345678`)).toBe(true)
      expect(isTikTokCardUrl(`${protocol}//user:password@${host}/video/12345678`)).toBe(false)
      expect(isTikTokCardUrl(`${protocol}//${host}:8080/video/12345678`)).toBe(false)
      expect(isTikTokCardUrl(`${protocol}//${host}.evil.example/video/12345678`)).toBe(false)
    }
  }
  for (const url of ['javascript:alert(1)', 'ftp://tiktok.com/video/12345678', 'not a URL', 'https://evil-tiktok.com/video/12345678']) {
    expect(isTikTokCardUrl(url)).toBe(false)
  }
})
