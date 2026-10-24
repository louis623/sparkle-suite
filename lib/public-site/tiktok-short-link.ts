import 'server-only'
import https from 'node:https'

import {
  isTikTokShortVideoUrl,
  normalizePublicMediaUrl,
} from '@/lib/public-site/media-url'

const MAX_REDIRECTS = 4
const TIMEOUT_MS = 4000
const MAX_LOCATION_LENGTH = 2048

export class TikTokShortLinkError extends Error {
  constructor(message = 'TikTok short link did not resolve to a public video') {
    super(message)
    this.name = 'TikTokShortLinkError'
  }
}

export type TikTokRedirectResponse = {
  status: number
  location: string
}

export type TikTokRedirectProbe = (
  url: string,
  signal: AbortSignal,
) => Promise<TikTokRedirectResponse>

function isAllowedTikTokHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const labels = host.split('.')
  if (labels.length < 2 || labels.slice(-2).join('.') !== 'tiktok.com') return false
  return labels.every((label) =>
    /^(?:[a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])$/.test(label),
  )
}

function canonicalTikTokVideoUrl(url: URL) {
  if (!isAllowedTikTokHost(url.hostname)) return ''
  const match = url.pathname.match(
    /^\/@([A-Za-z0-9._]{2,24})\/video\/(\d{8,22})\/?$/,
  )
  if (!match) return ''
  const username = match[1]
  if (
    username.startsWith('.') ||
    username.endsWith('.') ||
    username.includes('..')
  ) {
    return ''
  }
  return `https://www.tiktok.com/@${username}/video/${match[2]}`
}

function isTikTokPhotoPost(url: URL) {
  return (
    isAllowedTikTokHost(url.hostname) &&
    /^\/@[A-Za-z0-9._]{2,24}\/photo\/\d{8,22}\/?$/.test(url.pathname)
  )
}

function prepareTikTokUrl(value: string, base?: URL) {
  let url: URL
  try {
    url = new URL(value, base)
  } catch {
    throw new TikTokShortLinkError()
  }
  if (url.username || url.password) throw new TikTokShortLinkError()
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TikTokShortLinkError()
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!isAllowedTikTokHost(host)) throw new TikTokShortLinkError()
  if (url.port && url.port !== '443' && url.port !== '80') {
    throw new TikTokShortLinkError()
  }
  url.hash = ''
  url.protocol = 'https:'
  url.hostname = host
  url.port = ''
  return url
}

function probeTikTokRedirect(url: string, signal: AbortSignal) {
  return new Promise<TikTokRedirectResponse>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error('aborted'))
      return
    }

    let settled = false
    const request = https.request(
      url,
      {
        method: 'GET',
        headers: {
          accept: 'text/html',
          'user-agent':
            'SparkleSuite/1.0 (site-settings; +https://www.yoursparklesuite.com)',
        },
      },
      (response) => {
        const rawLocation = response.headers.location
        const location = Array.isArray(rawLocation)
          ? rawLocation[0] ?? ''
          : rawLocation ?? ''
        if (settled) {
          response.destroy()
          return
        }
        settled = true
        response.destroy()
        signal.removeEventListener('abort', onAbort)
        resolve({
          status: response.statusCode ?? 0,
          location: location.trim(),
        })
      },
    )

    function onAbort() {
      request.destroy(new Error('TikTok short link request timed out'))
    }

    function fail(error: Error) {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      reject(error)
    }

    signal.addEventListener('abort', onAbort, { once: true })
    request.setTimeout(TIMEOUT_MS, onAbort)
    request.on('error', fail)
    request.end()
  })
}

export async function resolveTikTokShortVideoUrl(
  value: string,
  probe: TikTokRedirectProbe = probeTikTokRedirect,
) {
  const normalized = normalizePublicMediaUrl(value)
  if (!normalized || !isTikTokShortVideoUrl(normalized)) {
    throw new TikTokShortLinkError()
  }

  let current = prepareTikTokUrl(normalized)
  const signal = AbortSignal.timeout(TIMEOUT_MS)

  try {
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const canonical = canonicalTikTokVideoUrl(current)
      if (canonical) return canonical
      if (isTikTokPhotoPost(current)) throw new TikTokShortLinkError()
      if (redirectCount === MAX_REDIRECTS) break

      const response = await probe(current.toString(), signal)
      if (![301, 302, 303, 307, 308].includes(response.status)) {
        throw new TikTokShortLinkError()
      }
      const location = response.location.trim()
      if (
        !location ||
        location.length > MAX_LOCATION_LENGTH ||
        /[\r\n\\]/.test(location)
      ) {
        throw new TikTokShortLinkError()
      }
      // Each hop is checked again before any request, so a redirect cannot leave tiktok.com.
      current = prepareTikTokUrl(location, current)
    }
  } catch (error) {
    if (error instanceof TikTokShortLinkError) throw error
    throw new TikTokShortLinkError()
  }

  throw new TikTokShortLinkError()
}
