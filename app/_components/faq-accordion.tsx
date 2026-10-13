import { QueueLink } from '@/app/_components/queue-link'
import { sparkleSuiteFaqGroups, type SparkleSuiteFaqRun } from '@/lib/sparkle-suite/faq-page-content'
import styles from './faq-experience.module.css'

function FaqRun({ run }: { run: SparkleSuiteFaqRun }) {
  if (typeof run === 'string') return run
  return <QueueLink href={run.href}>{run.label}</QueueLink>
}

export function FaqAccordion() {
  return (
    <div className={styles.groups}>
      {sparkleSuiteFaqGroups.map((group) => (
        <section aria-labelledby={`${group.id}-title`} className={styles.group} id={group.id} key={group.id}>
          <h2 id={`${group.id}-title`}>{group.title}</h2>
          {group.questions.map((item) => (
            <details className={styles.item} id={item.id} key={item.id} open={item.id === 'build-queue' || item.id === 'founder-reservation'}>
              <summary>{item.question}</summary>
              {item.paragraphs.map((paragraph, index) => (
                <p key={`${item.id}-${index}`}>
                  {paragraph.map((run, runIndex) => <FaqRun key={`${item.id}-${index}-${runIndex}`} run={run} />)}
                </p>
              ))}
            </details>
          ))}
        </section>
      ))}
    </div>
  )
}
