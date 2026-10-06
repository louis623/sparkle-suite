'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import type { FounderAvailability } from '@/lib/sparkle-suite/founder-availability'
import { QueueLink } from './queue-link'
import styles from './landing-experience.module.css'

const unavailable: FounderAvailability = { status:'unavailable', remaining:null, checkedAt:null }
const AvailabilityContext = createContext<FounderAvailability>(unavailable)

export function FounderAvailabilityProvider({ children, initialAvailability = unavailable }: { children:ReactNode; initialAvailability?:FounderAvailability }) {
  const [availability,setAvailability] = useState(initialAvailability)
  useEffect(() => {
    let active=true
    let pending:AbortController|null=null
    async function refresh() {
      if(document.hidden) return
      pending?.abort()
      const controller=new AbortController()
      pending=controller
      const timeout=window.setTimeout(()=>controller.abort(),7000)
      try {
        const response=await fetch('/api/public/founder-availability',{cache:'no-store',signal:controller.signal})
        const data=await response.json() as FounderAvailability
        const valid=response.ok && ((data.status==='available' && Number.isInteger(data.remaining) && data.remaining!>0 && data.remaining!<=20) || (data.status==='full' && data.remaining===0))
        if(active && pending===controller) setAvailability(valid?data:unavailable)
      } catch {
        if(active && pending===controller) setAvailability(unavailable)
      } finally {window.clearTimeout(timeout)}
    }
    // The first render is server supplied. Refresh later without making first paint depend on JavaScript.
    const interval=window.setInterval(()=>void refresh(),60_000)
    document.addEventListener('visibilitychange',refresh)
    return ()=>{active=false;pending?.abort();window.clearInterval(interval);document.removeEventListener('visibilitychange',refresh)}
  },[])
  return <AvailabilityContext.Provider value={availability}>{children}</AvailabilityContext.Provider>
}

export function FounderSpotLabel({large=false}:{large?:boolean}) {
  const availability=useContext(AvailabilityContext)
  if(availability.status!=='available') return null
  return <span className={large?styles.spotLarge:styles.spotLabel} aria-live="polite">{availability.remaining} founder {availability.remaining===1?'spot':'spots'} remaining.</span>
}

// Kept for existing callers; no reservation language or hardcoded counter.
export function FounderStrip() {
  return <aside aria-label="Founder availability"><FounderSpotLabel /><a href="#pricing">See the offer</a></aside>
}

export function FounderOffer({compact=false}:{compact?:boolean}) {
  const availability=useContext(AvailabilityContext)
  // Unconfirmed availability must not flash standard pricing or fabricate scarcity.
  const founder=availability.status!=='full'
  return <article className={`${styles.offer} ${compact?styles.compactOffer:''}`} aria-label={founder?'Sparkle Suite founding rep pricing':'Sparkle Suite standard pricing'}>
    <FounderSpotLabel large />
    <div className={styles.priceGrid}>
      <div className={styles.priceCell}><p className={styles.price}><strong>{founder?'$49.99':'$74.99'}</strong>/mo</p><p>{founder?'for your first 12 paid months':'monthly subscription'}</p></div>
      {founder?<div className={styles.priceCell}><p>Then</p><p className={styles.price}><strong>$74.99</strong>/mo</p></div>:null}
      <div className={styles.priceCell}><p>One-time setup</p><p className={styles.price}><strong>$49.99</strong></p></div>
    </div>
    <div className={styles.offerSummary}>
      <div><h3>First month + setup: <strong>{founder?'$99.98':'$124.98'}</strong></h3><p>Paid after our call.</p></div>
      <p>{founder?'Founder pricing is available to reps who move forward after our call, while spots last.':'Founder spots are filled. You can still join the build queue at the standard rate.'}</p>
    </div>
    {!compact?<div className={styles.offerAction}>
      <QueueLink className={styles.primaryButton}>Join the build queue <ArrowRight size={18} aria-hidden="true" /></QueueLink>
      <div><strong>No payment when you join the queue.</strong><p>Join the build queue and I’ll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid.</p></div>
    </div>:null}
    <p className={styles.offerDisclaimer}>Joining the queue does not reserve founder pricing.</p>
    <p className={styles.finePrint}>Applicable tax is additional. The setup fee is non-refundable.</p>
  </article>
}

export function IncludedFeatures() {
  return <ul className={styles.included} aria-label="Included in Sparkle Suite">{['Your website and themes','Dance Floor','Live Lineup','Event calendar','Nic-Nac rep assistant'].map(item=><li key={item}><Check size={18} aria-hidden="true" />{item}</li>)}</ul>
}
