import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { gridDemoEmbeds } from '@/lib/sparkle-suite/demo-page-content'
import { sparkleSuitePublicLandingContent as content, sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'
import { MarketingSocialLinks } from './marketing-social-links'
import { LandingHero } from './landing-hero'
import type { LandingDemo } from '@/lib/sparkle-suite/landing-demo-model'
import { SparkleSuitePublicAccountAction } from './SparkleSuitePublicAccountAction'
import { SparkleSuitePublicNicNac } from './sparkle-suite-public-nic-nac'
import type { FounderAvailability } from '@/lib/sparkle-suite/founder-availability'
import { FounderAvailabilityProvider, FounderOffer, FounderSpotLabel, IncludedFeatures, ShowToolsTour, SiteStyleShowcase } from './landing-interactions'
import styles from './landing-experience.module.css'

export function MarketingHeader({ intake = false, current = 'home' }: { intake?: boolean; current?: 'home' | 'portfolio' | 'demo' | 'faq' }) {
  const onPortfolio = current === 'portfolio'
  const onDemo = current === 'demo'
  const onSubpage = onPortfolio || onDemo || current === 'faq'
  const homeHref = intake || onSubpage ? '/' : '#top'
  return <header className={styles.header}>
    <a className={styles.brand} href={homeHref} aria-label="Sparkle Suite workspace"><img alt="" className={styles.logo} src="/brand/sparkle-suite-logo-transparent.png" width="1100" height="280" /></a>
    <nav className={styles.navigation} aria-label="Explore Sparkle Suite">
      {onSubpage ? <Link className={styles.pageLink} href="/">Home</Link> : null}
      {onPortfolio ? <>
        <a className={styles.sectionLink} href="#rep-highlights">Rep highlights</a>
        <a className={styles.sectionLink} href="#community-themes">Community themes</a>
        <a className={styles.sectionLink} href="#holiday-themes">Holiday themes</a>
      </> : onDemo ? <>
        <a className={styles.sectionLink} href="#featured">Featured</a>
        <a className={styles.sectionLink} href="#show-stories">Show stories</a>
        {gridDemoEmbeds().length > 0 ? <a className={styles.sectionLink} href="#clips">Clips</a> : null}
      </> : intake ? <>
        <Link className={styles.sectionLink} href="/#customer-site-proof">Your site</Link>
        <Link className={styles.sectionLink} href="/#workspace-proof">Show tools</Link>
        <Link className={styles.sectionLink} href="/#pricing">Founding offer</Link>
      </> : null}
      <Link className={styles.pageLink} href="/portfolio" aria-current={onPortfolio ? 'page' : undefined}>Portfolio</Link>
      <a className={styles.pageLink} href={onSubpage || intake ? "/#pricing" : "#pricing"}>Pricing</a>
      <Link className={styles.pageLink} href="/faq">FAQ</Link>
    </nav>
    <nav className={styles.account} aria-label="Account links"><SparkleSuitePublicAccountAction /></nav>
  </header>
}

export function MarketingFooter({ current }: { current?: 'home' | 'portfolio' | 'demo' | 'faq' } = {}) {
  const textLinks = [...content.footer.links, ...content.footer.socialLinks].filter((link) => link.label !== 'TikTok' && link.label !== 'YouTube')
  return <footer className={styles.footer}>
    <Link className={styles.brand} href="/" aria-label="Sparkle Suite workspace"><img alt="" className={styles.logo} src="/email-signatures/sparkle-suite-logo.png" /></Link>
    <nav aria-label="Footer links">{textLinks.map((link) => <a key={link.label} href={link.href} aria-current={current === 'faq' && link.href === '/faq' ? 'page' : undefined}>{link.label}</a>)}</nav>
    <MarketingSocialLinks />
    <p>{sparkleSuitePublicLandingSafety.disclaimer}</p>
  </footer>
}

const questions = [
  ['What happens when I join the build queue?', 'Your details are saved so we can follow up about your site and next steps. There is no payment when you join, and joining the queue does not reserve a founder rate.'],
  ['Can I keep my domain and existing site?', 'Tell us what you already have. We’ll review the right way to connect your domain and plan your site together. Joining the queue does not move your current website or email.'],
  ['How does the founding rep rate work?', 'Eligible founding reps pay $49.99/month for their first 12 paid service months, then $74.99/month. A one-time, non-refundable $49.99 setup fee is charged at checkout. Applicable tax is additional. Availability and eligibility are confirmed at checkout.'],
  ['Can I use Sparkle Suite on my phone?', 'Yes. Your customer site and rep workspace are designed for mobile and desktop. Some live-show connections have their own setup requirements; we’ll help you understand what your show needs.'],
  ['Are email and SMS updates ready?', 'Customer email and SMS updates are coming soon. Your customer site, Live queue, Dance Floor, Live event calendar, and Nic-Nac are the core of the current experience.'],
  ['Is Sparkle Suite part of Bomb Party?', sparkleSuitePublicLandingSafety.disclaimer],
] as const

export function LandingExperience({ initialAvailability, demo = null }: { initialAvailability?: FounderAvailability; demo?: LandingDemo | null } = {}) {
  return <FounderAvailabilityProvider initialAvailability={initialAvailability}><main className={styles.page}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <div id="top"><MarketingHeader /></div>
    <LandingHero demo={demo} />
    <section className={styles.siteSection} id="customer-site-proof" aria-labelledby="site-title"><h2 id="site-title">A site that feels like <em>you.</em></h2><p className={styles.sectionSubtitle}>Your colors. Your personality. A polished customer experience on phones, tablets, and desktop.</p><SiteStyleShowcase /></section>
    <section className={styles.toolsSection} id="workspace-proof" aria-label="Your live-show tools"><ShowToolsTour /></section>
    <section className={styles.pricingSection} id="pricing" aria-labelledby="pricing-title">
      <div className={styles.pricingCopy}><h2 id="pricing-title">Get in at the start.</h2><FounderSpotLabel large /><p>Give your business a home that looks like you—and a setup that makes showtime easier.</p><IncludedFeatures /><p className={styles.finePrint}>Customer email and SMS updates are coming soon.</p></div><FounderOffer />
    </section>
    <section className={styles.faqSection} id="questions" aria-labelledby="questions-title">
      <div><h2 id="questions-title">A few things you might be wondering.</h2><div className={`sparkle-landing-v2 ${styles.assistant}`}><SparkleSuitePublicNicNac /></div></div>
      <div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{answer}</p></details>)}<p className={styles.moreAnswers}><Link href="/faq">More answers <ArrowRight size={16} aria-hidden="true" /></Link></p></div>
    </section>
    <section className={styles.finalCta}><h2>Your next chapter looks good on you.</h2><Link className={styles.primaryButton} href="/prelaunch#waitlist">Join the build queue <ArrowRight size={18} aria-hidden="true" /></Link></section>
    <MarketingFooter />
  </main></FounderAvailabilityProvider>
}
