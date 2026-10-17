import Link from 'next/link'
import { MarketingFooter, MarketingHeader } from './landing-experience'
import {
  articleDate,
  articleIndexDescription,
  articleIndexJsonLd,
  articleIndexTitle,
  type SuiteArticle,
} from '@/lib/sparkle-suite/articles'
import styles from './suite-articles.module.css'

export function SuiteArticleIndex({ articles }: { articles: readonly SuiteArticle[] }) {
  const jsonLd = JSON.stringify(articleIndexJsonLd(articles)).replace(/</g, '\\u003c')
  return (
    <div className={`suite-marketing ${styles.page}`}>
      <a className={styles.skipLink} href="#article-index">Skip to articles</a>
      <MarketingHeader current="article" />
      <main id="article-index">
        <header className={styles.hero}>
          <div className={styles.reading}>
            <Link href="/faq">Back to FAQs</Link>
            <h1>{articleIndexTitle}</h1>
            <p>{articleIndexDescription}</p>
          </div>
        </header>
        <section className={styles.collection} aria-labelledby="article-index-title">
          <div className={styles.container}>
            <h2 id="article-index-title">Published articles</h2>
            {articles.length ? (
              <ul className={styles.cards}>
                {articles.map((article) => (
                  <li key={article.slug}>
                    <article>
                      <h3><Link href={`/faq/articles/${article.slug}`}>{article.title}</Link></h3>
                      <p>{article.description}</p>
                      {article.publishedAt && <time dateTime={article.publishedAt}>{articleDate(article.publishedAt)}</time>}
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Published articles will be listed here.</p>
            )}
          </div>
        </section>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </main>
      <MarketingFooter current="faq" />
    </div>
  )
}
