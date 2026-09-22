import { describe, expect, it } from 'vitest'
import { normalizeBirthday } from '@/lib/services/birthdays'

describe('birthday month/day normalization', () => {
  it('accepts real month/day values including February 29', () => {
    expect(normalizeBirthday('02-29')).toEqual({ month: 2, day: 29 })
    expect(normalizeBirthday('')).toBeNull()
  })

  it.each(['1990-09-22', '09/22/1990', '02-30', '13-01'])('rejects %s', (value) => {
    expect(() => normalizeBirthday(value)).toThrow()
  })
})
