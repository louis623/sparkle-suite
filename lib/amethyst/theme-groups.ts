import {
  THEME_SERIES_LABEL,
  type ThemeSeries,
} from '@/lib/amethyst/skin-cards'
import { seasonsActiveOn, type SeasonTheme } from '@/lib/amethyst/theme-seasons'

export interface GroupedTheme extends SeasonTheme {
  id: string
  label: string
  family: 'holiday' | 'everyday'
  series: ThemeSeries
  visibility: 'community' | 'private'
  selectable?: boolean
}

const HOLIDAY_ORDER: ThemeSeries[] = ['fall', 'thanksgiving', 'halloween', 'christmas']

export interface ThemeSeriesGroup<T> {
  series: ThemeSeries
  label: string
  inSeason: boolean
  themes: T[]
}

export interface ThemePickerGroups<T> {
  current: T | null
  holiday: ThemeSeriesGroup<T>[]
  gems: T[]
  roseGold: T[]
  bombParty: T[]
  general: T[]
  justForYou: T[]
}

function inSeason<T extends GroupedTheme>(theme: T, active: Set<string>) {
  return theme.season !== 'none' && active.has(theme.season)
}

/** Groups offered cards by the family and series stored on each card. */
export function groupThemeCards<T extends GroupedTheme>(
  themes: readonly T[],
  ownedPrivateIds: readonly string[],
  currentId: string | null | undefined,
  date: Date,
): ThemePickerGroups<T> {
  const owned = new Set(ownedPrivateIds)
  const active = new Set(seasonsActiveOn(date))
  const holiday = new Map<ThemeSeries, T[]>()
  const gems: T[] = []
  const roseGold: T[] = []
  const bombParty: T[] = []
  const general: T[] = []
  const justForYou: T[] = []
  for (const theme of themes) {
    if (theme.selectable === false && theme.id !== currentId) continue
    if (theme.visibility === 'private') {
      if (owned.has(theme.id) || theme.id === currentId) justForYou.push(theme)
      continue
    }
    if (theme.family === 'holiday' && HOLIDAY_ORDER.includes(theme.series)) {
      const list = holiday.get(theme.series) ?? []
      list.push(theme)
      holiday.set(theme.series, list)
      continue
    }
    if (theme.series === 'rose_gold') roseGold.push(theme)
    else if (theme.series === 'gems') gems.push(theme)
    else if (theme.series === 'bomb_party') bombParty.push(theme)
    else general.push(theme)
  }
  const holidayGroups = HOLIDAY_ORDER
    .filter((series) => (holiday.get(series)?.length ?? 0) > 0)
    .map((series) => {
      const group = holiday.get(series) ?? []
      return {
        series,
        label: THEME_SERIES_LABEL[series],
        inSeason: group.some((theme) => inSeason(theme, active)),
        themes: group,
      }
    })
    .sort((left, right) => Number(right.inSeason) - Number(left.inSeason))
  return {
    current: themes.find((theme) => theme.id === currentId) ?? null,
    holiday: holidayGroups,
    gems,
    roseGold,
    bombParty,
    general,
    justForYou,
  }
}
