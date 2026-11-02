import { describe, expect, it } from 'vitest'
import { compareTestResults } from '../../scripts/ci/compare-test-results.mjs'

const known = [{ file: 'tests/example.test.ts', fullName: 'example fails', reason: 'pre-existing at baseline' }]
const report = (status = 'failed', name = 'example fails') => ({
  testResults: [{ name: `${process.cwd()}/tests/example.test.ts`, status, message: '', assertionResults: [{ fullName: name, status }] }],
})

describe('CI test baseline comparison', () => {
  it('accepts a known failure', () => expect(compareTestResults(report(), known).ok).toBe(true))
  it('rejects a new failure even when the file is known', () => expect(compareTestResults(report('failed', 'new failure'), known).ok).toBe(false))
  it('rejects suite-load errors even in a known file', () => {
    const input = report()
    input.testResults[0].assertionResults = []
    input.testResults[0].message = 'Cannot resolve module'
    expect(compareTestResults(input, known).loadErrors).toEqual(['tests/example.test.ts'])
  })
  it('reports a known failure that now passes', () => expect(compareTestResults(report('passed'), known).newlyPassing).toEqual([{ file: known[0].file, fullName: known[0].fullName }]))
  it('does not call skipped tests fixed', () => expect(compareTestResults(report('pending'), known).newlyPassing).toEqual([]))
  it('rejects a runtime error and missing results', () => {
    expect(compareTestResults({ ...report('passed'), numRuntimeErrorTestSuites: 1 }, []).ok).toBe(false)
    expect(() => compareTestResults({ testResults: [] }, [])).toThrow()
  })
})
