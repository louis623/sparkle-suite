export type ThemeSeason = 'christmas' | 'thanksgiving' | 'halloween' | 'none'

export const THEME_SEASON_TAG: Record<Exclude<ThemeSeason, 'none'>, string> = {
  halloween: 'Halloween',
  thanksgiving: 'Thanksgiving',
  christmas: 'Christmas',
}

export interface SeasonTheme {
  id: string
  season: ThemeSeason
}

export interface SeasonGroups<T extends SeasonTheme> {
  inSeason: T[]
  /** Everyday themes, then out-of-season seasonal themes. The saved theme is first when it lives here. */
  yearRound: T[]
  /** Seasonal themes that are not in season, in catalog order. */
  outOfSeason: T[]
}

interface EasternDate {
  year: number
  month: number
  day: number
}

/** Calendar date in America/New_York. Month is 1–12. */
export function easternDateParts(date: Date): EasternDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day') }
}

/** Halloween Oct 1–31, Thanksgiving Nov 1–30, Christmas Nov 15–Dec 31. Nov 15–30 includes both. */
export function seasonsActiveOn(date: Date): Array<Exclude<ThemeSeason, 'none'>> {
  const { month, day } = easternDateParts(date)
  const active: Array<Exclude<ThemeSeason, 'none'>> = []
  if (month === 10 && day >= 1 && day <= 31) active.push('halloween')
  if (month === 11 && day >= 1 && day <= 30) active.push('thanksgiving')
  if ((month === 11 && day >= 15) || month === 12) active.push('christmas')
  return active
}

/** Drop a repeated id. A saved theme that is already offered must not be appended again. */
export function uniqueThemes<T extends SeasonTheme>(themes: readonly T[]): T[] {
  const seen = new Set<string>()
  const unique: T[] = []
  for (const theme of themes) {
    if (seen.has(theme.id)) continue
    seen.add(theme.id)
    unique.push(theme)
  }
  return unique
}

function hoistSaved<T extends SeasonTheme>(themes: T[], savedId: string | null | undefined) {
  if (!savedId) return themes
  const index = themes.findIndex((theme) => theme.id === savedId)
  if (index <= 0) return themes
  return [themes[index], ...themes.slice(0, index), ...themes.slice(index + 1)]
}

export function groupThemesBySeason<T extends SeasonTheme>(
  themes: readonly T[],
  savedId: string | null | undefined,
  date: Date,
): SeasonGroups<T> {
  const active = new Set(seasonsActiveOn(date))
  const inSeason: T[] = []
  const everyday: T[] = []
  const outOfSeason: T[] = []
  for (const theme of uniqueThemes(themes)) {
    if (theme.season !== 'none' && active.has(theme.season)) inSeason.push(theme)
    else if (theme.season === 'none') everyday.push(theme)
    else outOfSeason.push(theme)
  }
  return {
    inSeason: hoistSaved(inSeason, savedId),
    yearRound: hoistSaved([...everyday, ...outOfSeason], savedId),
    outOfSeason,
  }
}

export function studioThemes<T extends SeasonTheme>(
  offered: readonly T[],
  saved: T,
  date: Date,
) {
  const offeredOnce = uniqueThemes(offered)
  const savedOffered = offeredOnce.some((theme) => theme.id === saved.id)
  const themes = savedOffered ? offeredOnce : [...offeredOnce, saved]
  return {
    savedOffered,
    ...groupThemesBySeason(themes, saved.id, date),
  }
}
