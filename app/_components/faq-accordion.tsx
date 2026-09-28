'use client'

import type { SyntheticEvent } from 'react'

import {
  sparkleSuiteFaqGroups,
  type SparkleSuiteFaqRun,
} from '@/lib/sparkle-suite/faq-page-content'
import styles from './faq-experience.module.css'

function FaqRun({ run }: { run: SparkleSuiteFaqRun }) {
  if (typeof run === 'string') return run
  return <a href={run.href}>{run.label}</a>
}

function closeSiblingQuestions(current: HTMLDetailsElement) {
  const group = current.closest('[data-faq-group]')
  group?.querySelectorAll('details').forEach((node) => {
    if (node !== current) node.open = false
  })
}

export function FaqAccordion() {
  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open) return
    closeSiblingQuestions(event.currentTarget)
  }

  return (
    <div className={styles.groups}>
      {sparkleSuiteFaqGroups.map((group) => (
        <section
          aria-labelledby={`${group.id}-title`}
          className={styles.group}
          data-faq-group={group.id}
          id={group.id}
          key={group.id}
        >
          <h2 id={`${group.id}-title`}>{group.title}</h2>
          {group.questions.map((item) => (
            <details className={styles.item} id={item.id} key={item.id} onToggle={handleToggle}>
              <summary>{item.question}</summary>
              {item.paragraphs.map((paragraph, index) => (
                <p key={`${item.id}-${index}`}>
                  {paragraph.map((run, runIndex) => (
                    <FaqRun key={`${item.id}-${index}-${runIndex}`} run={run} />
                  ))}
                </p>
              ))}
            </details>
          ))}
        </section>
      ))}
    </div>
  )
}
