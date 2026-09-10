import { z } from 'zod'
import { digestLocInput, LocBridgeError } from './security'

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
