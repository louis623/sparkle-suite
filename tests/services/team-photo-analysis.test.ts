import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
import { evaluateTeamPortrait } from '@/lib/services/team-photo-analysis'

const good = { personCount: 1, clear: true, headComplete: true, shouldersVisible: true, heavilyFiltered: false, confidence: .95, face: { x: .35, y: .2, width: .3, height: .3 } }
describe('team portrait quality gate', () => {
  it('does not approve a tiny source just because its face looks clear', () => {
    expect(evaluateTeamPortrait(160, 160, good).quality.status).toBe('needs_better_photo')
  })
  it('accepts a clear complete portrait and returns bounded rectangular framing', () => {
    const r = evaluateTeamPortrait(1000, 1200, good)
    expect(r.quality.status).toBe('ready')
    expect(r.framing.focusY).toBeGreaterThanOrEqual(0)
    expect(r.framing.focusY).toBeLessThanOrEqual(100)
    expect(r.framing.zoom).toBe(1)
  })
  it.each([
    { personCount: 2 }, { clear: false }, { headComplete: false },
    { shouldersVisible: false }, { heavilyFiltered: true },
    { face: { x: .4, y: .4, width: .04, height: .04 } },
  ])('rejects unsuitable source %o before image generation', (change) => {
    expect(evaluateTeamPortrait(1000, 1200, { ...good, ...change }).quality.status).toBe('needs_better_photo')
  })
  it.each([null, {}, { ...good, confidence: .4 }, { ...good, face: { x: .9, y: .9, width: .2, height: .2 } }])('keeps a safe whole-photo preview when detection is uncertain', (v) => {
    const r = evaluateTeamPortrait(1000, 1200, v)
    expect(r.quality.status).toBe('review')
    expect(r.framing.fit).toBe('contain')
  })
})
