import 'server-only'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AMETHYST_APPEARANCE_PRESET_IDS, type AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import { isAmethystSkinSelectionAvailableToRep } from '@/lib/amethyst/skin-access'
import { getAmethystSkinPresetLabel } from '@/lib/amethyst/skin-cards'
import {
  renderAmethystPublicAssetResponse,
  type AmethystSitePreviewOptions,
} from '@/lib/amethyst/public-asset-response'
import { repRenderV2Enabled } from '@/lib/amethyst/rep-render-version'
import { getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { getSiteSettingsDashboard } from '@/lib/services/site-settings'

export const SITE_PREVIEW_PAGES = ['homepage', 'trade', 'join'] as const
export type SitePreviewPage = (typeof SITE_PREVIEW_PAGES)[number]

export const SITE_PREVIEW_LEGACY_ENGINE_NOTICE =
  'Preview uses our newest page engine; small spacing differences from your live site are possible.'

const PAGE_ASSETS: Record<SitePreviewPage, string> = {
  homepage: 'Homepage.html',
  trade: 'Trade.html',
  join: 'Join.html',
}

const PAGE_OFF_MESSAGE: Partial<Record<SitePreviewPage, string>> = {
  trade: 'Your Dance Floor page is off.',
  join: 'Your Join page is off.',
}

const PREVIEW_GUARD = `(function(){
  var nativeSetAttribute = Element.prototype.setAttribute;
  function localIconHref(value) {
    var text = String(value);
    var marker = 'media-icons.svg#';
    var at = text.indexOf(marker);
    if (at === -1) return value;
    return '#preview-media-icon-' + text.slice(at + marker.length);
  }
  Element.prototype.setAttribute = function(name, value) {
    var key = String(name).toLowerCase();
    if (key === 'href' || key === 'xlink:href') value = localIconHref(value);
    if (this instanceof HTMLMediaElement && (key === 'src' || key === 'autoplay')) return;
    if (this instanceof HTMLMediaElement && key === 'preload') return nativeSetAttribute.call(this, name, 'none');
    return nativeSetAttribute.call(this, name, value);
  };
  var nativeSetAttributeNS = Element.prototype.setAttributeNS;
  Element.prototype.setAttributeNS = function(ns, name, value) {
    if (String(name).toLowerCase() === 'href') value = localIconHref(value);
    return nativeSetAttributeNS.call(this, ns, name, value);
  };
  function rewriteIcons(root) {
    var nodes = [];
    if (root && root.matches && root.matches('use')) nodes.push(root);
    if (root && root.querySelectorAll) nodes = nodes.concat([].slice.call(root.querySelectorAll('use')));
    nodes.forEach(function(node) {
      var href = node.getAttribute('href') || node.getAttribute('xlink:href') || '';
      var next = localIconHref(href);
      if (next !== href) nativeSetAttribute.call(node, 'href', next);
    });
  }
  try {
    Object.defineProperty(HTMLMediaElement.prototype, 'src', { configurable: true, get: function() { return ''; }, set: function() {} });
  } catch (error) {}
  window.fetch = function() { return Promise.resolve(new Response('', { status: 503 })); };
  if (window.XMLHttpRequest) {
    XMLHttpRequest.prototype.open = function() {};
    XMLHttpRequest.prototype.send = function() {};
  }
  if (navigator.sendBeacon) navigator.sendBeacon = function() { return true; };
  window.sparkleStartHeroMotion = function() {};
  window.sparkleStartMileHighFizzHero = function() {};
  window.sparkleSilverBellsController = true;
  window.sparkleChristmasJewelryWorkshopController = true;
  function quiet(root) {
    var start = root && root.matches ? [root] : [];
    var found = root && root.querySelectorAll ? root.querySelectorAll('video,audio,.sb-music-toggle,[data-hero-sound-toggle]') : [];
    start.concat([].slice.call(found)).forEach(function(node) {
      if (node instanceof HTMLMediaElement) {
        node.removeAttribute('src');
        node.preload = 'none';
        node.autoplay = false;
        try { node.pause(); } catch (error) {}
      }
      if (node.matches && node.matches('.sb-music-toggle,[data-hero-sound-toggle]')) {
        node.disabled = true;
        nativeSetAttribute.call(node, 'aria-disabled', 'true');
      }
    });
  }
  quiet(document);
  rewriteIcons(document);
  document.addEventListener('play', function(event) {
    var media = event.target;
    if (!media || !media.pause) return;
    media.pause();
    media.removeAttribute('src');
  }, true);
  document.addEventListener('click', function(event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var music = target.closest('.sb-music-toggle,[data-hero-sound-toggle]');
    if (music) { event.preventDefault(); event.stopPropagation(); music.disabled = true; }
    if (target.closest('a')) event.preventDefault();
  }, true);
  document.addEventListener('submit', function(event) { event.preventDefault(); }, true);
  if (window.MutationObserver && document.documentElement) {
    new MutationObserver(function(records) {
      records.forEach(function(record) {
        [].slice.call(record.addedNodes).forEach(function(node) {
          if (node && node.nodeType === 1) { quiet(node); rewriteIcons(node); }
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();`

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isSitePreviewPage(value: string | null): value is SitePreviewPage {
  return SITE_PREVIEW_PAGES.some(page => page === value)
}

function isAppearancePresetId(value: string | null): value is AmethystAppearancePresetId {
  return Boolean(value && (AMETHYST_APPEARANCE_PRESET_IDS as readonly string[]).includes(value))
}

function sameOrigin(value: string, origin: string) {
  try {
    return new URL(value, `${origin}/`).origin === origin
  } catch {
    return false
  }
}

/** Theme faces load from these hosts, the same set /skin-preview allows. */
const THEME_FONT_STYLESHEET_ORIGINS = new Set([
  'https://fonts.googleapis.com',
  'https://api.fontshare.com',
])

function isThemeFontStylesheet(href: string, origin: string) {
  try {
    return THEME_FONT_STYLESHEET_ORIGINS.has(new URL(href, `${origin}/`).origin)
  } catch {
    return false
  }
}

export function cleanSitePreviewDocument(html: string, origin: string) {
  let next = html
    .replace(/<script\b[^>]*id="sparkle-site-visit"[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*src="[^"]*(?:googletagmanager|google-analytics|unpkg)\.com[^"]*"[^>]*>\s*<\/script>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?\bgtag\s*\([\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*data-template-src="[^"]*"[^>]*>\s*<\/script>/gi, '')
    .replace(/window\.SPARKLE_DEFERRED_PAGE_DATA=(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, 'window.SPARKLE_DEFERRED_PAGE_DATA=""')
    .replace(/window\.sparkleStartHeroMotion=start;start\(\);/g, 'window.sparkleStartHeroMotion=function(){};')
    .replace(/window\.sparkleStartMileHighFizzHero=start;\s*start\(\);/g, 'window.sparkleStartMileHighFizzHero=function(){};')
    .replace(/<meta\b[^>]*name="robots"[^>]*>/gi, '<meta name="robots" content="noindex, nofollow">')

  next = next.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/gi, (tag, src: string) => (
    sameOrigin(src, origin) ? tag : ''
  ))
  next = next.replace(/<link\b[^>]*>/gi, tag => {
    const rel = /rel="([^"]*)"/i.exec(tag)?.[1]?.toLowerCase() ?? ''
    const href = /href="([^"]*)"/i.exec(tag)?.[1]
    if (/\b(?:preconnect|dns-prefetch)\b/.test(rel)) return ''
    if (!href || !/\b(?:stylesheet|preload|prefetch|modulepreload)\b/.test(rel)) return tag
    if (/\bstylesheet\b/.test(rel) && isThemeFontStylesheet(href, origin)) return tag
    return sameOrigin(href, origin) ? tag : ''
  })
  next = next.replace(/<(video|audio)\b[^>]*>/gi, tag => tag
    .replace(/\sautoplay(?:=(?:"[^"]*"|'[^']*'|[^\s>]*))?/gi, '')
    .replace(/\spreload=(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/\ssrc=(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/\s*\/?>$/, ' preload="none">'))
  next = next.replace(/<button\b([^>]*class="[^"]*\bsb-music-toggle\b[^"]*"[^>]*)>/gi, (tag, attrs: string) => (
    /\sdisabled(?:[\s=]|>|$)/i.test(attrs) ? tag : `<button${attrs} disabled>`
  ))
  next = next.replace(/<button\b([^>]*\bdata-hero-sound-toggle(?:=(?:"[^"]*"|'[^']*'|[^\s>]*))?[^>]*)>/gi, (tag, attrs: string) => (
    /\sdisabled(?:[\s=]|>|$)/i.test(attrs) ? tag : `<button${attrs} disabled>`
  ))
  next = next.replace(/<form\b[^>]*class="[^"]*\bhp-signup-form\b[^"]*"[^>]*>[\s\S]*?<\/form>/gi, form => form.replace(
    /<button\b([^>]*\btype="submit"[^>]*)>[\s\S]*?<\/button>/gi,
    (_button, attrs: string) => {
      const withDisabled = /\sdisabled(?:[\s=]|>|$)/i.test(attrs) ? attrs : `${attrs} disabled`
      return `<button${withDisabled}>Preview only</button>`
    },
  ))
  return next
}

export function sitePreviewImageHosts(html: string, origin: string) {
  const hosts = new Set<string>()
  for (const match of html.matchAll(/https:\/\/[^\s"'<>)\\]+/g)) {
    const raw = match[0].replace(/&amp;/g, '&')
    let url: URL
    try {
      url = new URL(raw)
    } catch {
      continue
    }
    if (url.origin === origin) continue
    const path = url.pathname.toLowerCase()
    if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/.test(path) || path.includes('/storage/') || path.includes('/render/image/')) {
      hosts.add(url.origin)
    }
  }
  return [...hosts].sort()
}

const PRODUCTION_IMAGE_ORIGIN = 'https://www.yoursparklesuite.com'

const MEDIA_ICON_SPRITE = readFileSync(join(process.cwd(), 'public/amethyst/media-icons.svg'), 'utf8')

export function previewNeedsProductionImages(html: string) {
  return /<img\b[^>]*\ssrc=["']https:\/\/www\.yoursparklesuite\.com\//i.test(html)
    || /https:\/\/www\.yoursparklesuite\.com\/[^"'\\\s)]+\.(?:avif|gif|jpe?g|png|svg|webp)/i.test(html)
    || /https:\/\/www\.yoursparklesuite\.com\/amethyst\//i.test(html)
}

/** Drop the production favicon requests. The preview does not need them, and CSP would block them. */
export function stripPreviewProductionIcons(html: string) {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1] ?? ''
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1] ?? ''
    const iconRel = /(^|\s)(shortcut icon|icon|apple-touch-icon)(\s|$)/i.test(rel)
    const productionIcon = /(?:^|\/)(?:apple-icon|icon)(?:$|\?)/i.test(href)
      && /yoursparklesuite\.com/i.test(href)
    return iconRel || productionIcon ? '' : tag
  })
}

/** Keep the media sprite in the preview document. A sandboxed frame cannot load the root-relative file. */
const compiledPreviewSources = new Map<string, string>()

function compiledPreviewSource(name: string) {
  const cached = compiledPreviewSources.get(name)
  if (cached) return cached
  const source = readFileSync(join(process.cwd(), 'public/amethyst/compiled', name), 'utf8')
    .replace(/\\\/amethyst\\\/media-icons\.svg#/g, '#preview-media-icon-')
    .replace(/\/amethyst\/media-icons\.svg#/g, '#preview-media-icon-')
    .replace(/<\/script/gi, '<\\/script')
  compiledPreviewSources.set(name, source)
  return source
}

/** The sandboxed frame cannot load the compiled page script, which sets external icon hrefs. */
export function inlinePreviewRuntimeScripts(html: string) {
  return html.replace(
    /<script\b([^>]*)\bsrc="([^"]*\/amethyst\/compiled\/(homepage|trade|join|pantry)\.js(?:\?[^"]*)?)"([^>]*)>\s*<\/script>/gi,
    (_tag, before: string, _src: string, name: string, after: string) => {
      const attrs = `${before}${after}`.replace(/\s(?:defer|async)\b/gi, '')
      return `<script${attrs}>${compiledPreviewSource(`${name}.js`)}</script>`
    },
  )
}

export function inlinePreviewMediaIcons(html: string) {
  const stripped = stripPreviewProductionIcons(html)
  if (!stripped.includes('/amethyst/media-icons.svg')) return stripped
  const rewritten = stripped
    .replace(/\\\/amethyst\\\/media-icons\.svg#/g, '#preview-media-icon-')
    .replace(/\/amethyst\/media-icons\.svg#/g, '#preview-media-icon-')
  const symbols = MEDIA_ICON_SPRITE
    .replace(
      '<svg xmlns="http://www.w3.org/2000/svg">',
      '<svg id="preview-media-icons" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="0" height="0" style="position:absolute">',
    )
    .replace(/\bid="([A-Za-z0-9_-]+)"/g, (match, id: string) => (
      id === 'preview-media-icons' ? match : `id="preview-media-icon-${id}"`
    ))
  return rewritten.includes('</body>')
    ? rewritten.replace('</body>', `${symbols}</body>`)
    : `${rewritten}${symbols}`
}

export function sitePreviewContentSecurityPolicy(html: string, origin: string) {
  const imageHosts = sitePreviewImageHosts(html, origin)
  if (previewNeedsProductionImages(html) && !imageHosts.includes(PRODUCTION_IMAGE_ORIGIN)) {
    imageHosts.push(PRODUCTION_IMAGE_ORIGIN)
  }
  const directives = [
    "default-src 'none'",
    `script-src 'unsafe-inline' ${origin}`,
    `style-src 'unsafe-inline' ${origin} https://fonts.googleapis.com https://api.fontshare.com`,
    `font-src ${origin} https://fonts.gstatic.com https://cdn.fontshare.com https://api.fontshare.com data:`,
    `img-src ${origin} data: blob:${imageHosts.length ? ` ${imageHosts.join(' ')}` : ''}`,
    `media-src ${origin}`,
    "connect-src 'none'",
    "form-action 'none'",
    `base-uri ${origin}`,
    "frame-src 'none'",
    "object-src 'none'",
  ]
  return {
    // sandbox is header-only: a direct open gets the same script-only sandbox as the frame.
    header: `${directives.join('; ')}; frame-ancestors 'self'; sandbox allow-scripts`,
    meta: directives.join('; '),
  }
}

export function prepareSitePreviewDocument(html: string, origin: string) {
  const cleaned = inlinePreviewMediaIcons(inlinePreviewRuntimeScripts(cleanSitePreviewDocument(html, origin)))
  const policy = sitePreviewContentSecurityPolicy(cleaned, origin)
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(policy.meta)}">`
  const preamble = `${meta}<base href="${escapeHtml(origin)}/"><meta name="referrer" content="no-referrer"><script>${PREVIEW_GUARD}</script>`
  const withHead = cleaned.includes('<head>')
    ? cleaned.replace('<head>', `<head>${preamble}`)
    : `<html lang="en"><head>${preamble}</head><body>${cleaned}</body></html>`
  const trimmed = withHead.trimStart()
  const documentHtml = /^<!doctype\s+html/i.test(trimmed) ? trimmed : `<!DOCTYPE html>\n${trimmed}`
  return { html: documentHtml, policy }
}

function previewHeaders(policy: string, engine: 'legacy' | 'ssr') {
  return {
    'Cache-Control': 'no-store, private',
    'Content-Security-Policy': policy,
    'Content-Type': 'text/html; charset=utf-8',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-Preview-Live-Engine': engine,
    'X-Robots-Tag': 'noindex, nofollow',
  }
}

function htmlResponse(html: string, origin: string, engine: 'legacy' | 'ssr', status = 200) {
  const prepared = prepareSitePreviewDocument(html, origin)
  return new Response(prepared.html, {
    status,
    headers: previewHeaders(prepared.policy.header, engine),
  })
}

function offPage(message: string) {
  const safe = escapeHtml(message)
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${safe}</title></head><body><p>${safe}</p></body></html>`
}

function cleanPreviewRequest(request: Request, slug: string, page: SitePreviewPage) {
  const origin = new URL(request.url).origin
  const path = page === 'homepage' ? `/${slug}` : `/${slug}/${page}`
  return { origin, request: new Request(new URL(path, origin)) }
}

function sitePreviewOptions(theme: AmethystAppearancePresetId): AmethystSitePreviewOptions {
  return {
    omitTracking: true,
    forceServerRender: true,
    failClosed: true,
    appearancePreset: theme,
  }
}

export async function renderSignedInSitePreview(request: Request) {
  const context = await getPaidNicNacContext()
  const url = new URL(request.url)
  const theme = url.searchParams.get('theme')
  const page = url.searchParams.get('page')
  if (!isSitePreviewPage(page) || !isAppearancePresetId(theme)) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } })
  }
  const allowed = await isAmethystSkinSelectionAvailableToRep(context.supabase, theme, context.repId)
  if (!allowed) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } })
  }
  const slug = context.rep.public_site_slug?.trim().toLowerCase() ?? ''
  if (!slug) {
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } })
  }

  const engine = repRenderV2Enabled(slug) ? 'ssr' : 'legacy'
  const { origin, request: renderRequest } = cleanPreviewRequest(request, slug, page)
  if (page === 'trade' || page === 'join') {
    const settings = await getSiteSettingsDashboard(context.supabase, context.repId)
    const off = page === 'join'
      ? settings.showJoinPage !== true
      : settings.danceFloorVisible === false
    if (off) return htmlResponse(offPage(PAGE_OFF_MESSAGE[page]!), origin, engine)
  }

  const rendered = await renderAmethystPublicAssetResponse(renderRequest, [PAGE_ASSETS[page]], {
    repIdOverride: context.repId,
    publicSiteSlugOverride: slug,
    canonicalPathOverride: page === 'homepage' ? `/${slug}` : `/${slug}/${page}`,
    joinVisibilityVerified: true,
    sitePreview: sitePreviewOptions(theme),
  })
  if (rendered.status === 503) {
    return new Response(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  }
  if (!rendered.ok) return new Response(null, { status: rendered.status || 503, headers: { 'Cache-Control': 'no-store, private' } })
  return htmlResponse(await rendered.text(), origin, engine)
}

export function sitePreviewThemeLabel(theme: AmethystAppearancePresetId) {
  return getAmethystSkinPresetLabel(theme)
}
