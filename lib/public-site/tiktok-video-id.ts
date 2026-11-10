export function getTikTokVideoId(raw: string) {
  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && url.port !== '443')) return null
    if (!['tiktok.com', 'www.tiktok.com'].includes(url.hostname)) return null
    return url.pathname.match(/^(?:\/@[A-Za-z0-9._]{2,24}\/video|\/video|\/player\/v1|\/embed|\/embed\/v2)\/([0-9]{8,22})\/?$/)?.[1] ?? null
  } catch { return null }
}

export function canonicalTikTokUrl(raw: string) {
  const id = getTikTokVideoId(raw)
  if (!id) return null
  const user = new URL(raw).pathname.match(/^\/(@[A-Za-z0-9._]{2,24})\/video\//)?.[1]
  return user ? `https://www.tiktok.com/${user}/video/${id}` : `https://www.tiktok.com/embed/v2/${id}`
}

export function isTikTokCardUrl(raw: string) {
  try {
    const url = new URL(raw)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.port &&
      ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'].includes(url.hostname)
  } catch { return false }
}
