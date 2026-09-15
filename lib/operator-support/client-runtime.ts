export type OperatorSupportClientContext = {
  sessionId: string
  csrfToken: string
  operator: { displayName: string }
  target: {
    repId: string
    displayName: string
    businessName: string
    publicSiteSlug: string | null
  }
}

const WORKSPACE_API_PREFIXES = [
  '/api/nic-nac',
  '/api/self-serve',
  '/api/stripe',
  '/api/workspace',
] as const

export function isWorkspaceApiPath(pathname: string) {
  return WORKSPACE_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function buildOperatorSupportGatewayUrl(
  input: string,
  sessionId: string,
  origin: string,
) {
  const url = new URL(input, origin)
  if (url.origin !== origin || !isWorkspaceApiPath(url.pathname)) return null
  const gateway = new URL(
    `/api/control-center/support-sessions/${encodeURIComponent(sessionId)}/gateway`,
    origin,
  )
  gateway.searchParams.set('path', url.pathname)
  url.searchParams.forEach((value, key) => gateway.searchParams.append(key, value))
  return `${gateway.pathname}${gateway.search}`
}
