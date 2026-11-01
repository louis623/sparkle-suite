import 'server-only'
import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isAmethystPlatformHost } from '@/lib/amethyst/host-routing'
import { resolveCustomerDomainSiteState } from '@/lib/amethyst/customer-domain-site'
import { sameOriginScript } from './client-error-source'

type ScriptManifest = Record<string, number[]>
let manifest: ScriptManifest | undefined
let reportedConfigurationFailure = false
function configurationFailure(reason: string) {
  if (reportedConfigurationFailure) return
  reportedConfigurationFailure = true
  // One generic operational diagnostic per instance, never report contents/IPs.
  console.error('[client-error] ' + reason)
}

export async function isClientErrorHostAllowed(host: string) {
  if (isAmethystPlatformHost(host)) return true
  // Only THIS deployment, not arbitrary Vercel hosts. Custom domains use the
  // same approved/servable rep resolver as customer pages, failing closed.
  if (process.env.VERCEL_ENV === 'preview' && host === process.env.VERCEL_URL) return true
  return (await resolveCustomerDomainSiteState(host)).kind === 'serve'
}

export function clientErrorIpKey(request: Request) {
  if (process.env.VERCEL !== '1') return null
  // Vercel overwrites this platform header; never use payload IPs or a
  // user-provided x-forwarded-for chain as an alternative identity.
  const ip = request.headers.get('x-vercel-forwarded-for')?.trim()
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!ip || !isIP(ip) || !secret) {
    configurationFailure(!secret ? 'Store key unavailable' : 'Trusted platform IP unavailable')
    return null
  }
  return createHmac('sha256', secret).update(`client-error-ip:${ip}`).digest('hex')
}

export function isBuiltClientErrorSource(value: unknown, origin: string, scripts?: ScriptManifest) {
  if (!value || typeof value !== 'object') return null
  const input = value as { url: string; line: number; column: number }
  const source = sameOriginScript(input, origin)
  if (!source) return null
  try {
    const allowed = scripts ?? (manifest ??= JSON.parse(readFileSync(
      join(process.cwd(), 'lib', 'monitoring', 'generated', 'client-scripts.json'), 'utf8',
    )))
    const length = allowed[source.file]?.[source.line - 1]
    return typeof length === 'number' && source.column <= length + 1 ? source : null
  } catch { configurationFailure('Built script manifest unavailable'); return null }
}
