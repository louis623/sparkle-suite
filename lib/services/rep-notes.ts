import { errors } from './errors'

export const REP_NOTES_MAX_CODE_POINTS = 1000

/** Preserve submitted text; reject oversized notes before writing. */
export function validateRepNotes<T extends string | null | undefined>(value: T): T {
  let length = 0
  for (const _point of String(value ?? '')) {
    if (++length > REP_NOTES_MAX_CODE_POINTS) {
      throw errors.INVALID_INPUT('repNotes too long', 'Private notes must be 1000 characters or fewer.')
    }
  }
  return value
}
