import { describe, expect, it } from 'vitest'

import {
  findMatchingLeadRosterMember,
  joinLeadIdentityMatches,
  resolveJoinCardImageUrl,
  resolveLeadCardPhotoUrl,
} from '@/lib/amethyst/join-lead-card'

describe('Join Team lead-card photo identity', () => {
  it('matches a roster member to the lead by name and business', () => {
    const members = [
      { displayName: 'Dara', businessName: 'Dara Sparkle', photoUrl: '' },
      { displayName: 'Kelly', businessName: 'Sparkly Butterflies', photoUrl: '' },
    ]

    expect(
      findMatchingLeadRosterMember(members, {
        name: 'Kelly',
        business: 'Sparkly Butterflies',
      })?.displayName,
    ).toBe('Kelly')
    expect(
      joinLeadIdentityMatches(
        { name: 'Kelly', business: 'Sparkly Butterflies' },
        { name: 'kelly', business: 'sparkly butterflies' },
      ),
    ).toBe(true)
  })

  it('prefers a saved member photo, then the lead profile photo, then no image', () => {
    expect(
      resolveLeadCardPhotoUrl(
        'https://cdn.example.com/profile.jpg',
        'https://cdn.example.com/member.jpg',
      ),
    ).toBe('https://cdn.example.com/member.jpg')
    expect(resolveLeadCardPhotoUrl('https://cdn.example.com/profile.jpg', '')).toBe(
      'https://cdn.example.com/profile.jpg',
    )
    expect(resolveLeadCardPhotoUrl('', '')).toBe('')
    expect(
      resolveJoinCardImageUrl('', 'https://cdn.example.com/profile.jpg', true),
    ).toBe('https://cdn.example.com/profile.jpg')
    expect(
      resolveJoinCardImageUrl('', 'https://cdn.example.com/profile.jpg', false),
    ).toBeUndefined()
  })
})
