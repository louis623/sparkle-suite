import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export function compareTestResults(report, knownFailures, root = process.cwd()) {
  if (!Array.isArray(report.testResults) || !report.testResults.length || !Array.isArray(knownFailures)) {
    throw new Error('Missing or invalid Vitest results / known failures')
  }
  const key = (file, name) => JSON.stringify([file.replaceAll('\\', '/'), name])
  const known = new Set(knownFailures.map(entry => {
    if (!entry.file || !entry.fullName || !entry.reason) throw new Error('Invalid known failure')
    return key(entry.file, entry.fullName)
  }))
  const newFailures = [], newlyPassing = [], loadErrors = []
  for (const suite of report.testResults) {
    const file = relative(root, resolve(root, suite.name)).replaceAll('\\', '/')
    const assertions = suite.assertionResults ?? []
    if (suite.status === 'failed' && (!assertions.some(test => test.status === 'failed') || suite.message)) {
      // A load/collection failure cannot be exempted by a known test name.
      loadErrors.push(file)
    }
    for (const test of assertions) {
      const identity = { file, fullName: test.fullName }
      if (test.status === 'failed' && !known.has(key(file, test.fullName))) newFailures.push(identity)
      if (test.status === 'passed' && known.has(key(file, test.fullName))) newlyPassing.push(identity)
    }
  }
  if (report.numRuntimeErrorTestSuites > 0 || report.unhandledErrors?.length) loadErrors.push('Vitest runtime/unhandled errors')
  return { ok: !newFailures.length && !loadErrors.length, newFailures, newlyPassing, loadErrors }
}

export function main(args = process.argv.slice(2)) {
  try {
    const [resultsPath, knownPath = 'tests/known-failures.json'] = args
    if (!resultsPath) throw new Error('Usage: compare-test-results.mjs results.json [known-failures.json]')
    const report = JSON.parse(readFileSync(resultsPath, 'utf8'))
    const result = compareTestResults(report, JSON.parse(readFileSync(knownPath, 'utf8')))
    console.log(`Vitest: ${report.numPassedTests} passed / ${report.numFailedTests} failed / ${report.numPendingTests} skipped`)
    for (const item of result.newFailures) console.error(`NEW FAILURE: ${item.file} :: ${item.fullName}`)
    for (const file of result.loadErrors) console.error(`SUITE LOAD ERROR: ${file}`)
    for (const item of result.newlyPassing) console.log(`KNOWN FAILURE NOW PASSING (remove from list): ${item.file} :: ${item.fullName}`)
    console.log(result.ok ? 'No new failures.' : 'New failures or suite-load errors detected.')
    return result.ok ? 0 : 1
  } catch (error) {
    console.error(`Cannot compare test results: ${error.message}`)
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = main()
