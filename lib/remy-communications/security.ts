import { AsyncLocalStorage } from 'node:async_hooks'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://grok.com',
  'https://www.grok.com',
])

function configuredOrigins() {
  const configured = (
    process.env.SPARKLE_CONTROL_CENTER_MCP_ALLOWED_ORIGINS ??
    process.env.REMY_MCP_ALLOWED_ORIGINS
  )
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  return new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS)
}

function configuredToken() {
  return (
    process.env.SPARKLE_CONTROL_CENTER_MCP_BEARER_TOKEN ??
    process.env.REMY_MCP_BEARER_TOKEN
  )?.trim() ?? ''
}

function tokenMatches(authorization: string | null, expectedToken: string) {
  const supplied = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''
  const suppliedBuffer = Buffer.from(supplied)
  const expectedBuffer = Buffer.from(expectedToken)
  return (
    suppliedBuffer.length > 0 &&
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  )
}

export function remyMcpSecurityResponse(request: Request) {
  const token = configuredToken()
  if (!token) {
    return NextResponse.json(
      { error: 'Sparkle Suite Control Center MCP is not configured.' },
      { status: 503 },
    )
  }

  const origin = request.headers.get('origin')
  if (origin && !configuredOrigins().has(origin)) {
    return NextResponse.json({ error: 'forbidden origin' }, { status: 403 })
  }

  if (!tokenMatches(request.headers.get('authorization'), token)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      {
        status: 401,
        headers: { 'www-authenticate': 'Bearer realm="Sparkle Suite Control Center MCP"' },
      },
    )
  }

  return null
}

const ownerScope = new AsyncLocalStorage<{ ownerScoped: true }>()

export class OwnerScopedMcpError extends Error {
  constructor() {
    super('This tool requires the owner-scoped Control Center token.')
    this.name = 'OwnerScopedMcpError'
  }
}

export function runWithOwnerScopedControlCenterMcp<T>(work: () => T): T {
  return ownerScope.run({ ownerScoped: true }, work)
}

export function assertOwnerScopedControlCenterMcp() {
  if (ownerScope.getStore()?.ownerScoped !== true) throw new OwnerScopedMcpError()
}
