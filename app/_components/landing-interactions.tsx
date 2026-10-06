'use client'

import Image from 'next/image'
import Link from 'next/link'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Pause, Play, Sparkles } from 'lucide-react'
import type { FounderAvailability } from '@/lib/sparkle-suite/founder-availability'
import styles from './landing-experience.module.css'

const unavailable: FounderAvailability = { status: 'unavailable', remaining: null, checkedAt: null }
const AvailabilityContext = createContext<FounderAvailability>(unavailable)

export function FounderAvailabilityProvider({ children, initialAvailability = unavailable }: {
  children: ReactNode
  initialAvailability?: FounderAvailability
}) {
  const [availability, setAvailability] = useState(initialAvailability)
  useEffect(() => {
    let active = true
    let pending: AbortController | null = null
    async function refresh() {
      if (document.hidden) return
      pending?.abort()
      const controller = new AbortController()
      pending = controller
      const timeout = window.setTimeout(() => controller.abort(), 7000)
      try {
        const response = await fetch('/api/public/founder-availability', { cache: 'no-store', signal: controller.signal })
        const data = await response.json() as FounderAvailability
        const valid = response.ok && ((data.status === 'available' && Number.isInteger(data.remaining) && data.remaining! > 0 && data.remaining! <= 20) || (data.status === 'full' && data.remaining === 0))
        if (active && pending === controller) setAvailability(valid ? data : unavailable)
      } catch {
        // Smoke already rendered the live count. A dropped refresh must not
        // replace that count with the unconfirmed fallback.
        if (active && pending === controller && process.env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke') setAvailability(unavailable)
      } finally { window.clearTimeout(timeout) }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { active = false; pending?.abort(); window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  return <AvailabilityContext.Provider value={availability}>{children}</AvailabilityContext.Provider>
}

export function FounderSpotLabel({ large = false }: { large?: boolean }) {
  const availability = useContext(AvailabilityContext)
  const label = availability.status === 'available'
    ? `${availability.remaining} founder ${availability.remaining === 1 ? 'spot' : 'spots'} remaining.`
    : availability.status === 'full' ? 'A new chapter starts here.' : 'Now building Sparkle Suite sites.'
  return <span className={large ? styles.spotLarge : styles.spotLabel} aria-live="polite">{label}</span>
}

export function FounderStrip() {
  const availability = useContext(AvailabilityContext)
  const available = availability.status === 'available'
  return <aside className={styles.founderStrip} aria-label="Founder availability">
    <div className={styles.founderStripInner}>
      <div className={styles.founderCount} aria-hidden="true">
        {available ? <><span>Only</span><strong>{availability.remaining}</strong></> : <Sparkles size={26} />}
      </div>
      <div className={styles.founderCopy}>
        <p className={styles.founderHeadline} aria-live="polite" aria-atomic="true">
          {available ? <><span className={styles.visuallyHidden}>Only {availability.remaining} </span>founder {availability.remaining === 1 ? 'spot' : 'spots'} remaining.</> : availability.status === 'full' ? 'Founder spots are filled.' : 'Now building Sparkle Suite sites.'}
        </p>
        <p className={styles.founderSupporting}>{available ? 'Get in at the start. Secure your first-year discount.' : 'Join the build queue. Let’s talk about your next steps.'}</p>
      </div>
      <a href="#pricing" className={styles.founderCta}>See the offer <ArrowRight size={16} aria-hidden="true" /></a>
    </div>
  </aside>
}

export function FounderOffer({ compact = false }: { compact?: boolean }) {
  const availability = useContext(AvailabilityContext)
  const founder = availability.status === 'available'
  return <article className={`${styles.offer} ${compact ? styles.compactOffer : ''}`} aria-label={founder ? 'Sparkle Suite founding rep pricing' : 'Sparkle Suite standard pricing'}>
    <span className={styles.offerLabel}>{founder ? 'Founding rep rate' : 'Sparkle Suite Standard'}</span>
    <p className={styles.price}><strong>{founder ? '$49.99' : '$74.99'}</strong><span>/ month</span></p>
    <p className={styles.priceTerm}>{founder ? '$74.99/month after your first 12 paid service months.' : 'Monthly subscription from checkout.'}</p>
    <dl className={styles.priceDetails}>
      <div><dt>One-time setup</dt><dd>$49.99</dd></div>
      <div><dt>First checkout</dt><dd>{founder ? '$99.98' : '$124.98'} <span>+ applicable tax</span></dd></div>
    </dl>
    <p className={styles.finePrint}>Setup is non-refundable. Your subscription starts at checkout.</p>
    {availability.status === 'unavailable' && <p className={styles.finePrint}>Founder availability is temporarily unconfirmed. Any eligible founding rate will be confirmed at checkout.</p>}
    {availability.status === 'full' && <p className={styles.finePrint}>All founder spots have been allocated. You can still join at the standard rate.</p>}
    {!compact && <Link className={styles.primaryButton} href="/prelaunch#waitlist">Join the build queue <ArrowRight size={18} aria-hidden="true" /></Link>}
    <p className={styles.offerDisclaimer}>Joining the queue does not reserve a founder rate. Eligibility is confirmed at checkout.</p>
  </article>
}

export function SiteStyleShowcase() {
  const stage = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
    })
    if (stage.current) observer.observe(stage.current)
    return () => observer.disconnect()
  }, [])
  return <div className={styles.styleShowcase}>
    <figure id="site-style-preview" className={styles.unicornFigure}>
      <div className={styles.unicornWindow}>
        <div className={styles.browserBar} aria-hidden="true"><em>Chasing Unicorns</em></div>
        <div className={styles.unicornStage} ref={stage}>
          {visible ? <iframe
            loading="lazy"
            title="Chasing Unicorns homepage, the full customer site with the unicorn scene playing in the hero"
            src="/marketing/chasing-unicorns"
            width={1200}
            height={1260}
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            tabIndex={-1}
          /> : <Image src="/marketing/demo-themes/amethyst.webp" alt="Chasing Unicorns customer website preview" width={1200} height={850} style={{width:'100%',height:'auto'}} />}
        </div>
      </div>
      <figcaption>Chasing Unicorns. The whole homepage, with the scene playing in the hero. <span>One look. The tools your customers already love.</span></figcaption>
    </figure>
  </div>
}

const tools = [
  { label: 'Dance Floor', title: 'Trade pieces, not endless messages.', body: 'Give customers a clear place to browse available pieces and send a trade request. Keep the details together on your side.', src: '/sparkle-suite/landing/dance-floor-sparkly-butterflies.webp', alt: 'Sparkly Butterflies Dance Floor with four complete jewelry cards, each showing the photo, name, and trade button', width: 1102, height: 688 },
  { label: 'Live calendar', title: 'Your next live, easy to find.', body: 'Put upcoming shows, featured collections, and show details where customers can find them before you go live.', src: '/sparkle-suite/landing/calendar-upcoming-reveals.webp', alt: 'Upcoming shows with a featured Sunday October 4 reveal and Friday Morning Fizz Jam, each card complete through its buttons', width: 932, height: 710 },
] as const

export function ShowToolsTour() {
  const [selected, setSelected] = useState(0)
  const [playing, setPlaying] = useState(false)
  const tool = tools[selected]
  useEffect(() => {
    if (!playing) return
    const timeout = window.setTimeout(() => {
      if (selected === tools.length - 1) setPlaying(false)
      else setSelected(selected + 1)
    }, 5000)
    return () => window.clearTimeout(timeout)
  }, [playing, selected])
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [])
  return <div className={styles.toolsLayout}>
    <div className={styles.toolsCopy}>
      <h2>Less scramble.<br /><em>More showtime.</em></h2>
      <p>Let customers discover the jewelry, find your next live, and browse the Dance Floor—even from their phone. You keep the show moving.</p>
      <div className={styles.toolChoices} role="group" aria-label="Explore Sparkle Suite show tools">
        {tools.map((item, index) => <button type="button" key={item.label} aria-pressed={selected === index} aria-controls="show-tool-preview" onClick={() => { setPlaying(false); setSelected(index) }}>{item.label}</button>)}
      </div>
      <div className={styles.toolDescription} aria-live={playing ? 'off' : 'polite'}><h3>{tool.title}</h3><p>{tool.body}</p></div>
      <button className={styles.tourButton} type="button" onClick={() => { if (!playing) setSelected(0); setPlaying(!playing) }}>{playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}{playing ? 'Pause tour' : 'Play the quick tour'}</button>
      <span className={styles.tourNote}>Product previews. No live customer activity.</span>
    </div>
    <figure id="show-tool-preview" className={styles.toolFigure}>
      <div className={`${styles.toolImage} ${styles.fillFrame}`} key={selected} style={{ aspectRatio: `${tool.width} / ${tool.height}` }}><Image src={tool.src} alt={tool.alt} width={tool.width} height={tool.height} sizes="(max-width: 900px) 92vw, 720px" /></div>
      <figcaption>{tool.label} <span aria-hidden="true">·</span> Inside Sparkle Suite</figcaption>
      <div className={styles.tourProgress} aria-label={`Preview ${selected + 1} of ${tools.length}`}>{tools.map((item, i) => <span key={item.label} data-current={selected === i} />)}</div>
    </figure>
  </div>
}

export function IncludedFeatures() {
  return <ul className={styles.included} aria-label="Included in Sparkle Suite">{['Your customer site', 'Live queue & Dance Floor', 'Live event calendar', 'Nic-Nac support'].map(item => <li key={item}><Check size={19} aria-hidden="true" />{item}</li>)}</ul>
}
