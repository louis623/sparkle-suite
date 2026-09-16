import { expect, it } from 'vitest'
import { isLineupSetupReadiness, readinessHelp } from '@/app/nic-nac/components/live-lineup-readiness-client'
const ready = {protocol:2,ready:true,reason:'ready',checkedAt:'2026-09-09T12:00:00.000Z',lastReadyAt:'2026-09-09T11:59:59.000Z',generation:0,revision:2}
it('accepts exact recent readiness or explicit non-ready state', () => {
  expect(isLineupSetupReadiness(ready)).toBe(true)
  expect(isLineupSetupReadiness({...ready, ready:false, reason:'not_initialized', lastReadyAt:null, generation:null,revision:null})).toBe(true)
})
it.each([null, [], {}, {...ready,protocol:1}, {...ready,reason:'stale'}, {...ready,ready:'yes'}, {...ready,revision:-1}, {...ready,generation:NaN}, {...ready,checkedAt:null}, {...ready,lastReadyAt:'2026-09-09T12:00:01Z'}, {...ready,lastReadyAt:'2026-09-09T11:00:00Z'}])('rejects malformed or contradictory setup evidence %#', value => {
  expect(isLineupSetupReadiness(value)).toBe(false)
})
it('offers safe actionable support text without passing server strings through', () => {
  expect(readinessHelp('publisher_revoked')).toContain('assigned Live Queue code')
  expect(readinessHelp('state_changed')).toContain('verify again')
  expect(readinessHelp('schema_unavailable')).toContain('support')
})
