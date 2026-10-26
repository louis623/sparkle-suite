import { createRequire } from 'node:module'
import { expect, it } from 'vitest'

const { shouldBlockAppWrite } = createRequire(import.meta.url)('../scripts/qa/browser-readonly.cjs')
const base = 'https://example.vercel.app'
const request = (path: string, method = 'POST') => ({ url: () => new URL(path, base).href, method: () => method })

it('blocks every application write, including signup and database API requests', () => {
  for (const path of ['/api/amethyst/customer-audience', '/api/amethyst/lead', '/rest/v1/reps', '/amethyst/analytics-worker/1.0.2/proxytown/extra']) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) expect(shouldBlockAppWrite(request(path, method), base)).toBe(true)
  }
})

it('permits read requests and only the exact static worker POST bridge', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) expect(shouldBlockAppWrite(request('/api/amethyst/homepage', method), base)).toBe(false)
  expect(shouldBlockAppWrite(request('/amethyst/analytics-worker/1.0.2/proxytown'), base)).toBe(false)
  expect(shouldBlockAppWrite(request('/amethyst/analytics-worker/1.0.2/proxytown', 'DELETE'), base)).toBe(true)
})
