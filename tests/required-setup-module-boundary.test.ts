import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { build } from 'esbuild'
import { expect, it } from 'vitest'
import { REQUIRED_SETUP_STEPS } from '@/lib/self-serve/required-setup-contract'
import { REQUIRED_SETUP_STEPS as serverSteps } from '@/lib/self-serve/required-setup'

it('shares the same setup vocabulary without a server dependency in the browser contract', async () => {
  expect(serverSteps).toBe(REQUIRED_SETUP_STEPS)
  expect(REQUIRED_SETUP_STEPS.map(step => step.id)).toEqual([
    'account_basics', 'site_skin', 'welcome_copy', 'about_page', 'show_schedule',
    'customer_site_orientation', 'live_queue_setup', 'trade_board_orientation', 'final_preview_approval',
  ])
  const result = await build({ entryPoints: ['lib/self-serve/required-setup-contract.ts'], bundle: true,
    write: false, platform: 'browser', format: 'esm', metafile: true, logLevel: 'silent' })
  expect(Object.keys(result.metafile!.inputs)).toEqual(['lib/self-serve/required-setup-contract.ts'])
  expect(result.outputFiles[0].text).not.toMatch(/createAdminClient|readLineupSetupReadiness|completeRequiredSetupStep|server-only/)
})

it('keeps client entry imports on the contract and the readiness server-only guard intact', () => {
  for (const file of ['app/nic-nac/_client.tsx', 'app/nic-nac/components/WorkspaceAccessPending.tsx',
    'app/nic-nac/components/RequiredSetupHome.tsx', 'app/nic-nac/components/NicNacChatBody.tsx',
    'lib/nic-nac/required-setup-client-mode.ts', 'lib/britt-with-bling/tenant.ts',
    'lib/bling-kitchen/tenant.ts', 'lib/mile-high-fizz/tenant.ts']) {
    const source = readFileSync(resolve(file), 'utf8')
    expect(source).toContain("from '@/lib/self-serve/required-setup-contract'")
    expect(source).not.toContain("from '@/lib/self-serve/required-setup'")
  }
  expect(readFileSync(resolve('lib/live-lineup/setup-readiness.ts'), 'utf8')).toContain("import 'server-only'")
})
