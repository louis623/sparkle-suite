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
import {
  joinFaqCopy,
  joinFinalCtaCopy,
  joinWhyCopy,
  type JoinSectionRuntimeContext,
} from '@/lib/amethyst/join-server-sections'

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

type JoinBenefit = {
  title: string
  desc: string
}

type JoinFaqItem = {
  q: string
  a: string
}

export type ProductionJoinWhyCopy = {
  eyebrow: string
  heading: string
  sub: string
  benefits: JoinBenefit[]
  actions: string[]
}

export type ProductionJoinFaqCopy = {
  eyebrow: string
  heading: string
  sub: string
  items: JoinFaqItem[]
  notes: string[]
}

export type ProductionJoinFinalCopy = {
  heading: string
  pitch: string
  note: string
  action: string
}

export type ProductionJoinVisibleCopy = {
  heading: string
  intro: string
  teamIntro: string[]
  cards: JoinCard[]
  why: ProductionJoinWhyCopy | null
  faq: ProductionJoinFaqCopy | null
  final: ProductionJoinFinalCopy | null
}

/**
 * The same runtime context the join bootstrap script hands the client
 * (window.AMETHYST_RUNTIME_CONTEXT). Personal recruiting copy depends on it.
 */
export type JoinServerRuntimeContext = JoinSectionRuntimeContext

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
  runtimeContext: JoinServerRuntimeContext = { targeted: false },
): ProductionJoinVisibleCopy {
  const join = template.join
  const tweaks = buildAmethystJoinTweakDefaults(join, template.appearancePreset)
  const repName = getPublicRepName(tweaks.repName)
  const heading = text(tweaks.heroTitle)
  const intro = text(redactPublicRepFullName(tweaks.heroPitch, tweaks.repName))
  const location = [text(tweaks.repCity), text(tweaks.repState)].filter(Boolean).join(', ')
  const hasRecruitingLink =
    tweaks.hasRecruitingLink !== false && Boolean(text(tweaks.bpReferralUrl))
  const recruitingEnabled = hasRecruitingLink && text(tweaks.bpReferralUrl) !== '#'
  // join.jsx falls back to lowercase "your rep" when no rep name is set.
  const sectionRepName = getPublicRepName(tweaks.repName, 'your rep')
  const teamName = tweaks.teamName
  const sections = {
    why: tweaks.showWhy
      ? joinWhyCopy({
          join,
          context: runtimeContext,
          teamName,
          repName: sectionRepName,
          locationLabel: location,
          recruitingEnabled,
        })
      : null,
    faq: tweaks.showFaq
      ? joinFaqCopy({
          join,
          context: runtimeContext,
          teamName,
          repName: sectionRepName,
          locationLabel: location,
        })
      : null,
    final: tweaks.showFinalCta
      ? joinFinalCtaCopy({
          join,
          teamName,
          finalPitch: redactPublicRepFullName(tweaks.finalPitch, tweaks.repName),
          repName: sectionRepName,
          locationLabel: location,
          hasRecruitingLink,
          recruitingEnabled,
        })
      : null,
  }
  const members = join.teamMembers
  if (members.length === 0) {
    return { heading, intro, teamIntro: [], cards: [], ...sections }
  }

  const businessName = text(tweaks.businessName)
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
      recruitingEnabled ? 'Apply to the Team' : `Ask ${repName} for current details`,
    ],
  })

  return {
    heading,
    intro,
    teamIntro: [TEAM_EYEBROW, TEAM_TITLE, TEAM_SUB],
    cards,
    ...sections,
  }
}

function whyText(why: ProductionJoinWhyCopy | null) {
  if (!why) return []
  return [
    why.eyebrow,
    why.heading,
    why.sub,
    ...why.benefits.flatMap((benefit) => [benefit.title, benefit.desc]),
    ...why.actions,
  ]
}

function faqText(faq: ProductionJoinFaqCopy | null) {
  if (!faq) return []
  return [
    faq.eyebrow,
    faq.heading,
    faq.sub,
    ...faq.items.flatMap((item) => [item.q, item.a]),
    ...faq.notes,
  ]
}

function finalText(final: ProductionJoinFinalCopy | null) {
  if (!final) return []
  return [final.heading, final.pitch, final.note, final.action]
}

export function productionJoinVisibleText(copy: ProductionJoinVisibleCopy) {
  return [
    copy.heading,
    copy.intro,
    ...copy.teamIntro,
    ...copy.cards.flatMap((card) => card.lines),
    ...whyText(copy.why),
    ...faqText(copy.faq),
    ...finalText(copy.final),
  ]
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

function whyHtml(why: ProductionJoinWhyCopy | null) {
  if (!why) return ''
  const benefits = why.benefits
    .map((benefit) => `<article><h3>${escapeHtml(benefit.title)}</h3>${paragraph(benefit.desc)}</article>`)
    .join('')
  return `<section>${paragraph(why.eyebrow)}<h2>${escapeHtml(why.heading)}</h2>${paragraph(why.sub)}${benefits}${why.actions.map(paragraph).join('')}</section>`
}

function faqHtml(faq: ProductionJoinFaqCopy | null) {
  if (!faq) return ''
  const items = faq.items
    .map((item) => `<article><h3>${escapeHtml(item.q)}</h3>${paragraph(item.a)}</article>`)
    .join('')
  return `<section>${paragraph(faq.eyebrow)}<h2>${escapeHtml(faq.heading)}</h2>${paragraph(faq.sub)}${items}${faq.notes.map(paragraph).join('')}</section>`
}

function finalHtml(final: ProductionJoinFinalCopy | null) {
  if (!final) return ''
  return `<section><h2>${escapeHtml(final.heading)}</h2>${[final.pitch, final.note, final.action]
    .filter(Boolean)
    .map(paragraph)
    .join('')}</section>`
}

export function renderJoinServerIndexBlock(
  template: AmethystPreviewTemplateData,
  runtimeContext: JoinServerRuntimeContext = { targeted: false },
) {
  const copy = productionJoinVisibleCopy(template, runtimeContext)
  const team = copy.cards.length
    ? `<section>${paragraph(TEAM_EYEBROW)}<h2>${escapeHtml(TEAM_TITLE)}</h2>${paragraph(TEAM_SUB)}${copy.cards.map(cardHtml).join('')}</section>`
    : ''

  return `<main id="join-server-index"><h1>${escapeHtml(copy.heading)}</h1>${paragraph(copy.intro)}${team}${whyHtml(copy.why)}${faqHtml(copy.faq)}${finalHtml(copy.final)}</main>`
}

const JOIN_SERVER_BOOT =
  '<script>(function(){var node=document.getElementById("join-server-index");if(node)node.hidden=true;})();</script>'

export function injectJoinServerIndex(
  html: string,
  template: AmethystPreviewTemplateData,
  runtimeContext: JoinServerRuntimeContext = { targeted: false },
) {
  if (html.includes('id="join-server-index"')) return html
  const block = renderJoinServerIndexBlock(template, runtimeContext)
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
