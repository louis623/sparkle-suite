import Link from 'next/link'
import { MarketingFooter, MarketingHeader } from './landing-experience'
import { articleDate, articleJsonLd, type SuiteArticle } from '@/lib/sparkle-suite/articles'
import styles from './suite-articles.module.css'

export function SuiteArticleExperience({ article }: { article: SuiteArticle }) {
  const jsonLd = JSON.stringify(articleJsonLd(article)).replace(/</g, '\\u003c')
  return (
    <div className={`suite-marketing ${styles.page}`}>
      <a className={styles.skipLink} href="#article-content">Skip to article</a>
      <MarketingHeader current="article" />
      <main id="article-content">
        <article>
          <header className={styles.hero}>
            <div className={styles.reading}>
              <Link href="/faq#articles">Back to FAQs &amp; articles</Link>
              <h1>{article.title}</h1>
              <p>{article.description}</p>
              <div className={styles.byline}>
                <span>By {article.author.url ? <a href={article.author.url}>{article.author.name}</a> : article.author.name}</span>
                <span>Published <time dateTime={article.publishedAt}>{articleDate(article.publishedAt!)}</time></span>
                {article.updatedAt && <span>Updated <time dateTime={article.updatedAt}>{articleDate(article.updatedAt)}</time></span>}
              </div>
            </div>
          </header>
          <div className={`${styles.reading} ${styles.body}`}>
            {article.body.map((block, index) => block.type === 'heading' ? <h2 key={index}>{block.text}</h2> :
              block.type === 'list' ? <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> :
                <p key={index}>{block.text}</p>)}
            <nav className={styles.related} aria-label="Explore Sparkle Suite">
              <Link href="/faq#articles">FAQs &amp; more articles</Link>
              <Link href="/tools">Explore Sparkle Suite tools</Link>
            </nav>
          </div>
        </article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </main>
      <MarketingFooter current="faq" />
    </div>
  )
}
