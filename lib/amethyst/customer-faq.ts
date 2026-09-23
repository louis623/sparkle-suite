import { getAmethystAppearancePreset } from './appearance-presets'
import { loadAmethystPreviewTemplateData } from './preview-template-data'
import { resolveSparkleRequestOrigin } from '@/lib/seo/sparkle-crawl'

interface CustomerFaqOptions {
  repId?: string | null
  publicSiteSlug?: string | null
  customDomain?: boolean
}

const TONES: Record<string, { bg: string; elevated: string }> = {
  lavender: { bg: '#E8DFF5', elevated: '#F2EBFA' },
  suiteBlush: { bg: '#fcf8f6', elevated: '#fffefd' },
  blackDiamond: { bg: '#080808', elevated: '#15110f' },
  moonstone: { bg: '#15121d', elevated: '#211b2c' },
  alpineOpal: { bg: '#fdf2f8', elevated: '#f0f9ff' },
  emeraldGarden: { bg: '#f8f7f0', elevated: '#ffffff' },
  gnomeGarden: { bg: '#173126', elevated: '#FFF3D6' },
  neonButterfly: { bg: '#120414', elevated: '#261029' },
  roseGold: { bg: '#fff5f6', elevated: '#fffafa' },
  garnet: { bg: '#FFE5DD', elevated: '#fff8f5' },
  amber: { bg: '#FAFAFA', elevated: '#fffaf5' },
  velvet: { bg: '#FFE8FF', elevated: '#fff7ff' },
  roseQuartz: { bg: '#FAFAFA', elevated: '#fff7ff' },
}

const FONTS: Record<string, string> = {
  italiana: '"Italiana", "Playfair Display", Georgia, serif',
  playfair: '"Playfair Display", Georgia, serif',
  greatVibes: '"Great Vibes", "Playfair Display", cursive',
  boska: '"Boska", "Playfair Display", Georgia, serif',
  switzer: '"Switzer", "DM Sans", Arial, sans-serif',
  melodrama: '"Melodrama", "Playfair Display", Georgia, serif',
  bitter: '"Bitter", Georgia, serif',
  archivoBlack: '"Archivo Black", Arial, sans-serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  sharpie: '"Sharpie", "Playfair Display", Georgia, serif',
  dmSans: '"DM Sans", Arial, sans-serif',
  archivo: '"Archivo", Arial, sans-serif',
  nunito: '"Nunito", Arial, sans-serif',
  quicksand: '"Quicksand", Arial, sans-serif',
  lato: '"Lato", Arial, sans-serif',
  ranade: '"Ranade", Arial, sans-serif',
  inter: '"Inter", Arial, sans-serif',
}

