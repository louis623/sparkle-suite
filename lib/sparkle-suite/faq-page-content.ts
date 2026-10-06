/** Public FAQ answers and FAQPage structured data share the same source. */
export type SparkleSuiteFaqRun = string | { label: string; href: string }
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
  note: 'No payment when you join the queue.',
} as const
export const sparkleSuiteFaqPortfolioLink = { label: 'Explore the portfolio', href: '/portfolio' } as const
export const sparkleSuiteFaqDemoLink = { label: 'Watch Sparkle Suite', href: '/#watch' } as const
export const sparkleSuiteFaqContent = {
  hero: {
    headlineLead: 'A few things you might be',
    headlineEmphasis: 'wondering.',
    body: 'Straight answers about your site, pricing, and getting started.',
  },
  close: { heading: 'Ready to talk about your site?' },
} as const

const portfolio = { label: 'portfolio', href: sparkleSuiteFaqPortfolioLink.href }
const demo = { label: 'Watch section', href: sparkleSuiteFaqDemoLink.href }

export const sparkleSuiteFaqGroups = [
  {
    id: 'getting-started', label: 'Getting started', title: 'Getting started',
    questions: [
      {
        id: 'build-queue', question: 'What happens when I join the build queue?',
        paragraphs: [["Join the build queue and I'll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid."], ['No payment when you join the queue.']],
      },
      {
        id: 'founder-reservation', question: 'Does joining reserve founder pricing?',
        paragraphs: [['No. Joining the build queue does not reserve founder pricing. It is available to reps who meet with Louis and agree to move forward, while spots last.']],
      },
      {
        id: 'who-builds', question: 'Who builds my site, and how long does it take?',
        paragraphs: [['Louis builds your site with you. Bring your photos, your ideas, and details about any domain or website you already have. We will talk through what your site needs on the call.'], ['Your timeline depends on the build queue and what is ready for your site. We will discuss it together before moving forward.']],
      },
    ],
  },
  {
    id: 'pricing', label: 'Pricing', title: 'Pricing and setup',
    questions: [
      {
        id: 'founder-rate', question: 'What does founder pricing include?',
        paragraphs: [['Founder pricing is $49.99 a month for your first 12 paid months, then $74.99 a month, plus a one-time $49.99 setup fee. Your first month and setup fee total $99.98.'], ['The founder offer is limited to 20 reps. Founder pricing is available to reps who move forward after our call, while spots last. Joining the queue does not reserve it.']],
      },
      {
        id: 'cost', question: 'What is the standard price?',
        paragraphs: [['The standard price is $74.99 a month, plus a one-time $49.99 setup fee. The first month and setup fee total $124.98.']],
      },
      {
        id: 'when-you-pay', question: 'When do I pay?',
        paragraphs: [['There is no payment when you join the build queue. After our call, if we both agree to move forward, your build starts once your first month and setup fee are paid.']],
      },
    ],
  },
  {
    id: 'your-site', label: 'Your site', title: 'Your site',
    questions: [
      {
        id: 'keep-domain', question: 'Can I keep my domain?',
        paragraphs: [['Yes. Tell Louis the domain you have and where your site lives today. We will plan the connection together. Joining the build queue does not move your current website or email.']],
      },
      {
        id: 'existing-site', question: 'What if I already have a website?',
        paragraphs: [['Bring the link to our call. We will look at your current site, what your customers use, and what you want to keep. Going live with your new site is part of the setup conversation.']],
      },
      {
        id: 'phone', question: 'Can customers use my site on their phones?',
        paragraphs: [['Yes. Your customer site works on phones, tablets, and desktops, so shoppers can find your next show, check the Live Lineup, and browse your Dance Floor.']],
      },
      {
        id: 'themes', question: 'Can I change my theme?',
        paragraphs: [['Yes. You can choose from the community themes for your site. Try the theme picker on the home page to see how different looks feel before you join the queue.']],
      },
    ],
  },
  {
    id: 'show-tools', label: 'Show tools', title: 'Show tools',
    questions: [
      {
        id: 'included-tools', question: 'What comes with Sparkle Suite?',
        paragraphs: [['Your customer website, themed looks, Dance Floor, Live Lineup, and event calendar. Nic-Nac is the included assistant for paying reps.'], ['Email and SMS updates are coming soon.']],
      },
      {
        id: 'dance-floor', question: 'What are Dance Floor and Live Lineup?',
        paragraphs: [['Dance Floor lets customers browse available pieces and send a trade request, with you making the final call. Live Lineup lets shoppers follow the order of your live show.']],
      },
      {
        id: 'email-sms', question: 'Are email and SMS updates available?',
        paragraphs: [['Email and SMS updates are coming soon. They are not available yet, and there is no announced launch date.']],
      },
      {
        id: 'examples', question: 'Where can I see real sites and demos?',
        paragraphs: [['Browse real rep sites in the ', portfolio, ', or visit the ', demo, ' for our featured demo and links to the Sparkle Suite YouTube and TikTok channels.']],
      },
    ],
  },
] as const satisfies readonly SparkleSuiteFaqGroup[]

export function sparkleSuiteFaqQuestions(): SparkleSuiteFaqQuestion[] {
  return (sparkleSuiteFaqGroups as readonly SparkleSuiteFaqGroup[]).flatMap((group) => group.questions)
}
export function sparkleSuiteFaqPlainText(question: SparkleSuiteFaqQuestion) {
  return question.paragraphs.map((paragraph) => paragraph.map((run) => typeof run === 'string' ? run : run.label).join('')).join(' ')
}
export function buildSparkleSuiteFaqJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: sparkleSuiteFaqQuestions().map((question) => ({
      '@type': 'Question', name: question.question,
      acceptedAnswer: { '@type': 'Answer', text: sparkleSuiteFaqPlainText(question) },
    })),
  }
}
