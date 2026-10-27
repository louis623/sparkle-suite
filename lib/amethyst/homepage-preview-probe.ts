import { timingSafeEqual } from 'node:crypto'

/** One read-only fault injection for the explicitly authorized preview QA. */
export function forceHomepageRenderFailure(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_PROJECT_ID !== 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ') return false
  const expected = process.env.SSR_PREVIEW_PROBE_SECRET
  const received = request.headers.get('x-ssr-render-failure')
  if (!expected || expected.length < 32 || !received) return false
  const a = Buffer.from(expected), b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}
