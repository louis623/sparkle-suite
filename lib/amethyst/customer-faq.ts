import { renderSparkleSuitePoweredByLinkHtml } from './sparkle-suite-footer-credit'
import { loadAmethystPreviewTemplateData } from './preview-template-data'
import { resolveSparkleRequestOrigin } from '@/lib/seo/sparkle-crawl'

interface CustomerFaqOptions {
  repId?: string | null
  publicSiteSlug?: string | null
  customDomain?: boolean
}

export type CustomerFaqItem = {
  question: string
  answer: string
  draft?: boolean
  draftNote?: string
}

export type CustomerFaqSection = {
  id: string
  eyebrow: string
  title: string
  intro: string
  items: readonly CustomerFaqItem[]
}

/** Original six shipped Dance Floor answers — kept for continuity and tests. */
export const DANCE_FLOOR_FAQ = [
  {
    question: 'How does the Dance Floor work?',
    answer: 'Choose one dancer you just revealed and one dancer you would like from the Dance Floor. It is one dancer for one dancer. Your rep checks the details and makes the final decision.',
  },
  {
    question: 'Which dancers belong together?',
    answer: 'Dancers need to be from the same collection family and be the same jewelry type. A bracelet, for example, pairs with a bracelet from its collection family.',
  },
  {
    question: 'Can Birthday dancers be from different months or years?',
    answer: 'Yes. Birthday dancers can cross months and years when the jewelry type matches.',
  },
  {
    question: 'What about OG dancers?',
    answer: 'OG dancers pair with OG dancers of the same jewelry type.',
  },
  {
    question: 'Should I save my reveal?',
    answer: 'A photo or screenshot can help your rep identify what you revealed, but it is optional. Please crop out personal and order information before sharing it. Images shared through the Dance Floor expire after seven days.',
  },
  {
    question: 'What if my choice is flagged?',
    answer: 'If your choice is flagged, you will see why the dancers do not appear to match and may see compatible dancers currently available. You can still send your original choice to your rep for review. Your rep sees the request, can correct mistaken details, and makes the final decision using the Dance Floor rules.',
  },
] as const

const DRAFT_NOTE = 'Draft — needs Louis'

/** Official Bomb Party support hub (company help center). Confirm with Louis if a different FAQ URL is preferred. */
export const BOMB_PARTY_FAQ_URL = 'https://help.bombparty.com/hc/en-us'
export const BOMB_PARTY_FAQ_URL_CONFIDENCE: 'official_help_center' | 'placeholder' = 'official_help_center'
export const SPARKLE_SUITE_HOME_URL = 'https://www.yoursparklesuite.com'
export const SPARKLE_SUITE_BUILD_QUEUE_URL = 'https://www.yoursparklesuite.com/prelaunch'

const TOPIC_JUMP = [
  { id: 'dance-floor', label: 'Dance Floor' },
  { id: 'live-lineup', label: 'Live Lineup' },
  { id: 'join-team', label: 'Join Team' },
  { id: 'privacy', label: 'Accounts' },
] as const


const DANCE_FLOOR_EXTRA: readonly CustomerFaqItem[] = [
  {
    question: 'Do I add my own jewelry to the Dance Floor?',
    answer:
      'No. The Dance Floor shows dancers your rep has listed as available. During the show, you can request one of those dancers when you do not want the piece just revealed for you. Your rep has both pieces during the live show and can approve or decline.',
  },
  {
    question: 'Is there extra money involved in a Dance Floor request?',
    answer:
      'Dance Floor requests are item for item. There is no added payment, credit, or payout through Sparkle Suite for the request itself. Your rep makes the final approval decision. Sparkle Suite does not guarantee equal value.',
  },
  {
    question: 'How fast will my request be answered?',
    answer:
      'Usually during the live show while both pieces are in play, but timing is up to your rep. Your rep reviews requests during the show when they can. Watch the live and your messages with them for the final yes or no.',
  },
  {
    question: 'Can I send a request after the show ends?',
    answer:
      'No. Dance Floor requests are only during the live show, while your rep has both pieces and can approve or decline. After the show ends, Sparkle Suite does not take new Dance Floor requests.',
  },
]

