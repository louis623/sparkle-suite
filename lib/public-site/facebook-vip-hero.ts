/**
 * The Workspace "Facebook" social handle is the rep's VIP group or page.
 * Landing heroes read this URL; they do not have a second VIP link field.
 */
export function resolveFacebookVipUrl(value: string | null | undefined) {
  const cleaned = value?.trim() ?? ''
  if (!cleaned || cleaned === '#') return ''

  const candidate = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://www.facebook.com/${cleaned.replace(/^@/, '').replace(/^\/+/, '')}`

  try {
    const url = new URL(candidate)
    if (url.username || url.password) return ''
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const isFacebookHost =
      host === 'facebook.com' ||
      host === 'fb.com' ||
      host === 'fb.watch' ||
      host.endsWith('.facebook.com') ||
      host.endsWith('.fb.com')
    if (!isFacebookHost) return ''
    if ((url.pathname === '/' || url.pathname === '') && !url.search) return ''
    return url.toString()
  } catch {
    return ''
  }
}
