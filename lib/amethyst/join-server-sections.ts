/**
 * Why Join, FAQ, and final call-to-action copy for the initial /join HTML.
 * Every string here is the copy public/amethyst/join.jsx paints for the same
 * rep today (WhyJoin, Faq, FinalCta). Keep the two in step:
 * tests/join-server-sections.test.ts fails when a string here is missing
 * from join.jsx.
 */

import type { AmethystJoinTemplateData } from '@/lib/amethyst/join-template-data'
import { redactPublicRepFullName } from '@/lib/amethyst/public-rep-name'

type Benefit = { title: string; desc: string }
type FaqItem = { q: string; a: string }

export type JoinSectionRuntimeContext = {
  targeted: boolean
  repId?: string | null
  publicSiteSlug?: string | null
}

const BENEFITS: Benefit[] = [
  { title: 'Meet the Team', desc: 'Ask how this team communicates, celebrates wins, and handles everyday questions.' },
  { title: 'Review the Numbers', desc: 'Income is not guaranteed. Read the current compensation information and Income Disclosure Statement before deciding.' },
  { title: 'Ask About Support', desc: 'Training and mentoring differ by team. Ask the lead exactly what is available now.' },
  { title: 'Know the Product', desc: 'Review the current official catalog, policies, and starter-pack details before enrolling.' },
  { title: 'Plan Your Setup', desc: 'Ask what equipment, internet, workspace, and show schedule are realistic for you.' },
  { title: 'Understand the Path', desc: 'Learn the official requirements and talk through your goals without promises or pressure.' },
]

const KELLY_BENEFITS: Benefit[] = [
  {
    title: 'A real welcome from Kelly',
    desc: "Start with Kelly, not a generic checklist. The rep will help you get acquainted with Sparkly Butterflies and talk through the questions that matter to you.",
  },
  {
    title: 'Clear answers before you join',
    desc: "Kelly can explain how the rep's team stays connected, what support is currently available, and what your first steps could look like.",
  },
  {
    title: 'Space to choose your pace',
    desc: 'Tell Kelly what you want your business to fit around. The rep can help you think through a realistic start, without pressure or income promises.',
  },
]

const HEATHER_BENEFITS: Benefit[] = [
  {
    title: 'A warm welcome from Heather',
    desc: "Get to know Heather and Opal Sparkling Gems before you decide. The rep can answer your questions and help you understand what joining the rep's team looks like today.",
  },
  {
    title: 'Practical guidance to get started',
    desc: "Heather can walk you through the official resources, explain how the rep's team stays connected, and share what support is currently available to new reps.",
  },
  {
    title: 'A start that fits your life',
    desc: 'Talk with Heather about your schedule and goals so you can consider a realistic pace without pressure or income promises.',
  },
]

const KIM_BENEFITS: Benefit[] = [
  {
    title: 'A personal welcome from Kim',
    desc: "Start with a real conversation about GofortheBling. Kim can tell you about the rep's team and help you decide whether it feels like the right place to begin.",
  },
  {
    title: 'Clear answers and next steps',
    desc: "Kim can point you to the current official information, explain how the rep's team communicates, and tell you what support is available now.",
  },
  {
    title: 'Room to build your way',
    desc: 'Share what you want your business to fit around, then talk through a practical starting pace without pressure or income promises.',
  },
]

const KELLY_FAQ_QUESTIONS: FaqItem[] = [
  {
    q: "What is it like to join Kelly's Sparkly Butterflies team?",
    a: "Kelly wants you to feel comfortable asking questions before you make a decision. The rep will introduce you to how Sparkly Butterflies stays connected, explain what the team currently offers, and help you decide whether it feels like a good fit.",
  },
  {
    q: "How much does it cost to join Kelly's team?",
    a: "Bomb Party sets the official starter-pack options, contents, and prices, and those details can change. Use Kelly's starter-pack link on this page for the current information, then ask Kelly about anything you would like help understanding.",
  },
  {
    q: 'Does Kelly expect me to have experience?',
    a: 'You do not need to arrive knowing how to run a live show. Kelly can explain the current enrollment requirements, point you toward official training resources, and share how new Sparkly Butterflies team members get oriented.',
  },
  {
    q: 'How much time will Kelly expect me to commit?',
    a: "Kelly knows that every rep's schedule and goals are different. Talk with Kelly about what you want your business to fit around so you can think through a pace that is realistic for you.",
  },
  {
    q: 'What support does Kelly offer new team members?',
    a: "Kelly can help you find the official onboarding resources, understand how the rep's team communicates, and get answers as you take your first steps. The rep will also tell you clearly what personal support is currently available before you enroll.",
  },
  {
    q: 'Can Kelly guarantee how much I will earn?',
    a: 'No. Kelly cannot guarantee income, and results vary by sales, expenses, effort, and time. Review the official Income Disclosure Statement and talk through your questions with Kelly before you decide.',
  },
]