const LIVE_LINEUP_FAQ: readonly CustomerFaqItem[] = [
  {
    question: 'What is the Live lineup?',
    answer:
      "The Live lineup is the line for the show on your rep's site. It helps you see who's up and what's happening without hunting through comments.",
  },
  {
    question: 'What information shows on the public lineup?',
    answer:
      "The anonymous customer-facing lineup is built to show first names, positions, and public lineup status — not full private order details. Full privacy detail is in Sparkle Suite's privacy policy on yoursparklesuite.com.",
  },
  {
    question: 'Do I need an account to watch the Live Lineup or browse the Dance Floor?',
    answer:
      "No. You do not need an account to view the Live Lineup, browse the Dance Floor, or send a Dance Floor request for a dancer swap. Just open your rep's Sparkle Suite site during the show.",
  },
  {
    question: 'Where do I find the next live show?',
    answer:
      "Look for your rep's live event calendar on their Sparkle Suite site (when they have shows listed). You can also follow the social links they share on the site.",
  },
]

const JOIN_TEAM_FAQ: readonly CustomerFaqItem[] = [
  {
    question: 'What is the Join Team page?',
    answer:
      "It is a page on some Sparkle Suite sites where you can learn about that rep's team, meet members, and find the official next step if you want to explore becoming an independent Bomb Party rep.",
  },
  {
    question: 'How much does it cost to join the team?',
    answer:
      'Starter-pack options, contents, and prices can change. Review the current official enrollment page before making a decision. Ask the team lead what is current.',
  },
  {
    question: 'Do I need experience?',
    answer:
      "No experience needed. That's the beauty of being on a team — you get support from that rep and their team.",
  },
  {
    question: 'How much time does it take?',
    answer:
      'The time needed depends on your goals and how you run your independent business. Review the official policies and plan a schedule that is realistic for you.',
  },
  {
    question: 'Will I make money?',
    answer:
      'Income is not guaranteed and results vary. Read the current Income Disclosure Statement and consider your costs, time, and goals before enrolling.',
  },
  {
    question: 'Is joining a team the same as signing up for Sparkle Suite?',
    answer:
      'No. Joining a Bomb Party team is about becoming (or exploring becoming) an independent rep with that company. Sparkle Suite is a separate website and show toolkit some reps use for their customers. Sparkle Suite is not affiliated with Bomb Party.',
  },
]

const CUSTOMER_PRIVACY_FAQ: readonly CustomerFaqItem[] = [
  {
    question: 'Does this site sell my information?',
    answer:
      "Sparkle Suite / Neon Rabbit Digital Services states that it does not sell personal information or SMS opt-in data. See the Suite Privacy Policy on yoursparklesuite.com. Your rep's own Bomb Party and social practices are separate.",
  },
  {
    question: 'Will I get texts from this site?',
    answer:
      'Only if you opt in. Message frequency may vary; message and data rates may apply; consent is not a condition of purchase. Reply STOP to opt out, HELP for help. Customer email and SMS tools from Sparkle Suite are still rolling out — if your rep offers updates, follow the consent language on their form.',
  },
]

export const CUSTOMER_FAQ_SECTIONS: readonly CustomerFaqSection[] = [
  {
    id: 'dance-floor',
    eyebrow: 'One dancer for one dancer',
    title: 'Dance Floor FAQ',
    intro:
      'Find out which dancers belong together and what happens when you ask your rep to review a choice.',
    items: [...DANCE_FLOOR_FAQ, ...DANCE_FLOOR_EXTRA],
  },
  {
    id: 'live-lineup',
    eyebrow: 'Show night',
    title: 'Live lineup and show night',
    intro: 'Follow the lineup and find the next live without hunting through comments.',
    items: LIVE_LINEUP_FAQ,
  },
  {
    id: 'join-team',
    eyebrow: 'Thinking of joining?',
    title: 'Join the team',
    intro:
      'Join Team pages are optional per rep. Starter packs, income, and enrollment belong on official Bomb Party pages and your team lead — not as Sparkle Suite product promises.',
    items: JOIN_TEAM_FAQ,
  },
  {
    id: 'privacy',
    eyebrow: 'Your info',
    title: 'Accounts and privacy',
    intro: 'How this site treats your information and messages.',
    items: CUSTOMER_PRIVACY_FAQ,
  },
]

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function faqLinks(options: CustomerFaqOptions) {
  const slug = options.publicSiteSlug?.trim().toLowerCase()
  if (options.customDomain) return { home: '/', danceFloor: '/trade', faq: '/faq', join: '/join' }
  if (slug) return { home: `/${slug}`, danceFloor: `/${slug}/trade`, faq: `/${slug}/faq`, join: `/${slug}/join` }
  const suffix = options.repId ? `?c=${encodeURIComponent(options.repId)}` : ''
  return {
    home: `/amethyst/Homepage.html${suffix}`,
    danceFloor: `/amethyst/Trade.html${suffix}`,
    faq: `/faq${suffix}`,
    join: `/amethyst/Join.html${suffix}`,
  }
}

