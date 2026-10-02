import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkCustomerSiteLayoutLock, hashLockedSource } from '../scripts/check-customer-site-layout-lock.mjs'

type Lock = { path: string; function?: string; sha256: string }
const fixture = JSON.parse(readFileSync('tests/fixtures/customer-site-layout-lock.json', 'utf8')) as { locks: Lock[] }
const normalize = (value: string) => value.replace(/\r\n/g, '\n')

function lockedSource(lock: Lock) {
  const source = normalize(readFileSync(lock.path, 'utf8'))
  if (!lock.function) return source
  const start = source.indexOf(`function ${lock.function}(`)
  if (start < 0) throw new Error(`Locked function missing: ${lock.path} ${lock.function}`)
  const rest = source.slice(start)
  const next = rest.slice(1).search(/\nfunction [A-Za-z]/)
  return next < 0 ? rest : rest.slice(0, next + 1)
}

describe('approved shared customer-site layout is locked during skin work', () => {
  for (const lock of fixture.locks) {
    it(`${lock.path}${lock.function ? `: ${lock.function}` : ''} matches the approved source`, () => {
      const hash = hashLockedSource(lockedSource(lock))
      expect(hash, 'Skin approval does not authorize changing the shared layout. Restore the approved source; never refresh this baseline without Louis approving the exact shared change.').toBe(lock.sha256)
    })
  }
  it('the mandatory build guard verifies the same approved baseline', () => {
    expect(checkCustomerSiteLayoutLock()).toBe(fixture.locks.length)
  })
  it('an unauthorized header action or spacing change does not match the baseline', () => {
    for (const lock of fixture.locks.filter(lock => lock.function === 'Header' || !lock.function)) {
      const original = lockedSource(lock)
      const changed = lock.function ? original.replace('Shop', 'Shop differently') : original + '\n.hp-header { padding: 70px; }\n'
      expect(changed).not.toBe(original)
      expect(hashLockedSource(changed)).not.toBe(lock.sha256)
    }
  })
})
