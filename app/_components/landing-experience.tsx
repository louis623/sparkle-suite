import Image from 'next/image'
import { ArrowRight, ArrowUpRight, ChevronDown, Play } from 'lucide-react'
import { LandingHero } from './landing-hero'
import { QueueLink } from './queue-link'
import { SparkleSuitePublicAccountAction } from './SparkleSuitePublicAccountAction'
import { SparkleMarketingFooter, sparkleMarketingTikTokUrl, sparkleMarketingYouTubeUrl } from './sparkle-marketing-footer/SparkleMarketingFooter'
import { FounderAvailabilityProvider, FounderOffer, IncludedFeatures } from './landing-interactions'
import type { FounderAvailability } from '@/lib/sparkle-suite/founder-availability'
import type { LandingDemo } from '@/lib/sparkle-suite/landing-demo-model'
import { sparkleSuitePortfolioContent } from '@/lib/sparkle-suite/portfolio-content'
import styles from './landing-experience.module.css'

export function MarketingHeader({ intake = false, current = 'home' }: { intake?: boolean; current?: 'home' | 'portfolio' | 'demo' | 'faq' }) {
  const subpage = current !== 'home' || intake
  return <header className={styles.header}>
    <QueueLink href="/" className={styles.brand} aria-label="Sparkle Suite home"><Image alt="" className={styles.logo} src="/brand/sparkle-suite-logo-transparent.png" width={1100} height={280} unoptimized /></QueueLink>
    <nav className={styles.navigation} aria-label="Explore Sparkle Suite">
      {subpage ? <QueueLink href="/" className={styles.pageLink}>Home</QueueLink> : null}
      <QueueLink href="/portfolio" className={styles.pageLink} aria-current={current === 'portfolio' ? 'page' : undefined}>Portfolio</QueueLink>
      <QueueLink href={subpage ? '/#pricing' : '#pricing'} className={styles.pageLink}>Pricing</QueueLink>
      <QueueLink href="/faq" className={styles.pageLink} aria-current={current === 'faq' ? 'page' : undefined}>FAQ</QueueLink>
    </nav>
    <nav className={styles.account} aria-label="Account links"><SparkleSuitePublicAccountAction /></nav>
  </header>
}

export function MarketingFooter(_props: { current?: 'home' | 'portfolio' | 'demo' | 'faq' } = {}) {
  void _props
  return <SparkleMarketingFooter suiteHref="/" finderHref="https://yoursparklefinder.com" />
}

const questions = [
  ['What happens after I join the queue?', 'I’ll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid. No payment when you join the queue.'],
  ['Does joining reserve founder pricing?', 'No. Founder pricing is available to reps who move forward after our call, while spots last.'],
  ['Can I keep my domain?', 'Tell us what you already have. We’ll review the right way to connect your domain and plan your site together. Joining the queue does not move your website or email.'],
] as const

const demonstrations = [
  { label:'Dance Floor', title:<>A place to browse<br />and <em>explore.</em></>, text:'Give shoppers a place to browse your Dance Floor.', src:'/sparkle-suite/landing/dance-floor-sparkly-butterflies.webp', width:1102, height:688, alt:'Dance Floor showing jewelry listings and search filters' },
  { label:'Live Lineup', title:<>Keep the show<br />easy to <em>follow.</em></>, text:'Let shoppers follow your Live Lineup.', src:'/sparkle-suite/landing/demo-live-lineup-v1.png', width:1280, height:800, alt:'Live Lineup preview with clearly labelled sample shoppers' },
  { label:'Event calendar', title:<>Give your next show<br />a place to <em>live.</em></>, text:'Keep your upcoming shows in one place.', src:'/sparkle-suite/landing/calendar-upcoming-reveals.webp', width:932, height:710, alt:'Event calendar showing upcoming live shows' },
] as const

