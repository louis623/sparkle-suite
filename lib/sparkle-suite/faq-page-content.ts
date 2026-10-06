import { sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'

/**
 * Public marketing FAQ copy. Edit questions here.
 * Visible answers and FAQPage JSON-LD both read this module.
 * Landing keeps its own six short questions.
 */

export type SparkleSuiteFaqRun =
  | string
  | {
      label: string
      href: string
    }

export type SparkleSuiteFaqQuestion = {
  id: string
  question: string
  paragraphs: readonly (readonly SparkleSuiteFaqRun[])[]
}

export type SparkleSuiteFaqGroup = {
  id: string
  label: string
  title: string
  questions: readonly SparkleSuiteFaqQuestion[]
}

export const sparkleSuiteFaqCta = {
  label: 'Join the build queue',
  href: '/prelaunch#waitlist',
  note: 'No payment to join. Joining the queue does not reserve a founder rate.',
} as const

export const sparkleSuiteFaqPortfolioLink = {
  label: 'See the portfolio',
  href: '/portfolio',
} as const

export const sparkleSuiteFaqDemoLink = {
  label: 'Watch the demo',
  href: '/demo',
} as const

export const sparkleSuiteFaqContent = {
  hero: {
    eyebrow: 'FAQ',
    headlineLead: 'Answers for reps who want',
    headlineEmphasis: 'the full story.',
    body:
      'Deeper answers on pricing, what is included, domains, show tools, and independence. Sparkle Suite is an independent tool for Bomb Party reps.',
    askLabel: 'Read the answers',
    askHref: '#answers',
  },
  nicNac: {
    eyebrow: 'Still deciding',
    heading: 'Still have a specific question?',
    body: 'Ask Nic-Nac about setup, pricing, and whether Sparkle Suite fits your show. This is for buyer questions, not a private walkthrough of the tools behind the site.',
  },
  proof: {
    eyebrow: 'See it first',
    heading: 'Real sites, then Sparkle Suite in motion.',
    body: 'The portfolio is live customer sites and looks. The demo is the customer side of a show, using public clips only.',
  },
  close: {
    heading: 'When you are ready, get in line.',
  },
} as const

const portfolio = { label: 'portfolio', href: sparkleSuiteFaqPortfolioLink.href }
const demo = { label: 'demo', href: sparkleSuiteFaqDemoLink.href }
const queue = { label: 'build queue', href: sparkleSuiteFaqCta.href }

export const sparkleSuiteFaqGroups = [
  {
    id: 'pricing',
    label: 'Pricing',
    title: 'Pricing and setup',
    questions: [
      {
        id: 'cost',
        question: 'How much does Sparkle Suite cost?',
        paragraphs: [
          [
            'The standard rate is $74.99 a month, plus a one-time $49.99 setup fee. Tax can be added at checkout. The subscription starts when you check out, not when you join the queue.',
          ],
          [
            'Setup is non-refundable and shows as its own line. At the standard rate, the first checkout is $124.98 before tax: the setup fee and the first month together.',
          ],
          [
            'Joining the ',
            queue,
            ' is free. No card, and no charge, until you decide to build.',
          ],
        ],
      },
      {
        id: 'founder-rate',
        question: 'How does the founding rep rate work?',
        paragraphs: [
          [
            'Eligible founding reps pay $49.99 a month for the first 12 paid months, then $74.99 a month. The one-time $49.99 setup fee still applies, and tax is extra. At the founding rate, the first checkout is $99.98 before tax.',
          ],
          [
            'Joining the build queue does not reserve a founder rate, and it does not hold a spot. Eligibility is confirmed at checkout. This page does not list leftover spots.',
          ],
        ],
      },
      {
        id: 'build-queue',
        question: 'What happens when I join the build queue?',
        paragraphs: [
          [
            'You share how to reach you and a little about the site you want. Those details are saved so we can follow up about next steps. There is no payment to join.',
          ],
          [
            'Joining does not move your current website or email, and it does not reserve a founder rate. It puts you in the conversation. You can still look at the ',
            portfolio,
            ' and the ',
            demo,
            ' while you wait. When you want in line, use the ',
            queue,
            '.',
          ],
        ],
      },
      {
        id: 'when-you-pay',
        question: 'When do I pay, and what am I paying for first?',
        paragraphs: [
          [
            'The queue is free. You pay at checkout, when you are ready to build. That first payment is the setup fee plus the first month.',
          ],
          [
            'Setup is the work of building your customer site and getting you into the Suite tools you will use: the site, Live queue, Dance Floor, live event calendar, and Nic-Nac. It is part of the first checkout, not a surprise fee after you are live.',
          ],
          [
            'Customer email and SMS updates are not part of that first build. They are coming soon, and there is no public date.',
          ],
        ],
      },
    ],
  },
  {
    id: 'included',
    label: 'Included',
    title: 'What is included',
    questions: [
      {
        id: 'included-tools',
        question: 'What is included with Sparkle Suite?',
        paragraphs: [
          [
            'A customer site that can feel like your brand. A Live queue so people can follow the line. A Dance Floor for pieces available during the show. A live event calendar so customers can find the next show. Nic-Nac, for plain answers while you get set up.',
          ],
          [
            'Customer email and SMS updates are coming soon. They are not live today, and there is no public launch date.',
          ],
          [
            'If you want proof before you decide, look at the ',
            portfolio,
            ' and the ',
            demo,
            '.',
          ],
        ],
      },
      {
        id: 'dance-floor',
        question: 'What is the Dance Floor and Live queue for customers?',
        paragraphs: [
          [
            'The Live queue is the customer-facing line for the show. People can see what is coming instead of asking you the same question in the comments.',
          ],
          [
            'The Dance Floor is where customers browse pieces that are available and send a trade request during the show: one piece for one piece, with you making the final call. It is there so the show can keep moving.',
          ],
          [
            'This page stays on the customer side of those tools. It does not walk through the private setup behind them.',
          ],
        ],
      },
      {
        id: 'examples',
        question: 'Where can I see real examples or a demo?',
        paragraphs: [
          [
            'The ',
            portfolio,
            ' is live customer sites and looks we are proud to put on the floor. The ',
            demo,
            ' is Sparkle Suite in motion: the customer site, the lineup, and the Dance Floor, using public clips only.',
          ],
          [
            'Neither one asks you to pay. When you are ready, join the ',
            queue,
            '.',
          ],
        ],
      },
    ],
  },
  {
    id: 'independence',
    label: 'Independence',
    title: 'Bomb Party independence',
    questions: [
      {
        id: 'bomb-party',
        question: 'Is Sparkle Suite part of Bomb Party?',
        paragraphs: [
          [
            'No. Sparkle Suite is a tool you use with your own customers. Your Bomb Party business stays yours. The Suite is the website and show tools on your side of the counter.',
          ],
          [sparkleSuitePublicLandingSafety.disclaimer],
        ],
      },
      {
        id: 'compliance',
        question: 'Will using Sparkle Suite affect my Bomb Party account or company guidelines?',
        paragraphs: [
          [
            'Sparkle Suite is a separate website and tools layer for your customer experience. It does not replace Bomb Party’s own platforms, and it does not sign in to or change your Bomb Party account.',
          ],
          [
            'It also does not set your company’s rules. You still follow the guidelines your company gives you. If you are unsure whether a page, a post, or a show flow fits those guidelines, check with your company. Sparkle Suite does not make you official, approved, or compliant.',
          ],
        ],
      },
    ],
  },
  {
    id: 'domains',
    label: 'Domains',
    title: 'Domains and an existing site',
    questions: [
      {
        id: 'keep-domain',
        question: 'Can I keep my domain and existing site?',
        paragraphs: [
          [
            'Yes. Tell us the domain you have and where the site lives today. We plan the domain connection and the new site with you.',
          ],
          [
            'Joining the build queue does not move your current website, and it does not move your email. Nothing switches over just because you joined the list. A move happens later, when you and we agree it is time.',
          ],
        ],
      },
      {
        id: 'existing-site',
        question: 'What if I already have a site somewhere else?',
        paragraphs: [
          [
            'That is a common start. Plenty of reps already have a Wix site, a Beacons page, a Facebook-first flow, or something custom. We look at what you have, what customers already use, and what should become the polished home.',
          ],
          [
            'Sparkle Suite is meant to be that home: the place customers go for the show, the line, and the Dance Floor. We do not take the old site down the night you join the queue. Going live with the new site is part of the setup conversation, after you decide to build.',
          ],
        ],
      },
    ],
  },
  {
    id: 'mobile',
    label: 'Mobile',
    title: 'Phone and live shows',
    questions: [
      {
        id: 'phone',
        question: 'Can I use Sparkle Suite on my phone?',
        paragraphs: [
          [
            'Yes. The customer site is built for phones, tablets, and desktop, because that is how your customers show up. The rep side is meant to be usable on your phone too, so show night is not stuck at a desk.',
          ],
          [
            'Some live-show connections have their own setup. We will help you map what your show needs. We will not pretend every connection is one tap.',
          ],
        ],
      },
      {
        id: 'live-shows',
        question: 'Does Sparkle Suite work with my live shows?',
        paragraphs: [
          [
            'Sparkle Suite is built around a live jewelry show: a customer home, a lineup, a Dance Floor, and a calendar for the next live. Many reps host on Facebook. Others use a different live home.',
          ],
          [
            'Your customers use the site. How your show connects to that site depends on your setup, and we sort that out in the setup conversation.',
          ],
        ],
      },
    ],
  },
  {
    id: 'updates',
    label: 'Updates',
    title: 'Email and SMS',
    questions: [
      {
        id: 'email-sms',
        question: 'Are customer email and SMS updates ready?',
        paragraphs: [
          [
            'Not yet. Customer email and SMS updates are coming soon. There is no public date.',
          ],
          [
            'What you can use now is the customer site, the Live queue, the Dance Floor, the live event calendar, and Nic-Nac. If someone asks you to text the whole list from Sparkle Suite today, that tool is not ready.',
          ],
        ],
      },
    ],
  },
  {
    id: 'getting-started',
    label: 'Getting started',
    title: 'Getting started',
    questions: [
      {
        id: 'who-builds',
        question: 'Who builds my site, and how long does it take?',
        paragraphs: [
          [
            'Louis and the Sparkle Suite team build it with you. You bring the photos, the brand preferences, and domain access when it is time. We bring the site and the show tools.',
          ],
          [
            'How long it takes depends on where you are in the queue and how quickly those pieces are ready. This page does not promise a number of days or weeks. You get a real timeline in the setup conversation, after checkout, based on your site.',
          ],
        ],
      },
      {
        id: 'who-is-behind',
        question: 'Who is behind Sparkle Suite?',
        paragraphs: [
          [
            'Sparkle Suite is made by Louis Chapman of Neon Rabbit Digital Services. It is an independent product for reps who want a better customer site and smoother shows.',
          ],
          [
            sparkleSuitePublicLandingSafety.disclaimer,
            ' It is not a Bomb Party program.',
          ],
        ],
      },
    ],
  },
] as const satisfies readonly SparkleSuiteFaqGroup[]

export function sparkleSuiteFaqQuestions(): SparkleSuiteFaqQuestion[] {
  // Widen `as const satisfies` tuple so flatMap returns SparkleSuiteFaqQuestion[]
  // (literal-group flatMap otherwise fails Next.js production typecheck).
  return (sparkleSuiteFaqGroups as readonly SparkleSuiteFaqGroup[]).flatMap(
    (group) => group.questions,
  )
}

export function sparkleSuiteFaqPlainText(question: SparkleSuiteFaqQuestion) {
  return question.paragraphs
    .map((paragraph) => paragraph.map((run) => (typeof run === 'string' ? run : run.label)).join(''))
    .join(' ')
}

export function buildSparkleSuiteFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sparkleSuiteFaqQuestions().map((question) => ({
      '@type': 'Question',
      name: question.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: sparkleSuiteFaqPlainText(question),
      },
    })),
  }
}
