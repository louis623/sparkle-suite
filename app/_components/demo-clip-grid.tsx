'use client'

import { useState } from 'react'
import { DemoEmbedFrame } from '@/app/_components/demo-embed-frame'
import { MarketingSocialLinks } from '@/app/_components/marketing-social-links'
import {
  demoClipFilters,
  filterDemoEmbeds,
  sparkleSuitePublicDemoEmbeds,
  sparkleSuiteDemoContent,
  type DemoClipFilter,
} from '@/lib/sparkle-suite/demo-page-content'
import styles from './demo-experience.module.css'

export function DemoClipGrid() {
  const [filter, setFilter] = useState<DemoClipFilter>('all')
  const clips = filterDemoEmbeds(sparkleSuitePublicDemoEmbeds, filter).filter((embed) => embed.role !== 'featured')

  return (
    <div>
      <div className={styles.chips} role="group" aria-label="Filter clips">
        {demoClipFilters.map((item) => (
          <button
            aria-pressed={filter === item.id}
            key={item.id}
            onClick={() => setFilter(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {clips.length === 0 ? (
          <div className={styles.clipEmpty}>
            <p>{sparkleSuiteDemoContent.clips.empty}</p>
            <MarketingSocialLinks />
          </div>
        ) : (
          <ul className={styles.clipGrid}>
            {clips.map((embed) => (
              <li key={embed.id}>
                <DemoEmbedFrame embed={embed} variant="card" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