export function LandingExperience({ initialAvailability, demo = null }: { initialAvailability?: FounderAvailability; demo?: LandingDemo | null }) {
  const sites = sparkleSuitePortfolioContent.carousels[0].slides.filter(site => ['mile-high-fizz','go-for-the-bling','blingkitchen'].includes(site.id))
  return <FounderAvailabilityProvider initialAvailability={initialAvailability}><main className={`suite-marketing ${styles.page}`}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <div id="top"><MarketingHeader /></div>
    <LandingHero demo={demo} />
    <section className={styles.siteSection} id="customer-site-proof" aria-labelledby="site-title">
      <div className={styles.container}>
        <h2 id="site-title">A site that feels like <em>you.</em></h2>
        <p className={styles.sectionSubtitle}>Your colors. Your personality. A polished customer experience on phones, tablets, and desktop.</p>
        <div className={styles.siteGallery}>{sites.map(site => <figure key={site.id}>
          <a href={site.href} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${site.linkLabel}`} className={styles.siteWindow}>
            <div className={styles.browserBar}><span aria-hidden="true">● ● ●</span>{site.linkLabel}</div>
            <Image src={site.src} alt={site.alt} width={site.width} height={site.height} sizes="(max-width: 760px) 90vw, 31vw" />
          </a>
          <figcaption>{site.linkLabel}</figcaption>
        </figure>)}</div>
        <QueueLink href="/portfolio" className={styles.outlineButton}>Explore the portfolio <ArrowRight size={18} aria-hidden="true" /></QueueLink>
      </div>
    </section>
    <section className={styles.toolsSection} id="workspace-proof" aria-labelledby="tools-title"><div className={styles.container}>
      <h2 id="tools-title">Your live-show <em>tools.</em></h2>
      <div className={styles.toolRows}>{demonstrations.map(tool => <div className={styles.toolRow} key={tool.label}>
        <div><p className={styles.eyebrow}>{tool.label}</p><h3>{tool.title}</h3><p className={styles.toolBody}>{tool.text}</p></div>
        <figure><Image src={tool.src} alt={tool.alt} width={tool.width} height={tool.height} sizes="(max-width: 760px) 90vw, 60vw" /></figure>
      </div>)}</div>
    </div></section>
    <section className={styles.founderSection} aria-labelledby="founder-title"><div className={styles.founderLayout}>
      <Image className={styles.founderPhoto} src="/marketing/louis-headshot.webp" alt="Louis, founder of Sparkle Suite" width={520} height={710} sizes="(max-width: 760px) 70vw, 340px" />
      <div><h2 id="founder-title">Hi, I’m <em>Louis.</em></h2><p>My sister became a Bomb Party rep and asked me to help with her website. I saw how many reps needed the same thing, so I built Sparkle Suite and started my own small, veteran-owned business. It’s been a lot of fun, and I’ve met so many great people along the way.</p></div>
    </div></section>
    <section className={styles.watchSection} id="watch" aria-labelledby="watch-title"><div className={styles.container}>
      <h2 id="watch-title">See it in <em>action.</em></h2>
      <div className={styles.watchLayout}>
        <a href={sparkleMarketingTikTokUrl + '/video/7684058046800071966'} target="_blank" rel="noopener noreferrer" className={styles.watchPoster} aria-label="Watch the featured TikTok demo (opens in a new tab)">
          <Image src="/sparkle-suite/landing/hero-halloween-witch-live.webp" alt="A Halloween customer-site theme featured in Sparkle Suite demonstrations" width={968} height={720} sizes="(max-width: 760px) 90vw, 60vw" />
          <span className={styles.play}><Play size={28} fill="currentColor" aria-hidden="true" /></span>
          <span className={styles.watchCaption}>Watch the featured TikTok demo <ArrowUpRight size={17} aria-hidden="true" /></span>
        </a>
        <div className={styles.watchLinks}><h3>Watch Sparkle Suite demos.</h3><a href={sparkleMarketingTikTokUrl} target="_blank" rel="noopener noreferrer" className={styles.outlineButton}>Watch on TikTok <ArrowUpRight size={18} aria-hidden="true" /></a><a href={sparkleMarketingYouTubeUrl} target="_blank" rel="noopener noreferrer" className={styles.outlineButton}>Watch on YouTube <ArrowUpRight size={18} aria-hidden="true" /></a></div>
      </div>
    </div></section>
    <section className={styles.pricingSection} id="pricing" aria-labelledby="pricing-title"><div className={styles.container}>
      <h2 id="pricing-title">Get in at the <em>start.</em></h2>
      <FounderOffer />
      <IncludedFeatures />
      <p className={styles.finePrint}>Email and SMS updates: coming soon.</p>
    </div></section>
    <section className={styles.faqSection} id="questions" aria-labelledby="questions-title"><div className={styles.container}>
      <h2 id="questions-title">A few things you might be <em>wondering.</em></h2>
      <div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
      <QueueLink className={styles.moreAnswers} href="/faq">Read all FAQs <ArrowRight size={18} aria-hidden="true" /></QueueLink>
    </div></section>
    <section className={styles.finalCta}><h2>Your next chapter looks good on <em>you.</em></h2><QueueLink className={styles.primaryButton}>Join the build queue <ArrowRight size={18} aria-hidden="true" /></QueueLink></section>
    <MarketingFooter />
  </main></FounderAvailabilityProvider>
}
