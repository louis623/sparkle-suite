/**
 * Public /join index metadata applied after the locked preview mapper.
 * The visible heading and intro stay exactly as that mapper produced them.
 * Only the document title, meta description, and roster location used by
 * structured data are added here.
 */

import type { AmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import type { AmethystJoinTeamMember } from '@/lib/amethyst/join-template-data'
import { getPublicRepName } from '@/lib/amethyst/public-rep-name'
import {
  buildJoinPageIndexCopy,
  formatPublicLocation,
  publicLocationParts,
  readCustomJoinIntro,
  summarizePublicShowSchedule,
  type PublicShowSlot,
} from '@/lib/amethyst/join-page-index-copy'

function cleanRosterState(value: string | undefined) {
  return formatPublicLocation('', value)
}

function splitRosterLocation(value: string | undefined) {
  const parts = cleanRosterState(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    return { city: parts.slice(0, -1).join(', '), state: parts[parts.length - 1] }
  }
  return { city: '', state: parts[0] ?? '' }
}

function findJoinOwnerMember(
  members: AmethystJoinTeamMember[],
  businessName: string,
  repName: string,
) {
  const business = businessName.trim().toLowerCase()
  const name = getPublicRepName(repName).trim().toLowerCase()
  const visible = members.filter((member) => member.isVisible !== false)
  return (
    visible.find((member) => member.business.trim().toLowerCase() === business) ||
    visible.find((member) => member.name.trim().toLowerCase() === name) ||
    null
  )
}

function homepageIntro(template: AmethystPreviewTemplateData) {
  return (template.homepage.aboutParagraphs ?? [])
    .map((paragraph) => readCustomJoinIntro(paragraph))
    .filter(Boolean)
    .join(' ')
}

export function applyPublicJoinIndex(
  template: AmethystPreviewTemplateData,
  showSchedule = '',
): AmethystPreviewTemplateData {
  const join = template.join
  const owner = findJoinOwnerMember(join.teamMembers, join.businessName, join.repName)
  const roster = splitRosterLocation(owner?.state)
  const location = publicLocationParts(roster.city, roster.state)
  const about = homepageIntro(template)
  const bio = readCustomJoinIntro(owner?.bio)
  const copy = buildJoinPageIndexCopy({
    businessName: join.businessName,
    teamName: join.teamName,
    city: location.city,
    state: location.state,
    customIntro: about || bio,
    supportNote: about && bio && about !== bio ? bio : join.faqAnswers.support,
    showSchedule,
    tickerText: join.tickerTopText,
  })

  return {
    ...template,
    join: {
      ...join,
      indexTitle: copy.title,
      indexDescription: copy.description,
      indexCity: location.city,
      indexState: location.state,
    },
  }
}

export async function loadUpcomingShowSchedule(repId: string | null | undefined) {
  const id = repId?.trim()
  if (!id || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return ''
  }
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('calendar_events')
      .select('event_time, time_zone, status')
      .eq('rep_id', id)
      .eq('status', 'scheduled')
      .gte('event_time', new Date().toISOString())
      .order('event_time', { ascending: true })
      .limit(24)
    if (error || !data) return ''
    const shows: PublicShowSlot[] = data.flatMap((row) =>
      row.event_time
        ? [{
            eventTime: row.event_time,
            timeZone: row.time_zone,
            status: row.status,
          }]
        : [],
    )
    return summarizePublicShowSchedule(shows)
  } catch {
    return ''
  }
}

export async function indexPublicJoinTemplate(
  template: AmethystPreviewTemplateData,
  options: { repId?: string | null } = {},
) {
  const showSchedule = await loadUpcomingShowSchedule(options.repId)
  return applyPublicJoinIndex(template, showSchedule)
}
