import { createAdminClient } from '@/lib/supabase/admin'
import {
  isAmethystPlatformHost,
  normalizeAmethystHost,
} from '@/lib/amethyst/host-routing'

export const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/
export const GA4_SMOKE_TEST_MEASUREMENT_ID = 'G-3XK98BLX70'
export const GA4_SMOKE_TEST_PROPERTY_ID = '559335478'

const REP_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const BLOCKED_PATH_PREFIXES = [
  '/nic-nac',
  '/control-center',
  '/admin',
  '/demo',
  '/onboarding',
  '/login',
  '/marketing',
  '/skin-preview',
  '/privacy-policy',
  '/terms-and-conditions',
]

export type RepGa4TagRecord = {
  customDomain: string | null
  accountClassification: string | null
  measurementId: string | null
  enabled: boolean
}

type TagLookup = (repId: string) => Promise<RepGa4TagRecord | null>

export function readSmokeMeasurementId(
  env: Record<string, string | undefined> = process.env,
) {
  const value = env.GA4_SMOKE_TEST_MEASUREMENT_ID?.trim() ?? ''
  return GA4_MEASUREMENT_ID_PATTERN.test(value) ? value : null
}

export function isVercelAppPreviewHost(value: string | null | undefined) {
  const host = normalizeAmethystHost(value)
  return Boolean(host && host.endsWith('.vercel.app'))
}

export function readRealRequestHost(request: Request) {
  return (
    normalizeAmethystHost(request.headers.get('x-forwarded-host')) ||
    normalizeAmethystHost(request.headers.get('host'))
  )
}

export function hostMatchesRepCustomDomain(
  host: string | null | undefined,
  customDomain: string | null | undefined,
) {
  const requestHost = normalizeAmethystHost(host)
  const domain = normalizeAmethystHost(customDomain)
  if (!requestHost || !domain) return false
  const apex = domain.startsWith('www.') ? domain.slice(4) : domain
  if (!apex || apex.startsWith('www.')) return false
  return requestHost === apex || requestHost === `www.${apex}`
}

export function isBlockedRepAnalyticsPath(pathname: string) {
  const path = pathname.toLowerCase()
  if (path.includes('unsubscribe')) return true
  return BLOCKED_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
}

export function decideRepGa4MeasurementId(args: {
  host: string | null
  pathname: string
  record: RepGa4TagRecord | null
  smokeMeasurementId?: string | null
}) {
  if (isBlockedRepAnalyticsPath(args.pathname)) return null
  if (!args.host || isAmethystPlatformHost(args.host)) return null

  if (isVercelAppPreviewHost(args.host)) {
    return args.smokeMeasurementId &&
      GA4_MEASUREMENT_ID_PATTERN.test(args.smokeMeasurementId)
      ? args.smokeMeasurementId
      : null
  }

  const measurementId = args.record?.measurementId?.trim() ?? ''
  if (
    !args.record?.enabled ||
    args.record.accountClassification !== 'customer' ||
    !GA4_MEASUREMENT_ID_PATTERN.test(measurementId) ||
    !hostMatchesRepCustomDomain(args.host, args.record.customDomain)
  ) {
    return null
  }

  return measurementId
}

