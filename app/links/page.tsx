import type { Metadata } from 'next'
import Image from 'next/image'

import { sparkleLinksPage } from '@/lib/sparkle-suite/links-page-content'

import styles from './links.module.css'

export const metadata: Metadata = {
  title: {
    absolute: 'Louis Chapman | Sparkle Suite and Sparkle Finder',
  },
  description: 'Links to Sparkle Suite and Sparkle Finder.',
  alternates: {
    canonical: '/links',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function LinksPage() {
  const page = sparkleLinksPage
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.profile}>
          <Image
            className={styles.headshot}
            src={page.headshot.src}
            alt={page.name}
            width={page.headshot.width}
            height={page.headshot.height}
            priority
            unoptimized
          />
          <h1 className={styles.name}>{page.name}</h1>
          <p className={styles.tagline}>{page.tagline}</p>
        </header>

        <nav className={styles.cards} aria-label="Sparkle Suite and Sparkle Finder">
          {page.cards.map((card) => {
            const external = card.href.startsWith('http')
            return (
              <a
                key={card.id}
                className={`${styles.card} ${card.id === 'finder' ? styles.finderCard : styles.suiteCard}`}
                href={card.href}
                data-card={card.id}
                {...(external ? { target: '_blank', rel: 'noopener' } : {})}
              >
                <Image
                  className={styles.logo}
                  src={card.logo.src}
                  alt={card.logo.alt}
                  width={1100}
                  height={280}
                  unoptimized
                />
                <p className={styles.summary}>{card.summary}</p>
                <span className={styles.button}>{card.cta}</span>
              </a>
            )
          })}
        </nav>

        <footer className={styles.footer}>
          <a href={page.youtube.href} target="_blank" rel="noopener noreferrer">
            {page.youtube.label}
          </a>
          <p className={styles.disclaimer}>{page.disclaimer}</p>
        </footer>
      </div>
    </main>
  )
}
