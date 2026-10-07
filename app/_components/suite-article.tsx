import Link from 'next/link'
import { MarketingFooter, MarketingHeader } from './landing-experience'
import { articleDate, articleJsonLd, type SuiteArticle } from '@/lib/sparkle-suite/articles'
import { articleInlineParts } from '@/lib/sparkle-suite/article-inline'
import { QueueLink } from './queue-link'
import styles from './suite-articles.module.css'

function ArticleInline({ text }: { text: string }) {
  return articleInlineParts(text).map((part, index) => {
    if (part.type === 'strong') return <strong key={index}>{part.text}</strong>
    if (part.type === 'link') {
      const url = new URL(part.href)
      // Preserve source destinations and the existing marketing attribution behavior.
      if (url.origin === 'https://www.yoursparklesuite.com') {
        return <QueueLink key={index} href={`${url.pathname}${url.search}${url.hash}`}>{part.text}</QueueLink>
      }
      return <a key={index} href={part.href}>{part.text}</a>
    }
    return part.text
  })
}

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
              {(article.author || article.publishedAt || article.updatedAt) && <div className={styles.byline}>
                {article.author && <span>By {article.author.url ? <a href={article.author.url}>{article.author.name}</a> : article.author.name}</span>}
                {article.publishedAt && <span>Published <time dateTime={article.publishedAt}>{articleDate(article.publishedAt)}</time></span>}
                {article.updatedAt && <span>Updated <time dateTime={article.updatedAt}>{articleDate(article.updatedAt)}</time></span>}
              </div>}
            </div>
          </header>
          <div id="article-body" className={`${styles.reading} ${styles.body}`}>
            {article.body.map((block, index) => block.type === 'heading' ? <h2 key={index}>{block.text}</h2> :
              block.type === 'list' ? <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><ArticleInline text={item} /></li>)}</ul> :
                <p key={index}><ArticleInline text={block.text} /></p>)}
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