const DARK_TONES = new Set(['blackDiamond', 'moonstone', 'gnomeGarden', 'neonButterfly', 'halloweenPumpkinWitch'])

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
    question: 'Does MSRP affect the decision?',
    answer: 'The MSRP shown for a dancer is for reference only. It does not decide which dancers belong together or whether your rep approves your request.',
  },
  {
    question: 'Should I save my reveal?',
    answer: 'We recommend taking a screenshot before leaving the reveal screen, but it is optional. Please crop out personal and order information before sharing it.',
  },
  {
    question: 'What if my choice is flagged?',
    answer: 'If your choice is flagged, you will see why the dancers do not appear to match and may see compatible dancers currently available. You can still send your original choice to your rep for review. Your rep sees the request, can correct mistaken details, and makes the final decision using the Dance Floor rules.',
  },
] as const

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
  const preset = getAmethystAppearancePreset(data.appearancePreset).values
  const tone = TONES[preset.bgTone] ?? TONES.suiteBlush
  const dark = DARK_TONES.has(preset.bgTone)
  const links = faqLinks(options)
  const origin = resolveSparkleRequestOrigin(request)
  const canonicalUrl = new URL(links.faq, origin).toString()
  const businessName = escapeHtml(data.homepage.businessName)
  const title = `FAQ | ${data.homepage.businessName}`
  const description = `Answers to Dance Floor questions from ${data.homepage.businessName}.`
  const showJoin = Boolean(data.homepage.footerLinks.joinTeam)
  const backgroundClass = preset.bgTreatment === 'confetti' ? 'fx-confetti' : `bg-${preset.bgTreatment}`
  const surfaceClass = preset.cardSurface === 'holographic' ? 'fx-holographic' : `surface-${preset.cardSurface}`
  const bodyClasses = [
    'homepage', 'faq-page', backgroundClass, surfaceClass,
    `btn-${preset.buttonEnergy}`, dark ? 'faq-dark' : 'faq-light',
  ].join(' ')
  const themeStyle = [
    `--hp-primary:${preset.primaryColor}`,
    `--hp-accent:${preset.accentColor}`,
    `--hp-bg:${tone.bg}`,
    `--hp-bg-elevated:${tone.elevated}`,
    `--hp-display-font:${FONTS[preset.headingFont] ?? FONTS.playfair}`,
    `--hp-body-font:${FONTS[preset.bodyFont] ?? FONTS.dmSans}`,
    `--hp-heading-weight:${preset.headingWeight}`,
  ].join(';')
  const items = DANCE_FLOOR_FAQ.map(({ question, answer }, index) => `
          <details class="faq-item"${index === 0 ? ' open' : ''}>
            <summary>${escapeHtml(question)}<span aria-hidden="true" class="faq-plus">+</span></summary>
            <p>${escapeHtml(answer)}</p>
          </details>`).join('')

  const html = `<!doctype html>
<html lang="en" style="${escapeHtml(themeStyle)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${businessName}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <link rel="icon" type="image/png" href="/icon" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin />
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=boska@400,500,600,700&f[]=switzer@400,500,600,700&f[]=melodrama@400,500,600,700&f[]=sharpie@400,500,600,700&f[]=ranade@400,500,600,700&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Black&family=Bitter:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Great+Vibes&family=Italiana&family=Lato:wght@400;500;700&family=Nunito:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&display=swap" />
  <link rel="stylesheet" href="/amethyst/tokens.css" />
  <link rel="stylesheet" href="/amethyst/components.css" />
  <link rel="stylesheet" href="/amethyst/homepage.css" />
  <link rel="stylesheet" href="/amethyst/gnome-garden.css" />
  <link rel="stylesheet" href="/amethyst/neon-butterfly.css" />
  <link rel="stylesheet" href="/amethyst/halloween-pumpkin-witch.css" />
  <link rel="stylesheet" href="/amethyst/faq.css" />
</head>
<body class="${escapeHtml(bodyClasses)}">
  <a class="faq-skip" href="#main">Skip to questions</a>
  <header class="faq-header">
    <div class="faq-header-inner">
      <a class="faq-brand" href="${escapeHtml(links.home)}">${businessName}</a>
      <nav aria-label="Customer site">
        <a href="${escapeHtml(links.home)}">Home</a>
        <a href="${escapeHtml(links.danceFloor)}">Dance Floor</a>
        ${showJoin ? `<a href="${escapeHtml(links.join)}">Join Team</a>` : ''}
        <a href="${escapeHtml(links.faq)}" aria-current="page">FAQ</a>
      </nav>
    </div>
  </header>
  <main id="main">
    <section class="faq-hero" aria-labelledby="faq-title">
      <div class="faq-hero-inner">
        <p class="faq-eyebrow">Here to help</p>
        <h1 id="faq-title">FAQ</h1>
        <p>Answers to your questions, all in one place.</p>
      </div>
    </section>
    <section class="faq-section" id="dance-floor" aria-labelledby="dance-floor-title">
      <div class="faq-section-heading">
        <p class="faq-eyebrow">One dancer for one dancer</p>
        <h2 id="dance-floor-title">Dance Floor FAQ</h2>
        <p>Find out which dancers belong together and what happens when you ask your rep to review a choice.</p>
      </div>
      <div class="faq-questions">${items}
      </div>
      <div class="faq-next">
        <div>
          <p class="faq-eyebrow">Ready to explore?</p>
          <h3>Find your next dancer.</h3>
          <p>Browse the dancers currently available from ${businessName}.</p>
        </div>
        <a class="faq-cta" href="${escapeHtml(links.danceFloor)}">Explore the Dance Floor <span aria-hidden="true">→</span></a>
      </div>
    </section>
  </main>
  <footer class="faq-footer">
    <span>© ${new Date().getFullYear()} ${businessName} · Powered by Sparkle Suite</span>
    <nav aria-label="Footer">
      <a href="${escapeHtml(links.home)}">Home</a>
      <a href="${escapeHtml(links.danceFloor)}">Dance Floor</a>
      ${showJoin ? `<a href="${escapeHtml(links.join)}">Join Team</a>` : ''}
      <a href="${escapeHtml(links.faq)}" aria-current="page">FAQ</a>
    </nav>
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