function personalizedFaqQuestions(name: string, teamName: string): FaqItem[] {
  return [
    {
      q: `What is it like to join ${name}'s ${teamName} team?`,
      a: `${name} wants you to feel comfortable asking questions before you decide. ${name} can explain how ${teamName} stays connected, what the team currently offers, and whether it feels like a good fit for you.`,
    },
    {
      q: `How much does it cost to join ${name}'s team?`,
      a: `Bomb Party sets the official starter-pack options, contents, and prices, and those details can change. Use ${name}'s starter-pack link on this page for current information, then ask ${name} about anything you would like help understanding.`,
    },
    {
      q: `Does ${name} expect me to have experience?`,
      a: `You do not need to arrive knowing how to run a live show. ${name} can explain the current enrollment requirements, point you toward official training resources, and tell you how new ${teamName} team members get oriented.`,
    },
    {
      q: `How much time will ${name} expect me to commit?`,
      a: `${name} knows that every rep's schedule and goals are different. Talk with ${name} about what you want your business to fit around so you can consider a pace that is realistic for you.`,
    },
    {
      q: `What support does ${name} offer new team members?`,
      a: `${name} can help you find the official onboarding resources, understand how the team communicates, and get answers as you take your first steps. Ask ${name} what personal support is currently available before you enroll.`,
    },
    {
      q: `Can ${name} guarantee how much I will earn?`,
      a: `No. ${name} cannot guarantee income, and results vary by sales, expenses, effort, and time. Review the official Income Disclosure Statement and talk through your questions with ${name} before you decide.`,
    },
  ]
}

function genericFaqQuestions(
  teamName: string,
  repName: string,
  answers: AmethystJoinTemplateData['faqAnswers'],
): FaqItem[] {
  return [
    {
      q: `What is ${teamName}?`,
      a: answers.whatIsTeam || `${teamName} is a team of independent Bomb Party reps led by ${repName}. Ask the team lead how the group communicates and what support is currently available.`,
    },
    {
      q: 'How much does it cost to join?',
      a: answers.cost || 'Starter-pack options, contents, and prices can change. Review the current official enrollment page before making a decision.',
    },
    {
      q: `Do I need experience to join ${teamName}?`,
      a: answers.experience || 'Review the current official requirements and ask the team lead what training or onboarding help is available for new reps.',
    },
    {
      q: 'How much time do I need to commit?',
      a: answers.timeCommitment || 'The time needed depends on your goals and how you run your independent business. Review the official policies and plan a schedule that is realistic for you.',
    },
    {
      q: 'What kind of support will I receive?',
      a: answers.support || 'Support differs by team and can change. Ask the team lead which onboarding, communication, and training resources are available now.',
    },
    {
      q: 'Can I really make money doing this?',
      a: answers.income || 'Income is not guaranteed and results vary. Read the current Income Disclosure Statement and consider your costs, time, and goals before enrolling.',
    },
  ]
}

type RecruitingProfile = {
  name: string
  teamName: string
  heading: string
  intro: string
  benefits: Benefit[]
}

function lower(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase()
}

/** Mirrors isKellySparklyButterflies / isHeatherBlingKitchen / isKimGoForTheBling. */
export function joinRecruitingProfile(
  context: JoinSectionRuntimeContext,
): (RecruitingProfile & { kind: 'kelly' | 'heather' | 'kim' }) | null {
  if (!context.targeted) return null
  const slug = lower(context.publicSiteSlug)
  const repTarget = lower(context.repId)
  if (
    slug === 'sparklybutterflies' ||
    repTarget === 'sparklybutterflies.com' ||
    repTarget === 'b5404543-b90a-41cf-85f6-4e6d1d576cfa'
  ) {
    return {
      kind: 'kelly',
      name: 'Kelly',
      teamName: 'Sparkly Butterflies',
      heading: 'Come sparkle with Kelly',
      intro: 'Joining a team should feel personal. Kelly would love to help you understand the opportunity, see the current starter packs, and decide whether Sparkly Butterflies feels right for you.',
      benefits: KELLY_BENEFITS,
    }
  }
  if (slug === 'blingkitchen' || repTarget === 'theblingkitchen.com') {
    return {
      kind: 'heather',
      name: 'Heather',
      teamName: 'Opal Sparkling Gems',
      heading: 'Find your place with Heather',
      intro: 'Joining a team is a personal decision. Heather would love to answer your questions, show you the current starter packs, and help you decide whether Opal Sparkling Gems feels right for you.',
      benefits: HEATHER_BENEFITS,
    }
  }
  if (slug === 'goforthebling' || repTarget === 'goforthebling.com') {
    return {
      kind: 'kim',
      name: 'Kim',
      teamName: 'GofortheBling',
      heading: 'Find your sparkle with Kim',
      intro: 'You deserve more than a generic recruiting checklist. Kim can help you understand the opportunity, review the current starter packs, and decide whether GofortheBling feels right for you.',
      benefits: KIM_BENEFITS,
    }
  }
  return null
}

