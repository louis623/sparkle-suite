export const DEFAULT_REP_TIME_ZONE = 'America/New_York'

// Store a geographic IANA region, never an abbreviation such as MST or EDT.
// Regions carry daylight-saving rules, while abbreviations are fixed or
// ambiguous and can move a show by an hour.
export const US_REP_TIME_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
] as const

export const US_REP_TIME_ZONE_LABELS: Record<(typeof US_REP_TIME_ZONES)[number], string> = {
  'America/New_York': 'Eastern time',
  'America/Chicago': 'Central time',
  'America/Denver': 'Mountain time',
  'America/Phoenix': 'Arizona time (no daylight saving)',
  'America/Los_Angeles': 'Pacific time',
  'America/Anchorage': 'Alaska time',
  'Pacific/Honolulu': 'Hawaii time',
}

export function assertValidTimeZone(timeZone: string | undefined): string {
  const normalized = timeZone?.trim() || DEFAULT_REP_TIME_ZONE

  if (!normalized.includes('/')) {
    throw new Error('timeZone must be a valid IANA timezone')
  }

  try {
    const canonical = new Intl.DateTimeFormat('en-US', { timeZone: normalized })
      .resolvedOptions().timeZone
    if (!canonical.includes('/')) throw new Error('timeZone must be a valid IANA timezone')
    return canonical
  } catch {
    throw new Error('timeZone must be a valid IANA timezone')
  }
}

export function formatEventTimeForZone(eventTime: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(new Date(eventTime))
}

export function formatEventDateForZone(eventTime: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(eventTime))
}
