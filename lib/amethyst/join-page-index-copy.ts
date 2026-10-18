/**
 * Distinct, server-rendered copy for a rep's public /join page.
 * Wording changes with the data that exists. It does not use randomness.
 */

export type PublicShowSlot = {
  eventTime: string
  timeZone?: string | null
  status?: string | null
}

export type JoinPageIndexInput = {
  businessName?: string | null
  teamName?: string | null
  city?: string | null
  state?: string | null
  customIntro?: string | null
  supportNote?: string | null
  showSchedule?: string | null
  tickerText?: string | null
  shows?: PublicShowSlot[]
  now?: Date
}

export type JoinPageIndexCopy = {
  title: string
  description: string
  h1: string
  intro: string
  introKind: 'custom' | 'template'
  location: string
  showSchedule: string
  teamLeader: string
  support: string
}

const PLACEHOLDER_INTRO = [
  /will share more about/i,
  /will appear here after/i,
  /customer details, show style/i,
  /share how you got started/i,
  /nic-nac can rewrite this/i,
  /add a final paragraph/i,
  /^explore what it takes to join\b/i,
  /^learn what it takes to become an independent rep\b/i,
  /^learn about the independent rep opportunity\b/i,
  /^turn your passion for jewelry\b/i,
  /^joining a team should feel personal\b/i,
  /^joining a team is a personal decision\b/i,
  /^you deserve more than a generic recruiting checklist\b/i,
]

const DAY_LABELS: Record<string, string> = {
  m: 'Mondays',
  mon: 'Mondays',
  monday: 'Mondays',
  mondays: 'Mondays',
  t: 'Tuesdays',
  tue: 'Tuesdays',
  tues: 'Tuesdays',
  tuesday: 'Tuesdays',
  tuesdays: 'Tuesdays',
  w: 'Wednesdays',
  wed: 'Wednesdays',
  wednesday: 'Wednesdays',
  wednesdays: 'Wednesdays',
  r: 'Thursdays',
  thu: 'Thursdays',
  thur: 'Thursdays',
  thurs: 'Thursdays',
  thursday: 'Thursdays',
  thursdays: 'Thursdays',
  f: 'Fridays',
  fri: 'Fridays',
  friday: 'Fridays',
  fridays: 'Fridays',
  sa: 'Saturdays',
  sat: 'Saturdays',
  saturday: 'Saturdays',
  saturdays: 'Saturdays',
  su: 'Sundays',
  sun: 'Sundays',
  sunday: 'Sundays',
  sundays: 'Sundays',
}

