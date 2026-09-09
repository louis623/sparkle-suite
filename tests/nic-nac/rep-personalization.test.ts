import { describe, expect, it } from 'vitest'

import {
  buildPersonalizedRepGreeting,
  normalizeRepDisplayName,
  getRepGivenName,
} from '@/lib/nic-nac/core/rep-personalization'

describe('Nic-Nac rep personalization', () => {
  it.each([
    ['Hello', 'Kim Goforth', 'Hello, Kim! How can I help you today?'],
    ['Hi Nic-Nac!', 'Brittany Smith', 'Hello, Brittany! How can I help you today?'],
    ['Hey there', 'Heather Jones', 'Hey, Heather! How can I help you today?'],
    ['Good morning', 'Lindsey Adams', 'Good morning, Lindsey! How can I help you today?'],
  ])('builds a deterministic subject-rep greeting for %s', (latestUserText, repDisplayName, expected) => {
    expect(buildPersonalizedRepGreeting({ latestUserText, repDisplayName })).toBe(expected)
  })

  it('does not intercept a greeting that also asks for Workspace work', () => {
    expect(
      buildPersonalizedRepGreeting({
        latestUserText: 'Hello, can you show me my calendar?',
        repDisplayName: 'Kim Goforth',
      }),
    ).toBeNull()
  })

  it('normalizes profile formatting before deriving the given name', () => {
    expect(normalizeRepDisplayName('  Brittany\n\tSmith  ')).toBe('Brittany Smith')
  })

  it('keeps Workspace welcome names to the first natural name', () => {
    expect(getRepGivenName('Brianna Williams')).toBe('Brianna')
    expect(getRepGivenName('  Brianna\nWilliams  ')).toBe('Brianna')
    expect(getRepGivenName(undefined)).toBe('')
  })
})
