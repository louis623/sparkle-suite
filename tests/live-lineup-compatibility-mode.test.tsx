import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { build } from 'esbuild'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  change: vi.fn(),
  get: vi.fn(),
  issue: vi.fn(),
  list: vi.fn(),
  revoke: vi.fn(),
  listArchives: vi.fn(),
  readArchive: vi.fn(),
  recoverArchive: vi.fn(),
  admin: vi.fn(),
  claim: vi.fn(),
  describe: vi.fn(),
  receive: vi.fn(),
  target: vi.fn(),
  previewRep: vi.fn(),
  publicSnapshot: vi.fn(),
  publicProjection: vi.fn(),
}))

vi.mock('@/lib/live-lineup/http', async (original) => ({
  ...await original<typeof import('@/lib/live-lineup/http')>(),
  workspaceLineupContext: mocks.context,
  workspaceLineupReadContext: mocks.context,
}))
vi.mock('@/lib/live-lineup/service', () => ({
  changeLineup: mocks.change,
  getWorkspaceLineup: mocks.get,
  issuePublisher: mocks.issue,
  listPublishers: mocks.list,
  revokePublisher: mocks.revoke,
  claimSource: mocks.claim,
  describeSource: mocks.describe,
  receiveSource: mocks.receive,
  getEffectiveLiveQueueSnapshot: mocks.publicSnapshot,
}))
vi.mock('@/lib/live-lineup/archive-recovery', () => ({
  listLineupArchives: mocks.listArchives,
  readLineupArchive: mocks.readArchive,
  recoverLineupArchive: mocks.recoverArchive,
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }))
vi.mock('@/lib/amethyst/request-rep-target', () => ({ resolveAmethystRequestTarget: mocks.target }))
vi.mock('@/lib/amethyst/preview-rep', () => ({ resolveAmethystPreviewRep: mocks.previewRep }))
vi.mock('@/lib/amethyst/public-live-lineup', () => ({ buildPublicLiveLineup: mocks.publicProjection }))

import { getLiveLineupRuntimeMode, LIVE_LINEUP_MODE_ENV } from '@/lib/live-lineup/runtime-mode'
import * as workspace from '@/app/api/workspace/live-lineup/route'
import * as publishers from '@/app/api/workspace/live-lineup/publishers/route'
import * as archives from '@/app/api/workspace/live-lineup/archives/route'
import * as publish from '@/app/api/live-lineup/publish/route'
import * as publicLineup from '@/app/api/amethyst/live-lineup/route'
import { LiveLineupCard } from '@/app/nic-nac/components/LiveLineupCard'
import { LiveLineupPublisherControls } from '@/app/nic-nac/components/LiveLineupPublisherControls'

const originalMode = process.env[LIVE_LINEUP_MODE_ENV]
const origin = 'https://www.yoursparklesuite.com'
const token = `sslp_${'a'.repeat(43)}`
const db = { synthetic: true }

