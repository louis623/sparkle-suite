import { AuthError, getAuthenticatedRep } from './auth'
import { createAdminClient } from './admin'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getLocOperatorContext } from '@/lib/loc-control-center/context'

const CONTROL_CENTER_SESSION_COOKIE = 'sparkle_control_center_session'
const CONTROL_CENTER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12

type OperatorContext = Awaited<ReturnType<typeof getAuthenticatedRep>>

type ControlCenterSession = {
  authUserId: string
  email: string
  expiresAt: number
  repId: string
}

export type ControlCenterOperatorScope = 'owner' | 'site_support' | 'accounting_viewer'

export type ControlCenterAccess = {
  method: 'control_center_session' | 'loc_service'
  operator: { email: string; repId: string }
  scope: ControlCenterOperatorScope
}

type AdditionalControlCenterCredential = {
  username: string
  password: string
  operatorEmail: string
}

export class OperatorAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OperatorAuthError'
  }
}

function getOperatorEmails() {
  const configured = process.env.INTERNAL_OPERATOR_EMAILS
  const internal = configured
    ? configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    : ['louis@neonrabbit.net']
  return [
    ...new Set([
      ...internal,
      ...getSiteSupportOperatorEmails(),
      ...getAccountingViewerOperatorEmails(),
    ]),
  ]
}

function isControlCenterDevAuthBypassEnabled() {
  return process.env.NODE_ENV === 'development'
}

