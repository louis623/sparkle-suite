import { describe, expect, it } from 'vitest'
import {
  HARD_FAIL_PHRASES,
  REQUIRED_OBSERVED_TOOLS,
  emptyMissingDetailsCopy,
  findHardFailPhrases,
  parseTradeBoardIntakeSmokeCases,
  requireTradeBoardSmokeAssets,
  sha256Bytes,
} from '@/scripts/smoke-nic-nac-trade-board-intake'

describe('Nic-Nac Dance Floor intake smoke script', () => {
  it('exports hard-fail phrases used by the smoke gate', () => {
    expect(HARD_FAIL_PHRASES).toContain("I can't actually add listings")
    expect(HARD_FAIL_PHRASES).toContain(
      'Log into your workspace and add it manually',
    )
    expect(HARD_FAIL_PHRASES).toContain('The photo of the earrings needs')
    expect(HARD_FAIL_PHRASES).toContain('Unboxed')
    expect(HARD_FAIL_PHRASES).toContain('Plain background')
    expect(HARD_FAIL_PHRASES).toContain('Packaging is too prominent')
    expect(HARD_FAIL_PHRASES).toContain('just the earrings')
    expect(HARD_FAIL_PHRASES).toContain('outside or clearly apart')
    expect(HARD_FAIL_PHRASES).toContain('photo URL')
    expect(HARD_FAIL_PHRASES).toContain('direct image link')
    expect(HARD_FAIL_PHRASES).toContain('cloud link')
    expect(HARD_FAIL_PHRASES).toContain('escalate this to Louis')
    expect(HARD_FAIL_PHRASES).toContain('backend validation')
    expect(HARD_FAIL_PHRASES).toContain('not under my control')
    expect(HARD_FAIL_PHRASES).toContain('photo quality settings')
    expect(HARD_FAIL_PHRASES).toContain('escalate this to the team')
    expect(HARD_FAIL_PHRASES).toContain('flag this for Louis')
    expect(HARD_FAIL_PHRASES).toContain('preflight stage')
    expect(HARD_FAIL_PHRASES).toContain(
      'I still need these details before I can save this listing: .',
    )
  })

  it('expects the current Dance Floor resolver and write tools in deployed replays', () => {
    expect(REQUIRED_OBSERVED_TOOLS).toEqual([
      'prepare_trade_board_work',
      'add_listing',
    ])
    expect(REQUIRED_OBSERVED_TOOLS).not.toContain('search_jewelry_database')
  })

  it('parses smoke cases from cases.txt-style content', () => {
    const cases = parseTradeBoardIntakeSmokeCases(`
CASE ER13229_LABEL_ONLY
message=Add ER13229 to my Dance Floor
upload=ER13229-label.jpg
expect=ask_for_jewelry_front_photo
fail=The photo of the earrings needs
END
`)

    expect(cases).toEqual([
      {
        id: 'ER13229_LABEL_ONLY',
        message: 'Add ER13229 to my Dance Floor',
        uploads: ['ER13229-label.jpg'],
        expect: ['ask_for_jewelry_front_photo'],
        fail: ['The photo of the earrings needs'],
      },
    ])
  })

  it('detects hard-fail phrases in assistant text case-insensitively', () => {
    expect(
      findHardFailPhrases(
        'I can escalate this to Louis and have him add it manually on the backend.',
      ),
    ).toEqual([
      'Have Louis add it manually on the backend',
      'escalate this to Louis',
    ])
    expect(findHardFailPhrases('Please use a plain background.')).toEqual([
      'Plain background',
    ])
    expect(
      findHardFailPhrases(
        'Do you have a direct image link or cloud link? The system needs a photo URL.',
      ),
    ).toEqual(['photo URL', 'direct image link', 'cloud link'])
    expect(
      findHardFailPhrases(
        "The system's rejecting the photo at the preflight stage. This is a backend validation that's not under my control. Let me flag this for Louis to check the photo quality settings, or I can escalate this to the team.",
      ),
    ).toEqual([
      'backend validation',
      'not under my control',
      'photo quality settings',
      'escalate this to the team',
      'flag this for Louis',
      'preflight stage',
    ])
  })

  it('fails the empty missing-details colon from the Kelly Workspace chat', () => {
    expect(
      emptyMissingDetailsCopy(
        'I still need these details before I can save this listing: .',
      ),
    ).toBe(true)
    expect(
      findHardFailPhrases(
        'I still need these details before I can save this listing: .',
      ),
    ).toContain('I still need these details before I can save this listing: .')
    expect(
      emptyMissingDetailsCopy(
        'I still need these details before I can save this listing: the item number.',
      ),
    ).toBe(false)
  })

  it('keeps jewelry and label fixture hashes distinct so hero checks cannot collapse them', () => {
    expect(sha256Bytes(Buffer.from('jewelry-front'))).not.toBe(
      sha256Bytes(Buffer.from('label-details')),
    )
  })

  it('reports missing required ER13229 smoke assets before live calls', () => {
    const result = requireTradeBoardSmokeAssets('C:/missing-smoke-assets', {
      existsSync: () => false,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected missing fixture result')
    expect(result.missing).toEqual([
      'ER13229-label.jpg',
      'ER13229-jewelry-boxed-front.jpg',
    ])
  })
})