function request(path: string, body: unknown, method = 'POST') {
  return new Request(`${origin}${path}`, {
    method,
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  delete process.env[LIVE_LINEUP_MODE_ENV]
  mocks.context.mockResolvedValue({ db, repId: 'rep-1' })
  mocks.admin.mockReturnValue(db)
  mocks.change.mockResolvedValue({ revision: 2, entries: [] })
  mocks.get.mockResolvedValue({ revision: 1, entries: [] })
  mocks.issue.mockResolvedValue({ token: 'one-time-secret' })
  mocks.list.mockResolvedValue([])
  mocks.listArchives.mockResolvedValue({ archives: [], nextBeforeGeneration: null })
  mocks.recoverArchive.mockResolvedValue({ revision: 2, entries: [] })
  mocks.describe.mockResolvedValue({ protocol: 2, generation: 1 })
  mocks.claim.mockResolvedValue({ publisherId: 'publisher-1', epoch: 1 })
  mocks.receive.mockResolvedValue({ ok: true, revision: 2 })
  mocks.target.mockReturnValue({ targeted: true, publicSiteSlug: 'rep-one' })
  mocks.previewRep.mockResolvedValue({ id: 'rep-1', email: 'rep@example.test', public_site_slug: 'rep-one' })
  mocks.publicSnapshot.mockResolvedValue({ revision: 1 })
  mocks.publicProjection.mockReturnValue({ entries: ['Jessica'] })
})

afterAll(() => {
  if (originalMode === undefined) delete process.env[LIVE_LINEUP_MODE_ENV]
  else process.env[LIVE_LINEUP_MODE_ENV] = originalMode
})

describe('Live Lineup server compatibility mode', () => {
  it('uses normal behavior only when the variable is absent or exactly active', () => {
    expect(getLiveLineupRuntimeMode(undefined)).toBe('active')
    expect(getLiveLineupRuntimeMode('active')).toBe('active')
    for (const value of ['read_only', 'invalid', 'ACTIVE', '', ' active ']) {
      expect(getLiveLineupRuntimeMode(value)).toBe('read_only')
    }
  })

  it('preserves normal owner mutations when absent or explicitly active', async () => {
    for (const value of [undefined, 'active']) {
      if (value === undefined) delete process.env[LIVE_LINEUP_MODE_ENV]
      else process.env[LIVE_LINEUP_MODE_ENV] = value
      const response = await workspace.POST(request('/api/workspace/live-lineup', {
        expectedRevision: 1,
        command: { type: 'undo' },
      }))
      expect(response.status).toBe(200)
    }
    expect(mocks.change).toHaveBeenCalledTimes(2)

    process.env[LIVE_LINEUP_MODE_ENV] = 'active'
    expect((await publishers.POST(request('/api/workspace/live-lineup/publishers', { label: 'Laptop' }))).status).toBe(201)
    expect((await archives.POST(request('/api/workspace/live-lineup/archives', { generation: 1 }))).status).toBe(200)
    expect(mocks.issue).toHaveBeenCalledOnce()
    expect(mocks.recoverArchive).toHaveBeenCalledOnce()
  })

  it.each(['read_only', 'mistyped-mode'])(
    'rejects all Workspace lineup changes with the same safe 503 in %s mode',
    async (mode) => {
      process.env[LIVE_LINEUP_MODE_ENV] = mode
      const response = await workspace.POST(request('/api/workspace/live-lineup', {
        expectedRevision: 1,
        command: { type: 'hold', entryId: 'order-1' },
      }))
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ error: 'live_lineup_read_only' })
      expect(mocks.change).not.toHaveBeenCalled()
    },
  )

  it('blocks key issuance and archive recovery but keeps reads and credential revocation available', async () => {
    process.env[LIVE_LINEUP_MODE_ENV] = 'read_only'
    expect((await workspace.GET()).status).toBe(200)
    expect((await publishers.GET()).status).toBe(200)
    expect((await archives.GET(new Request(`${origin}/api/workspace/live-lineup/archives`))).status).toBe(200)

    const issue = await publishers.POST(request('/api/workspace/live-lineup/publishers', { label: 'Laptop' }))
    const recover = await archives.POST(request('/api/workspace/live-lineup/archives', { generation: 1 }))
    expect(issue.status).toBe(503)
    expect(recover.status).toBe(503)
    expect(await issue.json()).toEqual({ error: 'live_lineup_read_only' })
    expect(await recover.json()).toEqual({ error: 'live_lineup_read_only' })
    expect(mocks.issue).not.toHaveBeenCalled()
    expect(mocks.recoverArchive).not.toHaveBeenCalled()

    const revoke = await publishers.DELETE(request(
      '/api/workspace/live-lineup/publishers',
      { publisherId: 'publisher-1' },
      'DELETE',
    ))
    expect(revoke.status).toBe(200)
    expect(mocks.revoke).toHaveBeenCalledWith(db, 'rep-1', 'publisher-1')
  })

  it('keeps updated-extension publishing and customer-facing GET projections available', async () => {
    process.env[LIVE_LINEUP_MODE_ENV] = 'read_only'
    const sourceRequest = (body: unknown) => new Request(`${origin}/api/live-lineup/publish`, {
      method: 'POST', headers: { origin: 'https://myoffice.bombparty.com', authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect((await publish.POST(sourceRequest({ action: 'describe' }))).status).toBe(200)
    expect((await publish.POST(sourceRequest({ action: 'claim', claimId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', generation: 1 }))).status).toBe(200)
    expect((await publish.POST(sourceRequest({ action: 'snapshot', packet: { sequence: 1 } }))).status).toBe(200)
    expect(mocks.describe).toHaveBeenCalledWith(db, token)
    expect(mocks.claim).toHaveBeenCalledWith(db, token, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', expect.any(Number), 1)
    expect(mocks.receive).toHaveBeenCalledWith(db, token, { sequence: 1 })

    const customerResponse = await publicLineup.GET(new Request(`${origin}/api/amethyst/live-lineup?site=rep-one`))
    expect(customerResponse.status).toBe(200)
    expect(await customerResponse.json()).toEqual({ entries: ['Jessica'] })
    expect(mocks.publicSnapshot).toHaveBeenCalledWith(db, 'rep-1')
  })
})

describe('Live Lineup read-only Workspace UI contract', () => {
  it('visibly explains safety mode and receives it through a server-provided prop', () => {
    const html = renderToStaticMarkup(createElement(LiveLineupCard, { readOnly: true }))
    expect(html).toContain('Lineup changes are temporarily unavailable')
    expect(html).toContain('Customer updates will continue')

    const page = readFileSync(resolve(process.cwd(), 'app/nic-nac/page.tsx'), 'utf8')
    const client = readFileSync(resolve(process.cwd(), 'app/nic-nac/_client.tsx'), 'utf8')
    expect(page).toContain('liveLineupReadOnly={!liveLineupOwnerMutationsAvailable()}')
    expect(client).toContain('liveLineupReadOnly={liveLineupReadOnly}')
    expect(`${page}\n${client}`).not.toContain('NEXT_PUBLIC_SPARKLE_LIVE_LINEUP')

    const card = readFileSync(resolve(process.cwd(), 'app/nic-nac/components/LiveLineupCard.tsx'), 'utf8')
    expect(card).toContain('const disabled = readOnly || baseDisabled')
    expect(card).toContain("if (readOnly || !current?.canManage")
    expect(card).toContain("if (readOnly || !current || mutation.current")
    expect(card).toContain("readOnly ? 'Customers are shown in their current order.'")

    const supportPage = readFileSync(resolve(process.cwd(), 'app/control-center/support/[sessionId]/page.tsx'), 'utf8')
    expect(supportPage).toContain('<SupportWorkspaceClient\n      liveLineupReadOnly')
    expect(supportPage).not.toContain('liveLineupOwnerMutationsAvailable')
  })

  it('disables key creation without disabling safe connection reads or revocation controls', () => {
    const html = renderToStaticMarkup(createElement(LiveLineupPublisherControls, {
      onChanged: () => undefined,
      disabled: false,
      creationDisabled: true,
    }))
    expect(html).toMatch(/<input[^>]*disabled=""/)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Create private connection key<\/button>/)
    expect(html).toMatch(/<button[^>]*>Refresh connections<\/button>/)
  })

  const chromePath = process.env.VISIBILITY_BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  it.skipIf(!existsSync(chromePath))('keeps publisher bootstrap mounted and interactive when the legacy lineup cannot be managed', async () => {
    const bundle = await build({
      stdin: {
        contents: `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { LiveLineupCard } from './app/nic-nac/components/LiveLineupCard';

          const publisher = id => ({ id, label: 'Show laptop', createdAt: '2026-09-12T12:00:00.000Z', expiresAt: '2027-09-12T12:00:00.000Z', revokedAt: null, active: false });
          const firstPublisher = publisher('11111111-1111-4111-8111-111111111111');
          const issuedPublisher = publisher('22222222-2222-4222-8222-222222222222');
          const snapshot = { revision: 0, connection: 'offline', lastReceivedAt: null, lastChangedAt: null, sourceVersion: null, canManage: false, undoAvailable: false, warning: 'Legacy source', entries: [{ id: 'legacy:1', name: 'Waiting customer', position: 1, held: false }], heldEntries: [] };
          const calls = [];
          window.fetch = async (input, init = {}) => {
            const url = String(input);
            const method = init.method || 'GET';
            calls.push(method + ' ' + url);
            let body = snapshot;
            if (url.endsWith('/publishers')) {
              body = method === 'GET' ? { publishers: [firstPublisher] }
                : method === 'POST' ? { publisher: issuedPublisher, token: 'sslp_' + 'a'.repeat(43) }
                : { ok: true };
            }
            return new Response(JSON.stringify(body), { status: method === 'POST' && url.endsWith('/publishers') ? 201 : 200, headers: { 'Content-Type': 'application/json' } });
          };
          const waitFor = async predicate => {
            const deadline = Date.now() + 3000;
            while (!predicate()) {
              if (Date.now() > deadline) throw new Error('Timed out waiting for mounted control state');
              await new Promise(resolve => setTimeout(resolve, 10));
            }
          };
          const button = (scope, text) => [...scope.querySelectorAll('button')].find(node => node.textContent.trim() === text);
          async function exercise(scope, readOnly) {
            await waitFor(() => button(scope, 'Hold'));
            if (!button(scope, 'Hold').disabled) throw new Error('Legacy queue mutation unexpectedly enabled');
            [...scope.querySelectorAll('summary')].find(node => node.textContent.trim() === 'Extension connection setup').click();
            await waitFor(() => button(scope, 'Revoke Show laptop'));
            const refresh = button(scope, 'Refresh connections');
            const create = button(scope, 'Create private connection key');
            if (refresh.disabled) throw new Error('Connection refresh blocked by canManage:false');
            if (create.disabled !== readOnly) throw new Error('Connection creation safety-mode state is wrong');
            const readsBefore = calls.filter(call => call === 'GET /api/workspace/live-lineup/publishers').length;
            refresh.click();
            await waitFor(() => calls.filter(call => call === 'GET /api/workspace/live-lineup/publishers').length > readsBefore);
            await waitFor(() => !button(scope, 'Refresh connections').disabled);
            const deletesBefore = calls.filter(call => call === 'DELETE /api/workspace/live-lineup/publishers').length;
            button(scope, 'Revoke Show laptop').click();
            if (calls.filter(call => call === 'DELETE /api/workspace/live-lineup/publishers').length !== deletesBefore) throw new Error('Revoke skipped confirmation');
            await waitFor(() => button(scope, 'Confirm revoke Show laptop'));
            button(scope, 'Confirm revoke Show laptop').click();
            await waitFor(() => calls.filter(call => call === 'DELETE /api/workspace/live-lineup/publishers').length > deletesBefore);
            if (!readOnly) {
              await waitFor(() => !button(scope, 'Create private connection key').disabled);
              button(scope, 'Create private connection key').click();
              await waitFor(() => calls.includes('POST /api/workspace/live-lineup/publishers'));
            }
          }
          async function run() {
            const editable = document.getElementById('editable');
            const safety = document.getElementById('safety');
            createRoot(editable).render(<LiveLineupCard />);
            createRoot(safety).render(<LiveLineupCard readOnly />);
            await exercise(editable, false);
            await exercise(safety, true);
            document.body.dataset.result = 'pass';
          }
          run().catch(error => { document.body.dataset.result = 'fail'; document.body.dataset.error = error instanceof Error ? error.message : String(error); });
        `,
        resolveDir: process.cwd(), loader: 'tsx',
      },
      bundle: true, write: false, outdir: 'unused-browser-output', format: 'iife',
      define: { 'process.env.NODE_ENV': '"production"' }, jsx: 'automatic',
    })
    const directory = mkdtempSync(join(tmpdir(), 'sparkle-lineup-card-'))
    try {
      const javascript = bundle.outputFiles.find(output => output.path.endsWith('.js'))?.text
      const css = bundle.outputFiles.find(output => output.path.endsWith('.css'))?.text ?? ''
      expect(javascript).toBeTruthy()
      const pagePath = join(directory, 'index.html')
      writeFileSync(pagePath, `<html><head><style>${css}</style></head><body><div id="editable"></div><div id="safety"></div><script>${javascript}</script></body></html>`)
      const browserProfile = join(directory, 'chrome-profile')
      const result = spawnSync(chromePath, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        `--user-data-dir=${browserProfile}`, '--virtual-time-budget=5000', '--dump-dom', pathToFileURL(pagePath).href,
      ], { encoding: 'utf8', timeout: 20000, maxBuffer: 5 * 1024 * 1024 })
      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain('data-result="pass"')
      expect(result.stdout).not.toContain('data-result="fail"')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }, 30000)
})
