import { ArrowRight, CalendarDays, Check, Gem, ListOrdered, Users } from 'lucide-react'
import { featuredSuiteTools } from '@/lib/sparkle-suite/tools-content'
import { QueueLink } from './queue-link'
import styles from './tools-overview.module.css'

const icons = { 'dance-floor': Gem, 'live-lineup': ListOrdered, 'live-show-calendar': CalendarDays, 'team-management': Users }

export function ToolsOverview() {
  return <section className={styles.section} id="workspace-proof" aria-labelledby="tools-title">
    <div className={styles.container}>
      <div className={styles.intro}>
        <h2 id="tools-title">More than a <em>website.</em></h2>
        <p>Tools for your shows, your team, and the work in between.</p>
      </div>
      <div className={styles.grid}>
        {featuredSuiteTools.map(tool => {
          const Icon = icons[tool.id]
          return <article className={styles.card} key={tool.id}>
            <span className={styles.icon}><Icon size={30} strokeWidth={1.6} aria-hidden="true" /></span>
            <h3>{tool.name}</h3>
            <p>{tool.description}</p>
            <ul>{tool.benefits.map(benefit => <li key={benefit}><Check size={18} aria-hidden="true" />{benefit}</li>)}</ul>
            <QueueLink className={styles.explore} href={`/tools#${tool.id}`}>Explore {tool.name}<ArrowRight size={18} aria-hidden="true" /></QueueLink>
          </article>
        })}
      </div>
      <div className={styles.more}>
        <div><h3>There’s more inside your Suite.</h3><p>Explore the tools that help you manage your business, support your team, and prepare for your next live.</p></div>
        <QueueLink href="/tools" className={styles.allTools}>Explore all tools <ArrowRight size={18} aria-hidden="true" /></QueueLink>
      </div>
    </div>
  </section>
}
