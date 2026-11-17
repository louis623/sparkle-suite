import React, { useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { it, expect, vi } from 'vitest'
import type { TradeListingWithDesign } from '@/lib/services/types'

const { select, eq, ids, admin } = vi.hoisted(() => {
  const select = vi.fn(), eq = vi.fn(), ids = vi.fn()
  return { select, eq, ids, admin: { from: vi.fn(), rpc: vi.fn() } }
})
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => admin }))
vi.mock('@/lib/amethyst/preview-rep', () => ({ resolveAmethystPreviewRep: async () => ({ id: 'rep-notes-fixture' }) }))
import { loadAmethystTradeBoardPreviewListings, mapTradeListingToAmethystTradeBoardListing } from '@/lib/amethyst/trade-board-listings'
import { buildAmethystTradeBootstrapScript, defaultAmethystTradeTemplateData } from '@/lib/amethyst/trade-template-data'

function renderer(path: string, name: string) {
  const source = readFileSync(path, 'utf8')
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JSX)
  const names = [name, 'visibleDancerDetail', 'SparkleMark', 'isSpecificTradePreference']
  const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text ?? ''))
    .map(n => n.getText(ast)).join('\n')
  return runInNewContext(ts.transpileModule(functions + '\n' + name, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    React, useEffect, useRef, useState,
    useTradeDialog: () => ({ current: null }),
    displayCollectionLabel: (value: string) => value,
    responsiveRepImage: (src: string, options: { alt: string }) => ({ src, alt: options.alt }),
  })
}

it('never reads or exposes rep notes in public payloads, bootstrap or rendered v2 and legacy cards', async () => {
  const privateText = 'PRIVATE_REP_ONLY_79d13_DO_NOT_PUBLISH'
  const listing: TradeListingWithDesign = {
    id: 'listing-notes-fixture', rep_id: 'rep-notes-fixture', status: 'available',
    listing_source: 'catalog', rep_notes: privateText, trade_preferences: null,
    listing_photo_url: null, uses_canonical_photo: true, quantity_available: 1,
    listed_at: null, removal_reason: null, deleted_at: null,
    created_at: '2026-11-16T00:00:00Z', updated_at: '2026-11-16T00:00:00Z',
    design: { id: 'design-notes-fixture', item_number: 'ER12345', design_name: 'Public Earrings',
      type_prefix: 'ER', collection: { id: 'collection-fixture', name: 'OG' },
      material: 'Silver', main_stone: null, bp_msrp: null, canonical_photo_url: null },
  }
  const query = { select, eq, in: ids, returns: async () => ({ data: [listing], error: null }) }
  select.mockReturnValue(query); eq.mockReturnValue(query); ids.mockReturnValue(query)
  admin.from.mockReturnValue(query)
  admin.rpc.mockResolvedValue({ data: [{ listing_id: listing.id, net_quantity: 1 }], error: null })
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.invalid')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture-not-a-key')
  try {
    const payload = await loadAmethystTradeBoardPreviewListings({ targeted: true, repId: listing.rep_id })
    expect(payload).toHaveLength(1)
    expect(admin.from).toHaveBeenCalledWith('trade_listings')
    expect(eq).toHaveBeenCalledWith('rep_id', listing.rep_id)
    expect(ids).toHaveBeenCalledWith('id', [listing.id])
    const projection = select.mock.calls[0][0] as string
    expect(projection).not.toMatch(/rep_notes|\*/)
    expect(projection).toContain('trade_preferences')
    expect(JSON.stringify(payload)).not.toContain(privateText)
    expect(payload[0]).not.toHaveProperty('rep_notes')
    expect(payload[0]).not.toHaveProperty('note')
    expect(JSON.stringify(mapTradeListingToAmethystTradeBoardListing({ ...listing, listing_source: 'non_item_number' }))).not.toContain(privateText)
    const bootstrap = buildAmethystTradeBootstrapScript(defaultAmethystTradeTemplateData, payload)
    expect(bootstrap).toContain('AMETHYST_TRADE_BOARD_LISTINGS')
    expect(bootstrap).not.toContain(privateText)
    expect(bootstrap).not.toContain('rep_notes')
    for (const path of ['lib/amethyst/v2/trade.jsx', 'public/amethyst/trade.jsx', 'lib/amethyst/legacy/assets/trade.jsx']) {
      for (const name of ['TradeCard', 'ExpandedCard']) {
        const Component = renderer(path, name)
        // Old cached note aliases are ignored, even if injected independently of the safe payload.
        const html = renderToStaticMarkup(React.createElement(Component, {
          piece: { ...payload[0], note: privateText, rep_notes: privateText },
          onTap: () => {}, onClose: () => {}, onWantThis: () => {},
        }))
        expect(html, path + ':' + name).not.toContain(privateText)
        expect(html).toContain('Public Earrings')
      }
      const Expanded = renderer(path, 'ExpandedCard')
      const publicPreference = mapTradeListingToAmethystTradeBoardListing({ ...listing, trade_preferences: 'PUBLIC_TRADE_PREFERENCE' })
      expect(renderToStaticMarkup(React.createElement(Expanded, { piece: publicPreference, onClose: () => {}, onWantThis: () => {} }))).toContain('PUBLIC_TRADE_PREFERENCE')
      expect(readFileSync(path, 'utf8')).not.toMatch(/piece\.note\b|listing\.note\b/)
    }
    // The public quantity RPC is an IDs/counts-only boundary; it never selected rep_notes.
    const migration = readFileSync('supabase/migrations/20260825017000_finder_quantity_aware_availability.sql', 'utf8')
    const rpc = migration.slice(migration.indexOf('create or replace function public.list_amethyst_public_trade_board_net_v2'))
    expect(rpc).not.toContain('rep_notes')
  } finally { vi.unstubAllEnvs() }
})
