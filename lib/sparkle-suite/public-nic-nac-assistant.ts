import {
  sparkleSuitePublicLandingContent,
  sparkleSuitePublicLandingSafety,
} from './public-landing-content'
import { PUBLIC_NIC_NAC_KNOWLEDGE } from './public-nic-nac-knowledge'

export type PublicNicNacReply = {
  kind: 'answer' | 'handoff'
  message: string
}

const fallbackMessage =
  'That is outside what I can answer on the public Sparkle Suite page. Submit the contact form to save your name, email, and question for Louis to review. This does not join the build queue or reserve a founder spot.'

function includesAny(question: string, terms: string[]) {
  return terms.some((term) => question.includes(term))
}

export function answerPublicNicNacQuestion(rawQuestion: string): PublicNicNacReply {
  const question = rawQuestion.trim().toLowerCase()
  const { pricing } = sparkleSuitePublicLandingContent

  if (!question) {
    return {
      kind: 'answer',
      message:
        'Ask me about what Sparkle Suite includes, setup, pricing, customer-site customization, live-show tools, or whether it fits your workflow.',
    }
  }

  if (
    includesAny(question, [
      'admin',
      'backroom',
      'internal',
      'implementation',
      'code',
      'api',
      'database',
      'secret',
      'private data',
      'roadmap',
      'exception',
      'give me a discount',
      'get a discount',
      'extra discount',
      'promise',
      'guarantee',
    ])
  ) {
    return { kind: 'handoff', message: fallbackMessage }
  }

  if (includesAny(question, ['bomb party', 'affiliated', 'endorse', 'sponsor'])) {
    return {
      kind: 'answer',
      message: sparkleSuitePublicLandingSafety.disclaimer,
    }
  }

  if (includesAny(question, ['founder', 'founding', 'discount'])) {
    return {
      kind: 'answer',
      message: `${PUBLIC_NIC_NAC_KNOWLEDGE.pricing.founder} Joining the build queue does not reserve this rate. Check the current availability shown on the page; eligibility is confirmed through checkout.`,
    }
  }

  if (
    includesAny(question, [
      'form',
      'field',
      'name',
      'business name',
      'email',
      'password',
      'phone',
      'social link',
      'live link',
      'shop link',
      'card',
      'pay here',
      'pay on this page',
      'account',
      'waitlist',
      'build queue',
      'sign up',
      'signup',
      'start page',
      'after this',
      'what happens next',
      'after signup',
      'after i create',
    ])
  ) {
    if (
      includesAny(question, ['card', 'pay here', 'pay on this page', 'charge', 'charged'])
    ) {
      return {
        kind: 'answer',
        message:
          'No card is needed to join the build queue. Joining does not create an account, charge you, or reserve founder pricing. When your build is ready to start, you complete your first payment, and work on your build begins once it goes through.',
      }
    }

    if (
      includesAny(question, [
        'after this',
        'what happens next',
        'after signup',
        'after i create',
        'after account',
      ])
    ) {
      return {
        kind: 'answer',
        message:
          'After you join the build queue, Louis reviews your interest, reaches out, and schedules coaching one person at a time. Work on your build starts once your first payment goes through.',
      }
    }

    return {
      kind: 'answer',
      message:
        'Sparkle Suite is building sites now. This form joins the build queue with your name and email; extra rep-context details are optional. It does not create an account, workspace, or checkout, or reserve founder pricing.',
    }
  }

  if (
    includesAny(question, [
      'price',
      'pricing',
      'cost',
      'checkout',
      'monthly',
      'subscription',
      'build fee',
      'tax',
    ])
  ) {
    return {
      kind: 'answer',
      message: `${pricing.standard.firstCheckout} Sparkle Suite Standard is ${pricing.standard.price}, and the one-time setup fee is ${pricing.buildFee.price}.`,
    }
  }

  if (includesAny(question, ['included', 'include', 'come with', 'features', 'tools'])) {
    return {
      kind: 'answer',
      message: `Sparkle Suite includes ${pricing.included.join(', ')}. It is built around a polished customer site and live-show support tools.`,
    }
  }

  if (
    includesAny(question, [
      'tradeboard',
      'dance floor',
      'trade',
      'shipping',
      'ship',
      'pay the difference',
      'credit',
      'payout',
      'lesser value',
      'lower value',
      'higher value',
      'worth more',
      'worth less',
      'msrp',
      'fair',
      'items can',
    ])
  ) {
    return {
      kind: 'answer',
      message: [
        PUBLIC_NIC_NAC_KNOWLEDGE.tradeBoardLiveShowFlow,
        PUBLIC_NIC_NAC_KNOWLEDGE.tradeBoardEligibilityRules,
        PUBLIC_NIC_NAC_KNOWLEDGE.tradeBoardRules,
      ].join(' '),
    }
  }

  if (includesAny(question, ['setup', 'onboarding', 'custom', 'customization', 'site'])) {
    return {
      kind: 'answer',
      message:
        'Setup includes built-in support from Nic-Nac to help you set up your Sparkle Suite backend/workspace and customer-facing website, including basic customization and live-show settings.',
    }
  }

  if (
    includesAny(question, [
      'liveq',
      'live queue',
      'calendar',
      'email',
      'sms',
      'updates',
      'live event',
    ])
  ) {
    return {
      kind: 'answer',
      message:
        'Sparkle Suite supports your live-show workflow with LiveQ, Dance Floor, a live event calendar, and email/SMS updates so your customers can follow what is happening more easily.',
    }
  }

  if (includesAny(question, ['nic-nac', 'nic nac', 'assistant', 'chat'])) {
    return {
      kind: 'answer',
      message:
        'Nic-Nac is the Sparkle Suite assistant for current and future reps. On this public page, Nic-Nac answers sales and setup questions before you start.',
    }
  }

  if (includesAny(question, ['who', 'fit', 'for reps', 'for me', 'workflow'])) {
    return {
      kind: 'answer',
      message: sparkleSuitePublicLandingSafety.audienceClarifier,
    }
  }

  return { kind: 'handoff', message: fallbackMessage }
}
