import Link from 'next/link'
import { MarketingHeader, MarketingFooter } from '@/app/_components/landing-experience'
import styles from '@/app/_components/suite-articles.module.css'

export default function ArticleNotFound() {
  return (
    <div className={`suite-marketing ${styles.page}`}>
      <MarketingHeader current="article" />
      <main className={styles.hero}>
        <div className={styles.reading}>
          <h1>Article not found</h1>
          <p>This article isn&apos;t available. Explore our FAQs for answers about Sparkle Suite.</p>
          <p><Link href="/faq">Back to FAQs</Link></p>
        </div>
      </main>
      <MarketingFooter current="faq" />
    </div>
  )
}
