/**
 * Server-rendered main copy for a rep's public pages.
 * The Live Lineup stays in the client runtime.
 */

import type { AmethystPreviewTemplateData } from '@/lib/amethyst/preview-template-data'
import { getPublicRepName } from '@/lib/amethyst/public-rep-name'
import {
  extractScheduleFromText,
  formatPublicLocation,
  injectRootBlock,
  readCustomJoinIntro,
} from '@/lib/amethyst/join-page-index-copy'
import { defaultAmethystHomepageTemplateData } from '@/lib/amethyst/homepage-template-data'

export type PublicIndexRecipe = {
  title?: string | null
  description?: string | null
}

const BANNED_COPY =
  /\b(she|her|hers|he|him|his|they|them|their|theirs|trade|commission|commissions|earnings|income)\b|Live Queue|\$\d/i

const GENERIC_HEADLINE = defaultAmethystHomepageTemplateData.heroHeadline

function clean(value: string | null | undefined) {
  return (value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function keepPublicCopy(value: string | null | undefined) {
  const text = clean(value)
  if (!text) return ''
  const sentences = text.split(/(?<=\.)\s+/).map((sentence) => sentence.trim())
  return sentences.filter((sentence) => sentence && !BANNED_COPY.test(sentence)).join(' ')
}

function paragraph(value: string) {
  const text = keepPublicCopy(value)
  return text ? `<p>${escapeHtml(text)}</p>` : ''
}

function resolveSchedule(templateData: AmethystPreviewTemplateData) {
  const join = templateData.join
  const homepage = templateData.homepage
  const schedule =
    clean(join?.publicShowSchedule) ||
    extractScheduleFromText(join?.tickerTopText) ||
    extractScheduleFromText(homepage?.tickerTopText)
  return /live schedule coming soon/i.test(schedule) ? '' : schedule
}

function resolveIntro(templateData: AmethystPreviewTemplateData) {
  const homepage = templateData.homepage
  const about = (homepage?.aboutParagraphs ?? [])
    .map((paragraphText) => keepPublicCopy(readCustomJoinIntro(paragraphText)))
    .filter(Boolean)
    .join(' ')
  return about.slice(0, 1600)
}

function resolveHeroLine(templateData: AmethystPreviewTemplateData) {
  const heroSub = keepPublicCopy(readCustomJoinIntro(templateData.homepage?.heroSub))
  if (!heroSub || /^i(?:'m| am)\b/i.test(heroSub)) return ''
  return heroSub.slice(0, 320)
}

export function pageFacts(templateData: AmethystPreviewTemplateData) {
  const businessName = clean(templateData.homepage?.businessName) || 'This show'
  const repName = getPublicRepName(templateData.homepage?.repName, '')
  const location = formatPublicLocation(
    templateData.join?.indexCity,
    templateData.join?.indexState,
  )
  const showSchedule = resolveSchedule(templateData)
  const place = location ? ` in ${location}` : ''
  const intro =
    resolveIntro(templateData) ||
    `${businessName}${place} hosts live jewelry reveals${
      showSchedule ? ` on ${showSchedule}` : ''
    }.`
  const heroLine = resolveHeroLine(templateData)
  const identity = repName
    ? `${repName} is the rep for ${businessName}${place}.`
    : `The rep hosts ${businessName}${place}.`
  const headline = clean(templateData.homepage?.heroHeadline)
  const customHeadline =
    headline &&
    headline !== businessName &&
    headline !== GENERIC_HEADLINE &&
    keepPublicCopy(headline) === headline
      ? headline
      : ''

  return {
    businessName,
    repName,
    location,
    place,
    showSchedule,
    intro,
    heroLine,
    identity,
    customHeadline,
  }
}

function scheduleParagraph(showSchedule: string) {
  return showSchedule ? paragraph(`Live shows run ${showSchedule}.`) : ''
}

export function renderPublicPageIndexBlock(
  page: 'homepage' | 'trade' | 'pantry',
  templateData: AmethystPreviewTemplateData,
  recipes: PublicIndexRecipe[] = [],
) {
  const facts = pageFacts(templateData)
  const schedule = scheduleParagraph(facts.showSchedule)

  if (page === 'trade') {
    const comingSoon = templateData.trade?.danceFloorComingSoon === true
    const h1 = comingSoon
      ? `Digital Dance Floor coming soon for ${facts.businessName}${facts.place}`
      : `${facts.businessName} Dance Floor${facts.place}`
    const body = comingSoon
      ? `${facts.businessName} is preparing a Digital Dance Floor.`
      : `${facts.businessName} lists dancers from live jewelry reveals on the Dance Floor. Shoppers can ask the rep about a one-for-one dancer swap.`
    return `<main class="public-index" data-page="dance-floor"><h1>${escapeHtml(h1)}</h1>${paragraph(facts.identity)}${paragraph(body)}${paragraph(facts.intro)}${schedule}</main>`
  }

  if (page === 'pantry') {
    const visibleRecipes = recipes.flatMap((recipe) => {
      const title = keepPublicCopy(recipe.title)
      if (!title) return []
      const description = keepPublicCopy(recipe.description).slice(0, 220)
      return [{ title, description }]
    }).slice(0, 40)
    const recipeList = visibleRecipes.length
      ? `<ul>${visibleRecipes
          .map(
            (recipe) =>
              `<li><h2>${escapeHtml(recipe.title)}</h2>${
                recipe.description ? `<p>${escapeHtml(recipe.description)}</p>` : ''
              }</li>`,
          )
          .join('')}</ul>`
      : paragraph('Recipes will appear here after the rep adds the first one.')
    const h1 = `In the Pantry with ${facts.businessName}${facts.place}`
    const countLine = visibleRecipes.length
      ? `${facts.businessName} keeps ${visibleRecipes.length} recipes in the pantry.`
      : ''
    return `<main class="public-index" data-page="pantry"><h1>${escapeHtml(h1)}</h1>${paragraph(facts.identity)}${paragraph(countLine)}${paragraph(facts.intro)}${schedule}${recipeList}</main>`
  }

  const h1 = `${facts.businessName}${facts.place}`
  return `<main class="public-index" data-page="home"><h1>${escapeHtml(h1)}</h1>${paragraph(facts.identity)}${facts.customHeadline ? paragraph(facts.customHeadline) : ''}${facts.heroLine ? paragraph(facts.heroLine) : ''}${paragraph(facts.intro)}${schedule}</main>`
}

export function injectPublicPageIndexDocument(
  html: string,
  page: 'homepage' | 'trade' | 'pantry',
  templateData: AmethystPreviewTemplateData,
  recipes: PublicIndexRecipe[] = [],
) {
  return injectRootBlock(html, renderPublicPageIndexBlock(page, templateData, recipes))
}