function safeShopHref(value: string | null | undefined) {
  const href = value?.trim() ?? ''
  if (!href || href === '#') return null
  try {
    const url = new URL(href)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function buildRepGa4Snippet(args: {
  measurementId: string
  shopHref?: string | null
}) {
  if (!GA4_MEASUREMENT_ID_PATTERN.test(args.measurementId)) return ''
  const measurementId = args.measurementId
  const shopHref = safeShopHref(args.shopHref)
  return `<script id="sparkle-rep-ga4">
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted'
});
gtag('js', new Date());
gtag('config', ${JSON.stringify(measurementId)});
document.addEventListener('click', function (event) {
  var node = event.target;
  var link = node && node.closest ? node.closest('a') : null;
  if (!link) return;
  var href = link.href || '';
  var shop = ${JSON.stringify(shopHref)};
  var host = '';
  var shopHost = '';
  try { host = new URL(href).hostname.toLowerCase(); } catch (e) { return; }
  try { if (shop) shopHost = new URL(shop).hostname.toLowerCase(); } catch (e) { shopHost = ''; }
  var isShop = (shop && href.indexOf(shop) === 0) || host === shopHost || host === 'bombparty.com' || host.slice(-14) === '.bombparty.com';
  if (!isShop) return;
  gtag('event', 'shop_click');
}, true);
// Load automatically as soon as the hero paints, including short visits.
// Never wait for a click, idle time, or a fixed multi-second delay.
(function () {
  var src = 'https://www.googletagmanager.com/gtag/js?id=${measurementId}';
  var started = false;
  function start() {
    if (started) return;
    started = true;
    var script = document.createElement('script');
    script.async = true; script.fetchPriority = 'low'; script.src = src;
    document.head.appendChild(script);
  }
  function painted() { requestAnimationFrame(function () { requestAnimationFrame(start); }); }
  // The selected responsive poster is already preloaded at high priority.
  var poster = Array.from(document.querySelectorAll('link[rel="preload"][as="image"]')).find(function (link) { return !link.media || matchMedia(link.media).matches; });
  if (document.hidden) start();
  else if (poster) {
    var image = new Image(); image.onload = painted; image.onerror = painted; image.src = poster.href;
  } else painted();
  document.addEventListener('visibilitychange', function () { if (document.hidden) start(); });
  window.addEventListener('pagehide', start, { once: true });
})();
</script>`
}

export function injectRepGa4Tag(html: string, snippet: string) {
  if (!snippet || html.includes('id="sparkle-rep-ga4"')) return html
  if (html.includes('</head>')) return html.replace('</head>', `${snippet}\n</head>`)
  return html
}

async function defaultTagLookup(repId: string): Promise<RepGa4TagRecord | null> {
  const admin = createAdminClient()
  const { data: rep, error: repError } = await admin
    .from('reps')
    .select('custom_domain, account_classification')
    .eq('id', repId)
    .maybeSingle()
  if (repError || !rep) return null

  const { data: analytics, error: analyticsError } = await admin
    .from('rep_analytics_properties')
    .select('measurement_id, enabled')
    .eq('rep_id', repId)
    .maybeSingle()
  if (analyticsError) return null

  return {
    customDomain: typeof rep.custom_domain === 'string' ? rep.custom_domain : null,
    accountClassification:
      typeof rep.account_classification === 'string' ? rep.account_classification : null,
    measurementId:
      typeof analytics?.measurement_id === 'string' ? analytics.measurement_id : null,
    enabled: analytics?.enabled === true,
  }
}

export async function resolveRepGa4TagHtml(args: {
  request: Request
  repId?: string | null
  shopHref?: string | null
  env?: Record<string, string | undefined>
  lookup?: TagLookup
}) {
  const requestUrl = new URL(args.request.url)
  const host = readRealRequestHost(args.request)
  const smokeMeasurementId = readSmokeMeasurementId(args.env)
  const needsRecord =
    Boolean(host) &&
    !isAmethystPlatformHost(host) &&
    !isVercelAppPreviewHost(host) &&
    !isBlockedRepAnalyticsPath(requestUrl.pathname)
  const repId = args.repId?.trim().toLowerCase() ?? ''
  let record: RepGa4TagRecord | null = null
  if (needsRecord && REP_ID_PATTERN.test(repId)) {
    try {
      record = await (args.lookup ?? defaultTagLookup)(repId)
    } catch {
      record = null
    }
  }

  const measurementId = decideRepGa4MeasurementId({
    host,
    pathname: requestUrl.pathname,
    record,
    smokeMeasurementId,
  })
  if (!measurementId) return ''
  return buildRepGa4Snippet({
    measurementId,
    shopHref: args.shopHref,
  })
}
