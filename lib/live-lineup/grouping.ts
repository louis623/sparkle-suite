/** Shared display projection. Never use groups as mutation targets. */
const normalize = (value: string) => value.trim().replace(/\s+/gu, ' ').normalize('NFC')
const identityPart = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 100 && !/[\p{Cc}\p{Cf}]/u.test(value)

/** Never return a whole surname or cut a surrogate/combining grapheme. */
export function publicSurnameInitial(surname: string, firstName: string): string | null {
  const usable = normalize(surname)
  const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(usable)[Symbol.iterator]().next().value?.segment
  if (!first || first === usable || first.length > 8 || firstName.length + 1 + first.length > 108 || !/^[\p{L}\p{N}][\p{L}\p{N}\p{M}]*$/u.test(first)) return null
  return first
}

export type LineupGroupingEntry = { id: string; name: string; lastName?: string; identityEligible?: boolean; identityConflict?: boolean }

export function groupLineupEntries(entries: LineupGroupingEntry[]) {
  const rows = entries.map(entry => {
    const first = normalize(entry.name)
    const surname = entry.identityEligible === true && !entry.identityConflict && identityPart(entry.lastName) ? normalize(entry.lastName) : null
    return { id: entry.id, first, surname, tuple: surname ? JSON.stringify([first, surname]) : null }
  })
  const collisions = new Map<string, Set<string>>()
  for (const row of rows) {
    const identities = collisions.get(row.first) || new Set<string>()
    identities.add(row.tuple || `unresolved:${row.id}`)
    collisions.set(row.first, identities)
  }
  const groups: { tuple: string | null; members: string[]; name: string; token: string }[] = []
  for (const row of rows) {
    const initial = row.surname && (collisions.get(row.first)?.size || 0) > 1 ? publicSurnameInitial(row.surname, row.first) : null
    const name = initial ? `${row.first} ${initial}` : row.first
    const previous = groups.at(-1)
    if (row.tuple && previous?.tuple === row.tuple) previous.members.push(row.id)
    else groups.push({ tuple: row.tuple, members: [row.id], name, token: '' })
  }
  return groups
}
