import { describe, expect, it } from 'vitest'
import { photoPolishPrompt, teamPhotoSourcePath } from '@/lib/services/team-photo-polish-policy'
import { getAmethystSkinCard } from '@/lib/amethyst/skin-cards'

const rep = '11111111-1111-4111-8111-111111111111'
const root = 'https://storage.example.test'
const prefix = `${root}/storage/v1/object/public/public-site-media/${rep}/profile/`

describe('team photo input boundary', () => {
  it('accepts only owned uploaded originals and rejects external, traversing, or generated sources', () => {
    expect(teamPhotoSourcePath(`${prefix}original-123.jpg`, rep, root)).toBe(`${rep}/profile/original-123.jpg`)
    for (const value of [
      'https://attacker.test/photo.jpg', `${prefix}../other.jpg`, `${prefix}%2e%2e%2fother.jpg`,
      `${prefix}original.jpg?token=foo`, `${prefix}original.jpg#x`, `${prefix}polished-123.jpg`,
      `${root}/storage/v1/object/public/public-site-media/other/profile/face.jpg`,
      `${prefix}original.svg`, 'file:///tmp/photo.jpg',
    ]) expect(() => teamPhotoSourcePath(value, rep, root)).toThrow('Upload the original')
  })

  it('uses each registered skin palette while preserving the real person', () => {
    const blackDiamond = photoPolishPrompt(getAmethystSkinCard('black_diamond'))
    const amethyst = photoPolishPrompt(getAmethystSkinCard('amethyst'))
    expect(blackDiamond).toContain('#d4af37')
    expect(amethyst).toContain('#5C0EFF')
    expect(blackDiamond).toContain('preserve face geometry, skin tone, age, body shape')
    expect(blackDiamond).toContain('No beauty retouch')
  })
})