export async function renderCustomerFaq(request: Request, options: CustomerFaqOptions = {}) {
  const data = await loadAmethystPreviewTemplateData({
    repId: options.repId,
    publicSiteSlug: options.publicSiteSlug,
  })
  if (options.repId && data.homepage.footerLinks.home === '/amethyst/Homepage.html') {
    return new Response('FAQ temporarily unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  const links = faqLinks(options)
  const origin = resolveSparkleRequestOrigin(request)
  const canonicalUrl = new URL(links.faq, origin).toString()
  const businessName = escapeHtml(data.homepage.businessName)
  const title = `FAQ | ${data.homepage.businessName}`
  const description = `Answers about the Dance Floor, Live lineup, and more from ${data.homepage.businessName}.`
  const showJoin = Boolean(data.homepage.footerLinks.joinTeam)
  const year = new Date().getFullYear()
  const jumpHtml = TOPIC_JUMP.map(
    (topic) =>
      `<a class="faq-jump-link" href="#${escapeHtml(topic.id)}">${escapeHtml(topic.label)}</a>`,
  ).join('<span class="faq-jump-sep" aria-hidden="true">·</span>')

  let firstOpenDone = false
  const continuousItemsHtml = CUSTOMER_FAQ_SECTIONS.map((section) => {
    const groupLabel = `
        <div class="faq-group" id="${escapeHtml(section.id)}">
          <p class="faq-group-label">${escapeHtml(
            section.id === 'privacy'
              ? 'Accounts'
              : section.id === 'live-lineup'
                ? 'Live Lineup'
                : section.id === 'join-team'
                  ? 'Join Team'
                  : 'Dance Floor',
          )}</p>`
    const items = section.items
      .map((item) => {
        const open = !firstOpenDone ? ' open' : ''
        firstOpenDone = true
        const draftBadge = item.draft
          ? `<span class="faq-draft-pill">${escapeHtml(item.draftNote ?? DRAFT_NOTE)}</span>`
          : ''
        const draftNote = item.draft
          ? `<p class="faq-draft-note">${escapeHtml(item.draftNote ?? DRAFT_NOTE)}</p>`
          : ''
        return `
          <details class="faq-item"${open}>
            <summary>${escapeHtml(item.question)}${draftBadge}<span aria-hidden="true" class="faq-plus">+</span></summary>
            ${draftNote}
            <p>${escapeHtml(item.answer)}</p>
          </details>`
      })
      .join('')
    return `${groupLabel}
          <div class="faq-questions">${items}
          </div>
        </div>`
  }).join('')

  const bombPartyLink = `<a class="faq-external" href="${escapeHtml(BOMB_PARTY_FAQ_URL)}" target="_blank" rel="noopener noreferrer">Bomb Party FAQ</a>`
  const scopeLine = `<p class="faq-scope">This page is about this Sparkle Suite site — Dance Floor, Live Lineup, Join Team, and accounts. For Bomb Party product, shipping, or company questions, see the official ${bombPartyLink}.</p>`
  const sealSvg = `<svg class="faq-seal" aria-hidden="true" viewBox="0 0 64 64"><circle cx="32" cy="32" fill="#ffffff" r="30" stroke="currentColor" stroke-width="0.75"/><text fill="currentColor" font-family="'Playfair Display', Georgia, serif" font-size="32" font-style="italic" font-weight="500" text-anchor="middle" x="32" y="42">S</text></svg>`
  const tiktokIcon = `<svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18"><path d="M14.2 3.1c.5 2.6 2 4.4 4.5 4.7v2.8a7.7 7.7 0 0 1-4.4-1.4v6.6a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v2.9a3 3 0 1 0 2.1 2.8V3.1h2.7Z"/></svg>`
  const youtubeIcon = `<svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18"><path d="M23 12.2s0-3.2-.4-4.6a3 3 0 0 0-2.1-2.1C18.9 5 12 5 12 5s-6.9 0-8.5.5a3 3 0 0 0-2.1 2.1C1 9 1 12.2 1 12.2s0 3.2.4 4.6a3 3 0 0 0 2.1 2.1C5.1 19.4 12 19.4 12 19.4s6.9 0 8.5-.5a3 3 0 0 0 2.1-2.1c.4-1.4.4-4.6.4-4.6ZM9.8 15.5V8.9l6.2 3.3-6.2 3.3Z"/></svg>`
  const suiteCta = `
    <aside class="faq-suite-cta" aria-labelledby="faq-suite-cta-title" data-band="night">
      <p class="faq-eyebrow">For reps</p>
      <h2 id="faq-suite-cta-title">Want your own Sparkle Suite?</h2>
      <p>Get a polished customer site and live-show tools built for your brand. Join the free build queue — no payment to get in line.</p>
      <div class="faq-suite-cta-actions">
        <a class="faq-cta" href="${escapeHtml(SPARKLE_SUITE_BUILD_QUEUE_URL)}" target="_blank" rel="noopener noreferrer">Join the build queue <span aria-hidden="true">→</span></a>
        <a class="faq-cta-secondary" href="${escapeHtml(SPARKLE_SUITE_HOME_URL)}" target="_blank" rel="noopener noreferrer">yoursparklesuite.com</a>
      </div>
    </aside>`
  const bottomLinks = `
    <div class="faq-bottom-links">
      <p>Still have Bomb Party questions? See the official ${bombPartyLink}.</p>
      <div class="faq-next" data-band="blush">
        <div>
          <p class="faq-eyebrow">Ready to explore?</p>
          <h3>Find your next dancer.</h3>
          <p>Browse the dancers currently available from ${businessName}.</p>
        </div>
        <a class="faq-cta" href="${escapeHtml(links.danceFloor)}">Explore the Dance Floor <span aria-hidden="true">→</span></a>
      </div>
    </div>
    ${suiteCta}`

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Sparkle Suite" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <link rel="icon" type="image/png" href="/icon" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,500&display=swap" />
  <link rel="stylesheet" href="/amethyst/faq.css?v=20260930-customer-faq-landing-theme" />
</head>
<body class="faq-page" style="--paper:#fcf8f6;--blush:#fff6fa;--ink:#402924;--night:#1b1218;--night-top:#2a1822;--magenta:#ee2c9b;--accent:#ee2c9b;">
  <a class="faq-skip" href="#main">Skip to questions</a>
  <header class="faq-header">
    <div class="faq-header-inner">
      <a class="faq-brand" href="${escapeHtml(SPARKLE_SUITE_HOME_URL)}" aria-label="Sparkle Suite home">${sealSvg}<span>Sparkle Suite</span></a>
      <nav aria-label="Explore">
        <a href="${escapeHtml(links.home)}">Home</a>
        <a href="${escapeHtml(links.danceFloor)}">Dance Floor</a>
        ${showJoin ? `<a href="${escapeHtml(links.join)}">Join Team</a>` : ''}
        <a href="${escapeHtml(links.faq)}" aria-current="page">FAQ</a>
        <a href="/portfolio">Portfolio</a>
        <a href="/demo">Demo</a>
      </nav>
    </div>
  </header>
  <main id="main">
    <section class="faq-hero" aria-labelledby="faq-title" data-band="night">
      <div class="faq-hero-inner">
        <p class="faq-eyebrow">Here to help · ${businessName}</p>
        <h1 id="faq-title">FAQ</h1>
        <p>Answers to your questions, all in one place.</p>
        ${scopeLine}
      </div>
    </section>
    <nav class="faq-jump" aria-label="FAQ topics" data-band="paper">
      <div class="faq-jump-inner">${jumpHtml}</div>
    </nav>
    <section class="faq-continuous" aria-label="All FAQ questions" data-band="paper">
      ${continuousItemsHtml}
    </section>
    ${bottomLinks}
  </main>
  <footer class="faq-footer" data-band="paper">
    <a class="faq-footer-brand" href="${escapeHtml(SPARKLE_SUITE_HOME_URL)}" aria-label="Sparkle Suite home">${sealSvg}<span>Sparkle Suite</span></a>
    <nav aria-label="Footer links">
      <a href="/faq" aria-current="page">FAQ</a>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/terms-and-conditions">Terms and Conditions</a>
      <a href="https://yoursparklefinder.com" target="_blank" rel="noopener noreferrer">Sparkle Finder</a>
    </nav>
    <nav class="faq-social" aria-label="Sparkle Suite channels">
      <a aria-label="Sparkle Suite on TikTok" href="https://www.tiktok.com/@yoursparklesuite.com" target="_blank" rel="noopener noreferrer">${tiktokIcon}<span>TikTok</span></a>
      <a aria-label="Sparkle Suite on YouTube" href="https://www.youtube.com/@SparkleSuite" target="_blank" rel="noopener noreferrer">${youtubeIcon}<span>YouTube</span></a>
    </nav>
    <p class="faq-footer-disclaimer">© ${year} Sparkle Suite · ${renderSparkleSuitePoweredByLinkHtml()} · Sparkle Suite is an independent tool for reps. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.</p>
  </footer>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
