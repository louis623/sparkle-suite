/**
 * Initial /join HTML for crawlers.
 * The heading, intro, and team details are the same strings the client paints
 * from the join template. A boot script hides the block before first paint,
 * and the client createRoot call then replaces #root. Visitors never see two
 * copies, and the words do not change when the app mounts.
 */

import type { AmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import type { AmethystJoinTeamMember } from '@/lib/amethyst/join-template-data'
import { buildAmethystJoinTweakDefaults } from '@/lib/amethyst/join-template-data'
import { getPublicRepName, redactPublicRepFullName } from '@/lib/amethyst/public-rep-name'

const TEAM_EYEBROW = 'Meet the team'
const TEAM_TITLE = 'The faces behind the sparkle'
const TEAM_SUB =
  'A growing crew of independent reps doing this their way - full-time, side-hustle, and everywhere in between.'
const SPOT_TITLE = 'This is Your Spot'
const SPOT_SUB =
  'Interested in joining? Review the official details and ask the team lead what support is currently available.'

type JoinCard = {
  lines: string[]
  name: string
}

export type ProductionJoinVisibleCopy = {
  heading: string
  intro: string
  teamIntro: string[]
  cards: JoinCard[]
}

function text(value: string | null | undefined) {
  return (value ?? '').trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sameIdentity(
  member: Pick<AmethystJoinTeamMember, 'name' | 'business'>,
  repName: string,
  businessName: string,
) {
  return (
    text(member.name).toLowerCase() === repName.toLowerCase() &&
    text(member.business).toLowerCase() === businessName.toLowerCase()
  )
}

function cardLines(input: {
  leader?: boolean
  business?: string
  name?: string
  state?: string
  bio?: string
}) {
  const lines: string[] = []
  if (input.leader) lines.push('Team Leader')
  for (const value of [input.business, input.name, input.state, input.bio]) {
    const line = text(value)
    if (line) lines.push(line)
  }
  return lines
}

export function productionJoinVisibleCopy(
  template: AmethystPreviewTemplateData,
): ProductionJoinVisibleCopy {
  const join = template.join
  const tweaks = buildAmethystJoinTweakDefaults(join, template.appearancePreset)
  const repName = getPublicRepName(tweaks.repName)
  const heading = text(tweaks.heroTitle)
  const intro = text(redactPublicRepFullName(tweaks.heroPitch, tweaks.repName))
  const members = join.teamMembers
  if (members.length === 0) {
    return { heading, intro, teamIntro: [], cards: [] }
  }

  const businessName = text(tweaks.businessName)
  const location = [text(tweaks.repCity), text(tweaks.repState)].filter(Boolean).join(', ')
  const hasRecruitingLink =
    tweaks.hasRecruitingLink !== false && Boolean(text(tweaks.bpReferralUrl))
  const cards: JoinCard[] = []

  if (!members.some((member) => sameIdentity(member, repName, businessName))) {
    cards.push({
      name: repName,
      lines: cardLines({
        leader: true,
        business: businessName,
        name: repName,
        state: location || text(tweaks.repState),
      }),
    })
  }

  for (const member of members) {
    const name = text(member.name)
    cards.push({
      name,
      lines: cardLines({
        business: member.business,
        name: member.name,
        state: member.state,
        bio: member.bio,
      }),
    })
  }

  cards.push({
    name: SPOT_TITLE,
    lines: [
      'Open Spot',
      SPOT_TITLE,
      SPOT_SUB,
      hasRecruitingLink ? 'Apply to the Team' : `Ask ${repName} for current details`,
    ],
  })

  return {
    heading,
    intro,
    teamIntro: [TEAM_EYEBROW, TEAM_TITLE, TEAM_SUB],
    cards,
  }
}

export function productionJoinVisibleText(copy: ProductionJoinVisibleCopy) {
  return [copy.heading, copy.intro, ...copy.teamIntro, ...copy.cards.flatMap((card) => card.lines)]
    .filter(Boolean)
    .join(' ')
}

function paragraph(value: string) {
  return `<p>${escapeHtml(value)}</p>`
}

function cardHtml(card: JoinCard) {
  let named = false
  return `<article>${card.lines
    .map((line) => {
      if (!named && line === card.name) {
        named = true
        return `<h3>${escapeHtml(line)}</h3>`
      }
      return paragraph(line)
    })
    .join('')}</article>`
}

export function renderJoinServerIndexBlock(template: AmethystPreviewTemplateData) {
  const copy = productionJoinVisibleCopy(template)
  const team = copy.cards.length
    ? `<section>${paragraph(TEAM_EYEBROW)}<h2>${escapeHtml(TEAM_TITLE)}</h2>${paragraph(TEAM_SUB)}${copy.cards.map(cardHtml).join('')}</section>`
    : ''

  return `<main id="join-server-index"><h1>${escapeHtml(copy.heading)}</h1>${paragraph(copy.intro)}${team}</main>`
}

const JOIN_SERVER_BOOT =
  '<script>(function(){var node=document.getElementById("join-server-index");if(node)node.hidden=true;})();</script>'

export function injectJoinServerIndex(
  html: string,
  template: AmethystPreviewTemplateData,
) {
  if (html.includes('id="join-server-index"')) return html
  const block = renderJoinServerIndexBlock(template)
  const next = `<div id="root">${block}</div>\n${JOIN_SERVER_BOOT}`
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', next)
  }
  if (html.includes('<div id="root">')) {
    return html.replace('<div id="root">', `<div id="root">${block}`)
  }
  return html
}

export function mountReplacesJoinServerIndex(html: string) {
  return html.replace(
    /<div id="root"><main id="join-server-index"[\s\S]*?<\/main><\/div>/,
    '<div id="root"></div>',
  )
}
