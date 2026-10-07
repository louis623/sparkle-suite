import Image from 'next/image'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { ToolsOverview } from './tools-overview'
import { ProductPeekVideo } from './product-peek-video'
import { halloweenHeroMotion } from '@/lib/sparkle-suite/halloween-hero-motion'
import { portfolioMotion } from '@/lib/sparkle-suite/portfolio-motion'
import { LandingHero } from './landing-hero'
import { QueueLink } from './queue-link'
import { SparkleSuitePublicAccountAction } from './SparkleSuitePublicAccountAction'
import { SparkleMarketingFooter, sparkleMarketingTikTokUrl, sparkleMarketingYouTubeUrl } from './sparkle-marketing-footer/SparkleMarketingFooter'
import { FounderAvailabilityProvider, FounderOffer, IncludedFeatures } from './landing-interactions'
import type { FounderAvailability } from '@/lib/sparkle-suite/founder-availability'
import type { LandingDemo } from '@/lib/sparkle-suite/landing-demo-model'
import { sparkleSuitePortfolioContent } from '@/lib/sparkle-suite/portfolio-content'
import styles from './landing-experience.module.css'

export function MarketingHeader({ intake = false, current = 'home' }: { intake?: boolean; current?: 'home' | 'portfolio' | 'demo' | 'faq' | 'tools' | 'article' }) {
  const subpage = current !== 'home' || intake
  return <header className={styles.header}>
    <QueueLink href="/" className={styles.brand} aria-label="Sparkle Suite home"><Image alt="" className={styles.logo} src="/brand/sparkle-suite-logo-transparent.png" width={1100} height={280} unoptimized /></QueueLink>
    <nav className={styles.navigation} aria-label="Explore Sparkle Suite">
      {subpage ? <QueueLink href="/" className={styles.pageLink}>Home</QueueLink> : null}
      <QueueLink href="/tools" className={styles.pageLink} aria-current={current === 'tools' ? 'page' : undefined}>Tools</QueueLink>
      <QueueLink href="/portfolio" className={styles.pageLink} aria-current={current === 'portfolio' ? 'page' : undefined}>Portfolio</QueueLink>
      <QueueLink href={subpage ? '/#pricing' : '#pricing'} className={styles.pageLink}>Pricing</QueueLink>
      <QueueLink href="/faq" className={styles.pageLink} aria-current={current === 'faq' ? 'page' : undefined}>FAQ</QueueLink>
    </nav>
    <nav className={styles.account} aria-label="Account links"><SparkleSuitePublicAccountAction /></nav>
    <QueueLink className={`${styles.primaryButton} ${styles.headerCta}`}>Join the build queue <ArrowRight size={16} aria-hidden="true" /></QueueLink>
  </header>
}

export function MarketingFooter(_props: { current?: 'home' | 'portfolio' | 'demo' | 'faq' | 'tools' } = {}) {
  void _props
  return <SparkleMarketingFooter suiteHref="/" />
}

const questions = [
  ['What happens after I join the queue?', 'I’ll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid. No payment when you join the queue.'],
  ['Does joining reserve founder pricing?', 'No. Founder pricing is available to reps who move forward after our call, while spots last.'],
  ['Can I keep my domain?', 'Tell us what you already have. We’ll review the right way to connect your domain and plan your site together. Joining the queue does not move your website or email.'],
] as const