function getSiteSupportOperatorEmails() {
  return (process.env.CONTROL_CENTER_SITE_SUPPORT_OPERATOR_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function getAccountingViewerOperatorEmails() {
  return (process.env.CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function getControlCenterOwnerEmails() {
  return (process.env.CONTROL_CENTER_OWNER_EMAILS ?? 'louis@neonrabbit.net')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function getControlCenterOperatorScope(email: string): ControlCenterOperatorScope | null {
  if (getAccountingViewerOperatorEmails().includes(email)) return 'accounting_viewer'
  if (getSiteSupportOperatorEmails().includes(email)) return 'site_support'
  if (getControlCenterOwnerEmails().includes(email)) return 'owner'
  return null
}

function getAdditionalControlCenterCredentials(): AdditionalControlCenterCredential[] {
  const raw = process.env.CONTROL_CENTER_ADDITIONAL_OPERATOR_CREDENTIALS?.trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return []
      const value = entry as Record<string, unknown>
      const username = typeof value.username === 'string' ? value.username.trim().toLowerCase() : ''
      const password = typeof value.password === 'string' ? value.password : ''
      const operatorEmail = typeof value.operatorEmail === 'string' ? value.operatorEmail.trim().toLowerCase() : ''
      return username && password && operatorEmail ? [{ username, password, operatorEmail }] : []
    })
  } catch {
    return []
  }
}

function getAccountingViewerCredential(): AdditionalControlCenterCredential[] {
  const username = process.env.CONTROL_CENTER_ACCOUNTING_VIEWER_USERNAME?.trim().toLowerCase()
  const password = process.env.CONTROL_CENTER_ACCOUNTING_VIEWER_PASSWORD
  const operatorEmail = process.env.CONTROL_CENTER_ACCOUNTING_VIEWER_OPERATOR_EMAIL?.trim().toLowerCase()
  return username && password && operatorEmail ? [{ username, password, operatorEmail }] : []
}

function getConfiguredControlCenterCredentials(): AdditionalControlCenterCredential[] {
  const configuredUsername = process.env.CONTROL_CENTER_USERNAME?.trim().toLowerCase()
  const configuredPassword = process.env.CONTROL_CENTER_PASSWORD
  const configuredOperatorEmail = (process.env.CONTROL_CENTER_OPERATOR_EMAIL ?? configuredUsername)?.trim().toLowerCase()
  const legacy = configuredUsername && configuredPassword && configuredOperatorEmail
    ? [{ username: configuredUsername, password: configuredPassword, operatorEmail: configuredOperatorEmail }]
    : []
  return [...legacy, ...getAdditionalControlCenterCredentials(), ...getAccountingViewerCredential()]
}

function credentialMatches(value: string, expected: string) {
  const actual = Buffer.from(value)
  const comparison = Buffer.from(expected)
  return actual.length === comparison.length && timingSafeEqual(actual, comparison)
}

async function getDevBypassOperator() {
  const email = getOperatorEmails()[0] ?? 'louis@neonrabbit.net'
  const admin = createAdminClient()
  const { data: rep, error } = await admin
    .from('reps')
    .select('id, auth_user_id, email, display_name, business_name, stripe_customer_id, public_site_slug, custom_domain, time_zone, status')
    .eq('email', email)
    .single()

  if (error || !rep) {
    throw new AuthError('Dev operator rep not found')
  }

  return { repId: rep.id as string, rep }
}

export async function getAuthenticatedOperator() {
  const locContext = getLocOperatorContext()
  if (locContext) return locContext.operator
  let context: OperatorContext

  try {
    context = await getAuthenticatedRep()
  } catch (error) {
    if (error instanceof AuthError && isControlCenterDevAuthBypassEnabled()) {
      context = await getDevBypassOperator()
    } else {
      throw error
    }
  }

  const email = context.rep.email.trim().toLowerCase()

  if (!getOperatorEmails().includes(email)) {
    throw new OperatorAuthError('Authenticated rep is not an operator')
  }

  return context
}

function getControlCenterSessionSecret() {
  return process.env.CONTROL_CENTER_SESSION_SECRET ?? null
}

function signControlCenterSession(payload: string, sessionSecret: string) {
  return createHmac('sha256', sessionSecret).update(payload).digest('base64url')
}

function encodeControlCenterSession(session: ControlCenterSession, sessionSecret: string) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${signControlCenterSession(payload, sessionSecret)}`
}

function decodeControlCenterSession(value: string, sessionSecret: string) {
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return null
  const actual = Buffer.from(signature)
  const expected = Buffer.from(signControlCenterSession(payload, sessionSecret))
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<ControlCenterSession>
    if (
      typeof session.authUserId !== 'string' ||
      typeof session.email !== 'string' ||
      typeof session.repId !== 'string' ||
      typeof session.expiresAt !== 'number' ||
      session.expiresAt <= Date.now()
    ) return null
    return session as ControlCenterSession
  } catch {
    return null
  }
}

export async function authenticateControlCenterOperator(email: string, password: string): Promise<OperatorContext> {
  const username = email.trim().toLowerCase()
  if (!username || !password) throw new AuthError('Username and password are required.')
  const credentials = getConfiguredControlCenterCredentials()
  if (credentials.length === 0) {
    throw new Error('Control Center credentials are not configured.')
  }
  const matchingCredential = credentials.find((credential) =>
    credentialMatches(username, credential.username) && credentialMatches(password, credential.password),
  )
  if (!matchingCredential) throw new AuthError('That username or password is not valid.')

  const operatorEmail = matchingCredential.operatorEmail
  if (!getOperatorEmails().includes(operatorEmail)) {
    throw new OperatorAuthError('Control Center operator identity is not authorized.')
  }
  if (!getControlCenterOperatorScope(operatorEmail)) {
    throw new OperatorAuthError('Control Center operator scope is not configured.')
  }

  const admin = createAdminClient()
  const { data: rep, error: repError } = await admin
    .from('reps')
    .select('id, auth_user_id, email, display_name, business_name, stripe_customer_id, public_site_slug, custom_domain, time_zone, status')
    .eq('email', operatorEmail)
    .single()
  if (repError || !rep) throw new AuthError('Operator account was not found.')

  return { repId: rep.id as string, rep }
}

export function createControlCenterSessionValue(operator: OperatorContext) {
  const sessionSecret = getControlCenterSessionSecret()
  if (!sessionSecret) throw new Error('Control Center operator sessions are not configured.')
  const expiresAt = Date.now() + CONTROL_CENTER_SESSION_MAX_AGE_SECONDS * 1000
  return {
    value: encodeControlCenterSession({
      authUserId: operator.rep.auth_user_id,
      email: operator.rep.email.trim().toLowerCase(),
      expiresAt,
      repId: operator.repId,
    }, sessionSecret),
    expiresAt,
  }
}

export async function getControlCenterSession() {
  const sessionSecret = getControlCenterSessionSecret()
  if (!sessionSecret) return null
  const value = (await cookies()).get(CONTROL_CENTER_SESSION_COOKIE)?.value
  return value ? decodeControlCenterSession(value, sessionSecret) : null
}

async function getScopedControlCenterAccess(): Promise<ControlCenterAccess> {
  const locContext = getLocOperatorContext()
  if (locContext) return { method: 'loc_service', operator: { email: locContext.operator.rep.email, repId: locContext.operator.repId }, scope: 'owner' }
  const session = await getControlCenterSession()
  if (!session) throw new AuthError('Control Center sign in is required.')

  // A valid signature proves who created the cookie, but it must not preserve
  // access after the operator account or allowlist changes. Re-resolve the
  // frozen identity on every privileged Control Center request.
  const email = session.email.trim().toLowerCase()
  if (!getOperatorEmails().includes(email)) {
    throw new OperatorAuthError('Control Center operator identity is no longer authorized.')
  }
  const scope = getControlCenterOperatorScope(email)
  if (!scope) throw new OperatorAuthError('Control Center operator scope is not configured.')
  const admin = createAdminClient()
  const { data: rep, error } = await admin
    .from('reps')
    .select('id, auth_user_id, email, status')
    .eq('id', session.repId)
    .maybeSingle()
  if (error || !rep) throw new AuthError('Control Center operator account was not found.')
  if (
    rep.auth_user_id !== session.authUserId ||
    rep.email.trim().toLowerCase() !== email ||
    rep.status !== 'active'
  ) {
    throw new OperatorAuthError('Control Center operator identity is no longer authorized.')
  }

  return { method: 'control_center_session' as const, operator: { email, repId: session.repId }, scope }
}

// Owner-only is the safe default for existing Control Center pages and routes.
// Narrow non-owner roles must opt in page by page.
export async function getControlCenterAccess(
  options: { allowSiteSupport?: boolean; allowAccountingViewer?: boolean } = {},
): Promise<ControlCenterAccess> {
  const access = await getScopedControlCenterAccess()
  if (access.scope === 'owner') return access
  if (access.scope === 'site_support' && options.allowSiteSupport) return access
  if (access.scope === 'accounting_viewer' && options.allowAccountingViewer) return access
  return requireControlCenterOwner(access)
}

export function requireControlCenterOwner(access: ControlCenterAccess) {
  if (access.scope !== 'owner') {
    throw new OperatorAuthError('This Control Center operator is limited to its assigned area.')
  }
  return access
}

export const controlCenterSessionCookie = {
  maxAge: CONTROL_CENTER_SESSION_MAX_AGE_SECONDS,
  name: CONTROL_CENTER_SESSION_COOKIE,
  options: {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  },
}

export { AuthError }