function cleanCopy(value: string | null | undefined) {
  return (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STREET_ADDRESS =
  /\b(?:street|avenue|road|boulevard|drive|lane|court|terrace|suite|apartment|p\.?o\.?\s*box)\b/i

function cleanLocationPart(value: string | null | undefined) {
  const text = cleanCopy(value).replace(/\b\d{5}(?:-\d{4})?\b/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !/\d/.test(part) && !STREET_ADDRESS.test(part))
    .join(', ')
}

export function publicLocationParts(
  city?: string | null,
  state?: string | null,
) {
  return {
    city: cleanLocationPart(city),
    state: cleanLocationPart(state),
  }
}

export function formatPublicLocation(
  city?: string | null,
  state?: string | null,
) {
  const { city: cityText, state: stateText } = publicLocationParts(city, state)
  if (cityText && stateText) return `${cityText}, ${stateText}`
  return cityText || stateText
}

function joinList(items: string[]) {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function dayLabel(token: string) {
  return DAY_LABELS[token.trim().toLowerCase()] ?? ''
}

function unique(items: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    if (!item || seen.has(item)) continue
    seen.add(item)
    result.push(item)
  }
  return result
}

function parseScheduleClause(text: string) {
  const slash = text.match(
    /\b((?:mon(?:day)?s?|tues(?:day)?s?|tue|wed(?:nesday)?s?|thur(?:s(?:day)?)?s?|thu|fri(?:day)?s?|sat(?:urday)?s?|sun(?:day)?s?|sa|su|m|t|w|r|f)(?:\/(?:mon(?:day)?s?|tues(?:day)?s?|tue|wed(?:nesday)?s?|thur(?:s(?:day)?)?s?|thu|fri(?:day)?s?|sat(?:urday)?s?|sun(?:day)?s?|sa|su|m|t|w|r|f))+)\b/i,
  )
  const slashDays = slash
    ? unique(slash[1].split('/').map(dayLabel))
    : []
  const standalone = unique(
    Array.from(
      text.matchAll(
        /\b(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b/gi,
      ),
      (match) => dayLabel(match[1]),
    ),
  )
  const days = slashDays.length > 0 ? slashDays : standalone
  const timeMatch = text.match(
    /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b(?:\s*(ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|PT|PST|PDT|AKT|HST|AZ))?/i,
  )
  if (days.length === 0) return ''
  if (slashDays.length === 0 && !/\blive\b/i.test(text) && !timeMatch) return ''
  const time = timeMatch
    ? `at ${Number(timeMatch[1])}:${timeMatch[2] ?? '00'} ${timeMatch[3].toUpperCase()}${
        timeMatch[4] ? ` ${timeMatch[4].toUpperCase()}` : ''
      }`
    : ''

  return `${joinList(days)}${time ? ` ${time}` : ''}`
}

export function extractScheduleFromText(value: string | null | undefined) {
  const text = cleanCopy(value)
  if (!text) return ''

  const clauses = text.includes('|')
    ? text.split('|').map((clause) => clause.trim()).filter(Boolean)
    : [text]
  for (const clause of clauses) {
    const schedule = parseScheduleClause(clause)
    if (schedule) return schedule
  }
  return ''
}

export function summarizePublicShowSchedule(
  shows: PublicShowSlot[] | null | undefined,
  now = new Date(),
) {
  const labels = (shows ?? []).flatMap((show) => {
    if ((show.status ?? 'scheduled') !== 'scheduled') return []
    const time = Date.parse(show.eventTime)
    if (!Number.isFinite(time) || time < now.getTime()) return []
    const zone = show.timeZone?.trim() || 'America/New_York'
    try {
      const date = new Date(time)
      const weekday = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        timeZone: zone,
      }).format(date)
      const clock = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: zone,
        timeZoneName: 'short',
      }).format(date)
      return [{ weekday: `${weekday}s`, clock }]
    } catch {
      return []
    }
  })
  if (labels.length === 0) return ''

  const days = unique(labels.map((label) => label.weekday))
  const clocks = unique(labels.map((label) => label.clock))
  return clocks.length === 1
    ? `${joinList(days)} at ${clocks[0]}`
    : joinList(days)
}

export function resolvePublicShowSchedule(input: {
  showSchedule?: string | null
  tickerText?: string | null
  shows?: PublicShowSlot[]
  now?: Date
}) {
  return (
    summarizePublicShowSchedule(input.shows, input.now) ||
    cleanCopy(input.showSchedule) ||
    extractScheduleFromText(input.tickerText)
  )
}

export function readCustomJoinIntro(value: string | null | undefined) {
  const text = cleanCopy(value)
  if (!text) return ''
  if (PLACEHOLDER_INTRO.some((pattern) => pattern.test(text))) return ''
  return text.slice(0, 1600)
}

function readCustomSupport(value: string | null | undefined, intro: string) {
  const text = cleanCopy(value)
  if (!text || text === intro) return ''
  if (/^ask\b/i.test(text)) return ''
  if (/support differs by team/i.test(text)) return ''
  if (/support can change/i.test(text)) return ''
  if (/what support is currently available/i.test(text)) return ''
  if (/\btrade\b/i.test(text)) return ''
  return text.slice(0, 800)
}

