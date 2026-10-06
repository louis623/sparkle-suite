import Image from 'next/image'
import { ArrowRight, ArrowUpRight, ChevronDown } from 'lucide-react'
import { LineupDemonstration } from './lineup-demonstration'
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
  { label:'Live Lineup', title:<>Who’s in line?<br />It’s right <em>there.</em></>, text:'Your Live Lineup sits at the top of your site, alongside your announcement and Dance Floor tickers. Shoppers can tap a name or open the full lineup without leaving the page.', src:'', width:760, height:520, alt:'' },
  { label:'Event calendar', title:<>Give your next show<br />a place to <em>live.</em></>, text:'Keep your upcoming shows in one place.', src:'/sparkle-suite/landing/calendar-upcoming-reveals.webp', width:932, height:710, alt:'Event calendar showing upcoming live shows' },
] as const

export function LandingExperience({ initialAvailability, demo = null }: { initialAvailability?: FounderAvailability; demo?: LandingDemo | null }) {
  const sites = sparkleSuitePortfolioContent.carousels[0].slides.filter(site => ['sparkly-butterflies','go-for-the-bling','blingkitchen'].includes(site.id))
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
            {portfolioMotion[site.id] ? <ProductPeekVideo {...portfolioMotion[site.id]} alt={`Recorded animated hero from ${site.title}`} label={site.title} /> : <Image src={site.src} alt={site.alt} width={site.width} height={site.height} sizes="(max-width: 760px) 90vw, 31vw" />}
          </div>
          <figcaption><a href={site.href} target="_blank" rel="noopener noreferrer">Visit {site.linkLabel} <span aria-hidden="true">↗</span></a></figcaption>
        </figure>)}</div>
        <QueueLink href="/portfolio" className={styles.outlineButton}>Explore the portfolio <ArrowRight size={18} aria-hidden="true" /></QueueLink>
      </div>
    </section>
    <section className={styles.toolsSection} id="workspace-proof" aria-labelledby="tools-title"><div className={styles.container}>
      <h2 id="tools-title">Your live-show <em>tools.</em></h2>
      <div className={styles.toolRows}>{demonstrations.map(tool => <div className={styles.toolRow} key={tool.label}>
        <div><p className={styles.eyebrow}>{tool.label}</p><h3>{tool.title}</h3><p className={styles.toolBody}>{tool.text}</p></div>
        {tool.label === 'Live Lineup' ? <LineupDemonstration /> : <figure><Image src={tool.src} alt={tool.alt} width={tool.width} height={tool.height} sizes="(max-width: 760px) 90vw, 60vw" /></figure>}
      </div>)}</div>
    </div></section>
    <section className={styles.teamSection} id="team-tools" aria-labelledby="team-title"><div className={styles.container}>
      <p className={styles.teamEyebrow}>Team Management + New Rep Onboarding</p>
      <h2 id="team-title">A strong start for<br />the people on <em>your team.</em></h2>
      <p className={styles.teamIntro}>Your website is only part of it. Sparkle Suite also gives you a place to manage your team and a private guide you can send to each new rep.</p>
      <div className={styles.teamRow}>
        <div><p className={styles.teamEyebrow}>For the team lead</p><h3>Keep your team<br />close at hand.</h3>
          <p>Manage each person’s photo, show name, and social links. Choose which cards appear on your public Join Team page, and keep new members hidden until you’re ready.</p>
          <p>From their saved card, create a private onboarding link, see their progress, and open their questions in your Message Center.</p>
          <p className={styles.teamNote}>Sending an onboarding link does not publish their team card.</p>
        </div>
        <figure><Image src="/marketing/team-management-preview.webp" alt="Actual Team Management private onboarding panel with sample teammate, progress and link controls" width={1024} height={950} sizes="(max-width:760px) 90vw, 60vw" /><figcaption>Team lead’s workspace · sample data</figcaption></figure>
      </div>
      <div className={styles.teamRow}>
        <div><p className={styles.teamEyebrow}>For the new rep</p><h3>Send a guide.<br />Give them a <em>starting point.</em></h3>
          <p>They open a personal welcome from your team, then work through six guided steps—from training access and payout setup to their first live, shipping, and customer follow-up.</p>
          <ul><li>Practical instructions and a saved completion checklist.</li><li>Supply lists for live setup, packing, and organization.</li><li>Official resources and a place to ask their team lead.</li></ul>
          <p>They keep the same private link. You can follow their progress and reply to their questions from your workspace.</p>
        </div>
        <figure><Image src="/marketing/new-rep-onboarding-preview.webp" alt="Actual New Rep Onboarding guide showing six starting steps for a sample rep" width={1080} height={1027} sizes="(max-width:760px) 90vw, 60vw" /><figcaption>New rep’s private guide · sample data</figcaption></figure>
      </div>
      <p className={styles.teamIncluded}>Team Management and New Rep Onboarding are included with an active Sparkle Suite workspace.</p>
      <dl className={styles.workspaceExtras} aria-label="More in your workspace">
        <div><dt>Jewelry Library</dt><dd>Look up pieces by collection, type, material, and stone.</dd></div>
        <div><dt>Customer List</dt><dd>Keep the details your customers choose to share in one place.</dd></div>
        <div><dt>Message Center</dt><dd>Open onboarding questions and keep the conversation with each new rep together.</dd></div>
      </dl>
    </div></section>
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
        <div className={styles.watchLinks}><h3>Watch Sparkle Suite demos.</h3><p className={styles.toolBody}>See the themes move, then watch how the tools work in a full demonstration.</p><a href={sparkleMarketingTikTokUrl + '/video/7684058046800071966'} target="_blank" rel="noopener noreferrer" className={styles.outlineButton}>Watch the featured TikTok demo <ArrowUpRight size={18} aria-hidden="true" /></a><a href={sparkleMarketingTikTokUrl} target="_blank" rel="noopener noreferrer" className={styles.outlineButton}>Watch on TikTok <ArrowUpRight size={18} aria-hidden="true" /></a><a href={sparkleMarketingYouTubeUrl} target="_blank" rel="noopener noreferrer" className={styles.outlineButton}>Watch on YouTube <ArrowUpRight size={18} aria-hidden="true" /></a></div>
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