function displayTeamName(join: AmethystJoinTemplateData, teamName: string) {
  return join.publicSiteVariant === 'mile_high_fizz_hybrid' ? 'the Diamond Peak Society' : teamName
}

function facebookCommunityUrl(join: AmethystJoinTemplateData) {
  const socials = Array.isArray(join.socialLinks)
    ? join.socialLinks.filter((social) => social?.href && social.href !== '#')
    : []
  return (
    socials.find((social) => String(social?.label || '').toLowerCase().includes('facebook'))
      ?.href || ''
  )
}

export function joinWhyCopy(input: {
  join: AmethystJoinTemplateData
  context: JoinSectionRuntimeContext
  teamName: string
  repName: string
  locationLabel: string
  recruitingEnabled: boolean
}) {
  const profile = joinRecruitingProfile(input.context)
  const team = displayTeamName(input.join, input.teamName)
  const actions: string[] = []
  if (profile) {
    if (input.join.footerLinks?.contact) actions.push(`Ask ${profile.name} a question`)
    actions.push(
      input.recruitingEnabled
        ? `See ${profile.name}'s starter packs`
        : `Ask ${profile.name} for current starter-pack details`,
    )
    actions.push(`Read ${profile.name}'s FAQs`)
    if (facebookCommunityUrl(input.join)) actions.push(`Visit ${profile.name}'s Facebook community`)
  }
  return {
    eyebrow: 'Why join',
    heading: profile?.heading || `Why Join ${team}?`,
    sub: profile
      ? profile.intro
      : `Review the official requirements and ask ${input.repName}${input.locationLabel ? ` in ${input.locationLabel}` : ''} what this team currently offers before you decide.`,
    benefits: (profile?.benefits || BENEFITS).map((benefit) => ({ ...benefit })),
    actions,
  }
}

/** The faqAnswers the join bootstrap script publishes (full rep name redacted). */
function publicFaqAnswers(join: AmethystJoinTemplateData) {
  const answers = join.faqAnswers ?? ({} as AmethystJoinTemplateData['faqAnswers'])
  return {
    ...answers,
    whatIsTeam: redactPublicRepFullName(answers.whatIsTeam, join.repName),
    experience: redactPublicRepFullName(answers.experience, join.repName),
    timeCommitment: redactPublicRepFullName(answers.timeCommitment, join.repName),
    support: redactPublicRepFullName(answers.support, join.repName),
    income: redactPublicRepFullName(answers.income, join.repName),
  }
}

export function joinFaqCopy(input: {
  join: AmethystJoinTemplateData
  context: JoinSectionRuntimeContext
  teamName: string
  repName: string
  locationLabel: string
}) {
  const profile = joinRecruitingProfile(input.context)
  const team = displayTeamName(input.join, input.teamName)
  const items =
    profile?.kind === 'kelly'
      ? KELLY_FAQ_QUESTIONS
      : profile
        ? personalizedFaqQuestions(profile.name, profile.teamName)
        : genericFaqQuestions(team, input.repName, publicFaqAnswers(input.join))
  return {
    eyebrow: 'FAQ',
    heading: 'Frequently Asked Questions',
    sub: profile
      ? `Straight answers about joining ${profile.name} and the ${profile.teamName} team.`
      : `Everything you need to know about joining ${team}${input.locationLabel ? ` with ${input.repName} in ${input.locationLabel}` : ''}.`,
    items: items.map((item) => ({ ...item })),
    notes: [
      "If you're evaluating income potential, read the Bomb Party Income Disclosure Statement before enrolling.",
      'Need more info? See the full Bomb Party rep FAQ →',
    ],
  }
}

export function joinFinalCtaCopy(input: {
  join: AmethystJoinTemplateData
  teamName: string
  finalPitch: string
  repName: string
  locationLabel: string
  hasRecruitingLink: boolean
  recruitingEnabled: boolean
}) {
  const note = input.hasRecruitingLink
    ? `Start with the official starter pack page${input.locationLabel ? `, then connect with ${input.repName} in ${input.locationLabel}` : ''}. `
    : `Starter-pack details are not connected on this page yet. Ask ${input.repName} for the current official options. `
  return {
    heading: `Ready to Sparkle With ${displayTeamName(input.join, input.teamName)}?`,
    pitch: String(input.finalPitch ?? '').trim(),
    note: `${note}Review the Income Disclosure Statement before you enroll.`,
    action: input.recruitingEnabled ? 'Join The Team Now' : `Ask ${input.repName} for current join details`,
  }
}