function firstSentence(value: string) {
  const sentence = value.split(/(?<=\.)\s/)[0]?.trim() || value
  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}...` : sentence
}

function templatedIntro(input: {
  businessName: string
  teamName: string
  location: string
  showSchedule: string
}) {
  const { businessName, teamName, location, showSchedule } = input
  const distinctTeam =
    Boolean(teamName) && teamName.toLowerCase() !== businessName.toLowerCase()
  const place = location ? ` in ${location}` : ''

  if (location && showSchedule && distinctTeam) {
    return `${businessName}${place} hosts live jewelry reveals on ${showSchedule}. The rep leads ${teamName} and answers questions from people who want to join that team.`
  }
  if (location && showSchedule) {
    return `${businessName} in ${location} hosts live jewelry reveals on ${showSchedule}. The rep can explain what joining the team looks like.`
  }
  if (showSchedule && distinctTeam) {
    return `${businessName} leads ${teamName} and hosts live jewelry reveals on ${showSchedule}. The rep is the person to ask about joining.`
  }
  if (location && distinctTeam) {
    return `${businessName} in ${location} leads ${teamName}. The rep shares how the team works with new teammates.`
  }
  if (showSchedule) {
    return `${businessName} hosts live jewelry reveals on ${showSchedule}. The rep can explain what joining the team involves.`
  }
  if (location) {
    return `${businessName} in ${location} runs live jewelry reveals. The rep can explain what joining the team involves.`
  }
  if (distinctTeam) {
    return `${businessName} leads ${teamName}. The rep can explain what joining that team involves.`
  }
  return `${businessName} runs live jewelry reveals. The rep can explain what joining the team involves.`
}

export function buildJoinPageIndexCopy(
  input: JoinPageIndexInput,
): JoinPageIndexCopy {
  const businessName = cleanCopy(input.businessName) || 'This show'
  const teamName = cleanCopy(input.teamName) || businessName
  const location = formatPublicLocation(input.city, input.state)
  const showSchedule = resolvePublicShowSchedule(input)
  const customIntro = readCustomJoinIntro(input.customIntro)
  const intro =
    customIntro ||
    templatedIntro({ businessName, teamName, location, showSchedule })
  const distinctTeam = teamName.toLowerCase() !== businessName.toLowerCase()
  const place = location ? ` in ${location}` : ''
  const title = distinctTeam
    ? `${businessName}${place} — Join ${teamName}`
    : `${businessName}${place} — Join the Team`
  const h1 = distinctTeam
    ? `Join ${teamName} with ${businessName}${place}`
    : `Join ${businessName}${place}`
  const scheduleBit = showSchedule ? ` Live shows run ${showSchedule}.` : ''
  const teamBit = distinctTeam ? ` ${businessName} leads ${teamName}.` : ''
  const introBit = customIntro ? ` ${firstSentence(customIntro)}` : ''
  const description = `${businessName}${place} join page for live jewelry reveals.${teamBit}${scheduleBit}${introBit}`
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320)
  const support = readCustomSupport(input.supportNote, intro)

  return {
    title,
    description,
    h1,
    intro,
    introKind: customIntro ? 'custom' : 'template',
    location,
    showSchedule,
    teamLeader: cleanCopy(input.businessName),
    support,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderJoinIndexBlock(copy: Pick<
  JoinPageIndexCopy,
  'h1' | 'intro' | 'teamLeader' | 'support'
> & {
  repName?: string
  location?: string
  showSchedule?: string
}) {
  const details: string[] = []
  if (copy.teamLeader) {
    details.push(`<p>Team leader: ${escapeHtml(copy.teamLeader)}.</p>`)
  }
  if (copy.support) {
    details.push(
      `<p>How the rep supports new teammates: ${escapeHtml(copy.support)}</p>`,
    )
  }
  const team = details.length
    ? `<section><h2>Team details</h2>${details.join('')}</section>`
    : ''
  const repName = cleanCopy(copy.repName)
  const location = cleanCopy(copy.location)
  const business = cleanCopy(copy.teamLeader)
  const identity = repName
    ? `<p>${escapeHtml(repName)} is the rep for ${escapeHtml(business || 'this show')}${
        location ? ` in ${escapeHtml(location)}` : ''
      }.</p>`
    : ''
  const schedule = cleanCopy(copy.showSchedule)
  const scheduleLine = schedule
    ? `<p>Live shows run ${escapeHtml(schedule)}.</p>`
    : ''

  return `<main class="join-index"><h1>${escapeHtml(copy.h1)}</h1><p>${escapeHtml(copy.intro)}</p>${identity}${scheduleLine}${team}</main>`
}

export function injectRootBlock(html: string, block: string) {
  if (!block) return html
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', `<div id="root">${block}</div>`)
  }
  if (html.includes('<div id="root">')) {
    return html.replace('<div id="root">', `<div id="root">${block}`)
  }
  return html
}

export function injectJoinIndexDocument(
  html: string,
  copy: Parameters<typeof renderJoinIndexBlock>[0],
) {
  return injectRootBlock(html, renderJoinIndexBlock(copy))
}
