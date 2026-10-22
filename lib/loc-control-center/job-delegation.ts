import { z } from 'zod'
import { digestLocInput, LocBridgeError } from './security'

// Standing grant proof from louis-ops-center PR #61. The signed object is
// mode, agentId, agentName, and operation. agentId is the grant id unless a
// separate grantId is present. scopes, expiresAt, revoked, and revokedAt are
// checked only when the payload includes them.
export const LOC_NAMED_AGENT_PUBLISH_SCOPE = 'suite.resources.publish'
export const LOC_NAMED_AGENT_EMAIL_SCOPE = 'suite.resources.emailPreview'

export const locNamedAgentGrantSchema = z.object({
  mode: z.literal('named-agent'),
  agentId: z.uuid(),
  agentName: z.string().trim().min(1).max(160),
  operation: z.literal(LOC_NAMED_AGENT_PUBLISH_SCOPE),
  grantId: z.uuid().optional(),
  scopes: z.array(z.enum([
    LOC_NAMED_AGENT_PUBLISH_SCOPE,
    LOC_NAMED_AGENT_EMAIL_SCOPE,
  ])).max(2).optional(),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  revoked: z.boolean().optional(),
  revokedAt: z.iso.datetime({ offset: true }).nullable().optional(),
}).strict()

export type LocNamedAgentGrantAudit = {
  agentId: string
  agentName: string
  grantId: string
  emailAllowed: boolean
}

/** Call only after the LOC bridge signature has been verified. A missing grant grants nothing. */
export function verifyLocNamedAgentGrant(body: {
  authority: 'owner' | 'agent'
  operation: string
  intendedAssignee?: string | null
  input: Record<string, unknown>
  delegation?: unknown
  namedAgentGrant?: z.infer<typeof locNamedAgentGrantSchema>
}, now = Date.now()): LocNamedAgentGrantAudit | null {
  const grant = body.namedAgentGrant
  if (!grant) return null
  const product = typeof body.input.product === 'string' ? body.input.product : ''
  if (`${product}.${body.operation}` !== LOC_NAMED_AGENT_PUBLISH_SCOPE)
    throw new LocBridgeError(403, 'A named-agent grant is only valid for suite.resources.publish.')
  if (body.authority !== 'agent')
    throw new LocBridgeError(403, 'A named-agent grant is only valid on an agent connection.')
  if (body.delegation)
    throw new LocBridgeError(403, 'A named-agent grant cannot be combined with a one-time job approval.')
  if (body.intendedAssignee !== grant.agentName)
    throw new LocBridgeError(403, 'This named-agent grant does not match the signed agent.')
  const scopes = grant.scopes ?? [grant.operation]
  const unique = new Set(scopes)
  if (unique.size !== scopes.length || !unique.has(LOC_NAMED_AGENT_PUBLISH_SCOPE))
    throw new LocBridgeError(403, 'This named-agent grant does not include suite.resources.publish.')
  if (grant.expiresAt) {
    const expires = Date.parse(grant.expiresAt)
    if (!Number.isFinite(expires) || expires <= now)
      throw new LocBridgeError(403, 'This named-agent grant is expired.')
  }
  if (grant.revoked === true || (grant.revokedAt != null && grant.revokedAt !== ''))
    throw new LocBridgeError(403, 'This named-agent grant is revoked.')
  const emailAllowed = unique.has(LOC_NAMED_AGENT_EMAIL_SCOPE)
  if (body.input.emailSuiteList === true && !emailAllowed)
    throw new LocBridgeError(403, 'This named-agent grant does not include Suite list email.')
  return {
    agentId: grant.agentId,
    agentName: grant.agentName,
    grantId: grant.grantId ?? grant.agentId,
    emailAllowed,
  }
}

export function withLocNamedAgentAudit(
  result: unknown,
  audit: Pick<LocNamedAgentGrantAudit, 'agentId' | 'agentName' | 'grantId'>,
) {
  const base = result && typeof result === 'object' && !Array.isArray(result)
    ? { ...(result as Record<string, unknown>) }
    : { value: result }
  return {
    ...base,
    locNamedAgentAudit: {
      agentId: audit.agentId,
      agentName: audit.agentName,
      grantId: audit.grantId,
    },
  }
}

export const locJobDelegationSchema = z.object({
  mode: z.literal('owner-approved'),
  ownerId: z.uuid(), jobId: z.uuid(), agentId: z.uuid(), operationId: z.uuid(), connectionId: z.uuid(),
  operation: z.string().min(1).max(120),
  inputHash: z.string().regex(/^[a-f0-9]{64}$/),
  bridgeInputHash: z.string().regex(/^[a-f0-9]{64}$/),
  targetIds: z.array(z.string().min(1).max(200)).max(500),
  expiresAt: z.iso.datetime({ offset: true }),
}).strict()

/** Call only after verifying the signed LOC envelope. Never read approval from business input. */
export function verifyLocJobDelegation(body: {
  authority: 'owner' | 'agent'; ownerId: string; connectionId: string;
  operation: string; operationId?: string; input: Record<string, unknown>;
  delegation?: z.infer<typeof locJobDelegationSchema>;
}, targetKeys: readonly string[], now = Date.now()) {
  const proof = body.delegation
  if (!proof) return false
  const targets = [...new Set(targetKeys.flatMap(key => typeof body.input[key] === 'string' ? [body.input[key] as string] : []))].sort()
  const suppliedTargets = [...new Set(proof.targetIds)].sort()
  if (body.authority !== 'agent' || proof.ownerId !== body.ownerId ||
      proof.connectionId !== body.connectionId || proof.operationId !== body.operationId ||
      proof.operation !== `${body.input.product}.${body.operation}` ||
      Date.parse(proof.expiresAt) <= now || Date.parse(proof.expiresAt) > now + 30 * 86400000 ||
      proof.bridgeInputHash !== digestLocInput({ operation: body.operation, input: body.input }) ||
      JSON.stringify(targets) !== JSON.stringify(suppliedTargets)) {
    throw new LocBridgeError(403, 'This agent job does not have a valid approval for this exact action.')
  }
  return true
}
