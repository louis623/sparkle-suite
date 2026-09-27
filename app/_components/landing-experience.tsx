import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { sparkleSuitePublicLandingContent as content, sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'
import { SparkleSeal } from './sparkle-suite-public-chrome'
import { SparkleSuitePublicAccountAction } from './SparkleSuitePublicAccountAction'
import { SparkleSuitePublicNicNac } from './sparkle-suite-public-nic-nac'
import { FounderAvailabilityProvider, FounderOffer, FounderSpotLabel, FounderStrip, IncludedFeatures, ShowToolsTour, SiteStyleShowcase } from './landing-interactions'
import styles from './landing-experience.module.css'

export function MarketingHeader({ intake = false, current = 'home' }: { intake?: boolean; current?: 'home' | 'portfolio' }) {
  const onPortfolio = current === 'portfolio'
  const homeHref = intake || onPortfolio ? '/' : '#top'
  return <header className={styles.header}>
    <a className={styles.brand} href={homeHref} aria-label="Sparkle Suite home"><SparkleSeal className={styles.seal} /><span>Sparkle Suite</span></a>
    <nav className={styles.navigation} aria-label="Explore Sparkle Suite">
      {onPortfolio ? <Link className={styles.pageLink} href="/">Home</Link> : null}
      {onPortfolio ? <>
        <a className={styles.sectionLink} href="#rep-highlights">Rep highlights</a>
        <a className={styles.sectionLink} href="#community-themes">Community themes</a>
        <a className={styles.sectionLink} href="#holiday-themes">Holiday themes</a>
      </> : <>
        <a className={styles.sectionLink} href={`${intake ? '/' : ''}#customer-site-proof`}>Your site</a>
        <a className={styles.sectionLink} href={`${intake ? '/' : ''}#workspace-proof`}>Show tools</a>
        <a className={styles.sectionLink} href={`${intake ? '/' : ''}#pricing`}>Founding offer</a>
      </>}
      <Link className={styles.pageLink} href="/portfolio" aria-current={onPortfolio ? 'page' : undefined}>Portfolio</Link>
      <span className={styles.soonLink}>Demo soon</span>
    </nav>
    <nav className={styles.account} aria-label="Account links"><SparkleSuitePublicAccountAction /></nav>
  </header>
}

export function MarketingFooter() {
  return <footer className={styles.footer}>
    <Link className={styles.brand} href="/" aria-label="Sparkle Suite home"><SparkleSeal className={styles.seal} /><span>Sparkle Suite</span></Link>
    <nav aria-label="Footer links">{[...content.footer.links, ...content.footer.socialLinks].filter(link => link.href !== '#').map(link => <a key={link.label} href={link.href}>{link.label}</a>)}</nav>
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

export function LandingExperience() {
  return <FounderAvailabilityProvider><main className={styles.page}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <div id="top"><MarketingHeader /></div>
    <FounderStrip />
    <section className={styles.hero} id="main-content" aria-labelledby="landing-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Now building Sparkle Suite sites</p>
        <h1 id="landing-title">Your brand.<br />Your show.<br /><span>A setup that <em>shines.</em></span></h1>
        <p className={styles.heroBody}>A polished website and live-show tools for Bomb Party reps. Give customers one place to find your show, follow the line, and keep the sparkle going.</p>
        <div className={styles.heroActions}><Link className={styles.primaryButton} href="/prelaunch#waitlist">Join the build queue <ArrowRight size={18} aria-hidden="true" /></Link><a className={styles.textLink} href="#customer-site-proof">Explore your possibilities <ArrowRight size={16} aria-hidden="true" /></a></div>
        <p className={styles.heroNote}>Sign up for your spot in line. No payment to join.</p>
      </div>
      <figure className={styles.heroFigure}>
        <div className={styles.heroScene}>
          <div className={styles.heroStage}>
            <div className={styles.heroWindow}><div className={styles.browserBar} aria-hidden="true"><span /><span /><span /><em>Desktop · Halloween</em></div><Image src="/sparkle-suite/landing/hero-halloween-desktop-v1.webp" alt="Halloween Pumpkin and Witch desktop theme preview of a Sparkle Suite customer site, with a dark night hero and shop actions" width={1440} height={825} sizes="(max-width: 600px) 90vw, (max-width: 1050px) 560px, 44vw" preload /></div>
            <div className={styles.heroPhone}>
              <div className={styles.phoneLabel}>Mobile · Rose Gold</div>
              <div className={styles.phoneScreen}><Image src="/sparkle-suite/landing/hero-rose-mobile-v3.webp" alt="Rose Gold mobile theme preview of the same demo customer site, showing phone navigation, the complete hero and shop buttons" width={390} height={1020} sizes="(max-width: 600px) 210px, (max-width: 1050px) 185px, 16vw" /></div>
            </div>
          </div>
        </div>
        <figcaption>Your look. Beautiful on phones, tablets, and desktop.</figcaption>
      </figure>
    </section>
    <section className={styles.siteSection} id="customer-site-proof" aria-labelledby="site-title"><h2 id="site-title">A site that feels like <em>you.</em></h2><p className={styles.sectionSubtitle}>Your colors. Your personality. A polished customer experience on phones, tablets, and desktop.</p><SiteStyleShowcase /></section>
    <section className={styles.toolsSection} id="workspace-proof" aria-label="Your live-show tools"><ShowToolsTour /></section>
    <section className={styles.pricingSection} id="pricing" aria-labelledby="pricing-title">
      <div className={styles.pricingCopy}><h2 id="pricing-title">Get in at the start.</h2><FounderSpotLabel large /><p>Give your business a home that looks like you—and a setup that makes showtime easier.</p><IncludedFeatures /><p className={styles.finePrint}>Customer email and SMS updates are coming soon.</p></div><FounderOffer />
    </section>
    <section className={styles.faqSection} id="questions" aria-labelledby="questions-title">
      <div><h2 id="questions-title">A few things you might be wondering.</h2><div className={`sparkle-landing-v2 ${styles.assistant}`}><SparkleSuitePublicNicNac /></div></div>
      <div className={styles.questions}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
    </section>
    <section className={styles.finalCta}><h2>Your next chapter looks good on you.</h2><Link className={styles.primaryButton} href="/prelaunch#waitlist">Join the build queue <ArrowRight size={18} aria-hidden="true" /></Link></section>
    <MarketingFooter />
  </main></FounderAvailabilityProvider>
}
