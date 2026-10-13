'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { suiteToolNavigation } from '@/lib/sparkle-suite/tools-content'
import { QueueLink } from './queue-link'
import styles from './tools-experience.module.css'

export function ToolsNavigation() {
  const [active, setActive] = useState('dance-floor')
  const mobile = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const syncHash = () => {
      const id = window.location.hash.slice(1)
      if (suiteToolNavigation.some(tool => tool.id === id)) setActive(id)
    }
    syncHash()
    window.addEventListener('hashchange', syncHash)
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
    }, { rootMargin: '-10% 0px -65% 0px' })
    for (const tool of suiteToolNavigation) {
      const section = document.getElementById(tool.id)
      if (section) observer.observe(section)
    }
    return () => {observer.disconnect();window.removeEventListener('hashchange', syncHash)}
  }, [])
  const links = suiteToolNavigation.map(tool => <QueueLink href={`#${tool.id}`} key={tool.id} aria-current={active === tool.id ? 'location' : undefined} onClick={() => {setActive(tool.id);if(mobile.current) mobile.current.open=false}}>{tool.name}</QueueLink>)
  return <aside className={styles.navigation}>
    <nav className={styles.desktopNav} aria-label="Explore the tools"><p>Explore the tools</p>{links}<QueueLink href="/#workspace-proof" className={styles.back}>Back to Home</QueueLink></nav>
    <details className={styles.mobileNav} ref={mobile}><summary>Jump to a tool <ChevronDown size={18} aria-hidden="true" /></summary><nav aria-label="Jump to a tool">{links}</nav></details>
  </aside>
}
