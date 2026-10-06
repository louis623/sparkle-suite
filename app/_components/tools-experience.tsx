import Image from 'next/image'
import { ArrowRight, BookOpen, Gem, MessageCircle, Users } from 'lucide-react'
import { MarketingFooter, MarketingHeader } from './landing-experience'
import { LineupDemonstration } from './lineup-demonstration'
import { QueueLink } from './queue-link'
import { ToolsNavigation } from './tools-navigation'
import styles from './tools-experience.module.css'

export function ToolsExperience() {
  return <main className={`suite-marketing ${styles.page}`}>
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <MarketingHeader current="tools" />
    <section className={styles.hero} id="main-content" aria-labelledby="tools-page-title">
      <div><h1 id="tools-page-title">Explore your <em>Suite.</em></h1><p>Take a closer look at the tools behind your show.</p></div>
    </section>
    <div className={styles.layout}>
      <ToolsNavigation />
      <div className={styles.sections}>
        <section id="dance-floor" className={styles.detail} aria-labelledby="dance-floor-title">
          <p className={styles.eyebrow}>Dance Floor</p>
          <h2 id="dance-floor-title">A place to browse<br />and <em>explore.</em></h2>
          <p className={styles.lead}>Give your pieces a home on your website, so shoppers can explore your Dance Floor in their own time.</p>
          <div className={styles.proofRow}>
            <div><h3>Keep your pieces together.</h3><p>Add jewelry listings with photos and details. Shoppers can search and filter the Dance Floor to find pieces that catch their eye.</p><ul><li>A dedicated place to browse beyond the live.</li><li>Photos and details help shoppers explore what you’ve listed.</li></ul><p className={styles.note}>The Jewelry Library supports your jewelry workflow; it is part of the workspace, not another customer site to manage.</p></div>
            <figure><Image src="/sparkle-suite/landing/dance-floor-sparkly-butterflies.webp" alt="Dance Floor showing jewelry listings, search, and filters" width={1102} height={688} sizes="(max-width: 900px) 90vw, 45vw" /><figcaption>Customer view · Sparkly Butterflies</figcaption></figure>
          </div>
        </section>
        <section id="live-lineup" className={`${styles.detail} ${styles.lightDetail}`} aria-labelledby="lineup-title">
          <p className={styles.eyebrow}>Live Lineup</p>
          <h2 id="lineup-title">Who’s in line?<br />It’s right <em>there.</em></h2>
          <p className={styles.lead}>Your Live Lineup sits at the top of your site, alongside your announcement and Dance Floor tickers.</p>
          <div className={styles.proofRow}><div><h3>From a quick glance to the full lineup.</h3><p>Shoppers can tap a name or open the full lineup without leaving your website. The compact strip keeps the line close at hand while the rest of your site stays available.</p><ul><li>A visible lineup during your live.</li><li>A full view when shoppers want more detail.</li></ul></div><LineupDemonstration /></div>
        </section>
        <section id="live-show-calendar" className={styles.detail} aria-labelledby="calendar-title">
          <p className={styles.eyebrow}>Live Show Calendar</p>
          <h2 id="calendar-title">Give your next show<br />a place to <em>live.</em></h2>
          <p className={styles.lead}>Keep upcoming shows in one place, with the details shoppers need to plan when to join you.</p>
          <div className={styles.proofRow}><div><h3>A clear place to check what’s next.</h3><p>Add your show date, time, platform, and details from your workspace. Nic-Nac can help you schedule a show, too.</p><ul><li>Share upcoming dates on your customer site.</li><li>Keep show details together as plans change.</li></ul><p className={styles.note}>Customer email and SMS updates are coming soon.</p></div><figure><Image src="/sparkle-suite/landing/calendar-upcoming-reveals.webp" alt="Customer calendar showing upcoming live shows and their details" width={932} height={710} sizes="(max-width:900px) 90vw, 45vw" /><figcaption>Upcoming live shows on a customer site</figcaption></figure></div>
        </section>
        <section id="team-management" className={`${styles.detail} ${styles.lightDetail}`} aria-labelledby="team-title">
          <p className={styles.eyebrow}>Team Management</p>
          <h2 id="team-title">A strong start for<br /><em>your team.</em></h2>
          <p className={styles.lead}>Manage your team’s public presence and give each new rep a private place to get started.</p>
          <div className={styles.proofRow}><div><h3>For the team lead</h3><p>Manage each person’s photo, show name, and social links. Choose which cards appear on your public Join Team page, and keep new members hidden until you’re ready.</p><p>From their saved card, create a private onboarding link, see their progress, and open their questions in your Message Center.</p><p className={styles.note}>Sending an onboarding link does not publish their team card.</p></div><figure><Image src="/marketing/team-management-preview.webp" alt="Team Management private onboarding panel with a sample teammate, progress, and link controls" width={1024} height={950} sizes="(max-width:900px) 90vw, 45vw" /><figcaption>Team lead’s workspace · sample data</figcaption></figure></div>
          <div className={styles.proofRow}><div><h3>New Rep Onboarding</h3><p>Send a private guide with a personal welcome and six starting steps—from training access and payout setup to their first live, shipping, and customer follow-up.</p><ul><li>Practical instructions and a saved completion checklist.</li><li>Supply lists for live setup, packing, and organization.</li><li>Official resources and a place to ask their team lead.</li></ul><p>They keep the same private link. You can follow their progress and reply to their questions from your workspace.</p></div><figure><Image src="/marketing/new-rep-onboarding-preview.webp" alt="New Rep Onboarding guide showing six starting steps for a sample rep" width={1080} height={1027} sizes="(max-width:900px) 90vw, 45vw" /><figcaption>New rep’s private guide · sample data</figcaption></figure></div>
          <p className={styles.included}>Team Management and New Rep Onboarding are included with an active Sparkle Suite workspace.</p>
        </section>
        <section id="nic-nac" className={`${styles.detail} ${styles.assistant}`} aria-labelledby="nic-nac-title">
          <p className={styles.eyebrow}>Nic-Nac · Your rep assistant</p>
          <h2 id="nic-nac-title">A little help with<br />the work <em>between shows.</em></h2>
          <p className={styles.lead}>Tell Nic-Nac what you need to get done. He helps with real tasks inside your paid Sparkle Suite workspace.</p>
          <div className={styles.proofRow}><div><h3>Start with what you need.</h3><ul><li><strong>Add a piece.</strong> Work through the jewelry details and photo for a Dance Floor listing.</li><li><strong>Plan a show.</strong> Get help adding your date, time, platform, and show details to the calendar.</li><li><strong>Update your announcement.</strong> Change the message shown on your site.</li></ul><p>Nic-Nac asks for the details needed to carry out your request. The conversation stays alongside the tools you use to run your workspace.</p><p className={styles.note}>Nic-Nac is included for paying reps. Joining the build queue does not activate a workspace.</p></div><figure className={styles.chatProof}><Image src="/sparkle-suite/landing/nic-nac-add-show-chat.webp" alt="Existing Nic-Nac conversation gathering the platform, date, and time for a new show" width={776} height={736} sizes="(max-width:900px) 90vw, 40vw" /><figcaption>A workspace conversation · gathering show details</figcaption></figure></div>
        </section>
        <section id="workspace-essentials" className={styles.detail} aria-labelledby="essentials-title">
          <p className={styles.eyebrow}>Workspace essentials</p>
          <h2 id="essentials-title">The details,<br /><em>close at hand.</em></h2>
          <p className={styles.lead}>Supporting tools give your information and everyday questions a place to go.</p>
          <dl className={styles.essentials}>
            <div><dt><Gem size={24} aria-hidden="true" />Jewelry Library</dt><dd>Look up pieces by collection, type, material, and stone. Keep it close while working with your jewelry listings.</dd></div>
            <div><dt><Users size={24} aria-hidden="true" />Customer List</dt><dd>Keep the details your customers choose to share in one place.</dd></div>
            <div><dt><MessageCircle size={24} aria-hidden="true" />Message Center</dt><dd>Open onboarding questions and keep the conversation with each new rep together, alongside their progress.</dd></div>
            <div><dt><BookOpen size={24} aria-hidden="true" />Resources &amp; Help</dt><dd>Find workspace guides and answers when you need a starting point or a reminder.</dd></div>
          </dl>
        </section>
      </div>
    </div>
    <section className={styles.close} aria-labelledby="tools-close-title"><h2 id="tools-close-title">Make room for <em>your show.</em></h2><QueueLink className={styles.primaryButton}>Join the build queue <ArrowRight size={18} aria-hidden="true" /></QueueLink><p><strong>No payment when you join the queue.</strong></p><p>Join the build queue and I’ll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid.</p><QueueLink href="/#pricing" className={styles.pricingLink}>See pricing and what’s included</QueueLink></section>
    <MarketingFooter current="tools" />
  </main>
}