export function LandingExperience({ initialAvailability, demo = null }: { initialAvailability?: FounderAvailability; demo?: LandingDemo | null }) {
  const sites = sparkleSuitePortfolioContent.carousels[0].slides.filter(site => ['mile-high-fizz','go-for-the-bling','sparkly-butterflies'].includes(site.id))
  return <FounderAvailabilityProvider initialAvailability={initialAvailability}><main className={`suite-marketing ${styles.page}`}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <div id="top"><MarketingHeader /></div>
    <LandingHero demo={demo} />
    <section className={styles.siteSection} id="customer-site-proof" aria-labelledby="site-title">
      <div className={styles.container}>
        <h2 id="site-title">A site that feels like <em>you.</em></h2>
        <p className={styles.sectionSubtitle}>Your colors. Your personality. A polished customer experience on phones, tablets, and desktop.</p>
        <div className={styles.siteGallery}>{sites.map(site => <figure key={site.id}>
          <div className={styles.siteWindow}>
            <div className={styles.browserBar}><span aria-hidden="true">● ● ●</span>{site.linkLabel}</div>
            {portfolioMotion[site.id] ? <ProductPeekVideo {...portfolioMotion[site.id]} alt={`Recorded website header and complete hero from ${site.title}`} label={site.title} /> : <Image src={site.src} alt={site.alt} width={site.width} height={site.height} sizes="(max-width: 760px) 90vw, 31vw" />}
          </div>
          <figcaption><a href={site.href} target="_blank" rel="noopener noreferrer">Visit {site.linkLabel} <span aria-hidden="true">↗</span></a></figcaption>
        </figure>)}</div>
        <QueueLink href="/portfolio" className={styles.outlineButton}>Explore the portfolio <ArrowRight size={18} aria-hidden="true" /></QueueLink>
      </div>
    </section>
    <ToolsOverview />
    <section className={styles.founderSection} aria-labelledby="founder-title"><div className={styles.founderLayout}>
      <Image className={styles.founderPhoto} src="/marketing/louis-headshot.webp" alt="Louis, founder of Sparkle Suite" width={520} height={710} sizes="(max-width: 760px) 70vw, 340px" />
      <div><h2 id="founder-title">Hi, I’m <em>Louis.</em></h2><p>My sister became a Bomb Party rep and asked me to help with her website. I saw how many reps needed the same thing, so I built Sparkle Suite and started my own small, veteran-owned business. It’s been a lot of fun, and I’ve met so many great people along the way.</p></div>
    </div></section>
    <section className={styles.watchSection} id="watch" aria-labelledby="watch-title"><div className={styles.container}>
      <h2 id="watch-title">See it in <em>action.</em></h2>
      <div className={styles.watchLayout}>
        <div className={styles.watchPoster}>
          <ProductPeekVideo {...halloweenHeroMotion.witch} alt="Real recording of the animated Halloween Pumpkin and Witch customer-site hero" />
          <span className={styles.watchCaption}>A real theme, in motion.</span>
        </div>
        <div className={styles.watchLinks}>
          <h3>Watch Sparkle Suite demos.</h3>
          <p className={styles.toolBody}>See the themes move, then watch how the tools work in a full demonstration.</p>
          <a href={sparkleMarketingTikTokUrl} target="_blank" rel="noopener noreferrer" className={`${styles.socialButton} ${styles.tikTokButton}`}>Watch on TikTok <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" width="26" height="26"><path d="M14.2 3.1c.5 2.6 2 4.4 4.5 4.7v2.8a7.7 7.7 0 0 1-4.4-1.4v6.6a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v2.9a3 3 0 1 0 2.1 2.8V3.1h2.7Z" /></svg></a>
          <a href={sparkleMarketingYouTubeUrl} target="_blank" rel="noopener noreferrer" className={`${styles.socialButton} ${styles.youTubeButton}`}>Watch on YouTube <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" width="26" height="26"><path d="M23 12.2s0-3.2-.4-4.6a3 3 0 0 0-2.1-2.1C18.9 5 12 5 12 5s-6.9 0-8.5.5a3 3 0 0 0-2.1 2.1C1 9 1 12.2 1 12.2s0 3.2.4 4.6a3 3 0 0 0 2.1 2.1C5.1 19.4 12 19.4 12 19.4s6.9 0 8.5-.5a3 3 0 0 0 2.1-2.1c.4-1.4.4-4.6.4-4.6ZM9.8 15.5V8.9l6.2 3.3-6.2 3.3Z" /></svg></a>
        </div>
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
