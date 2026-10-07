import Link from 'next/link'
import { articleDate, publishedArticles } from '@/lib/sparkle-suite/articles'
import styles from './suite-articles.module.css'

export function FaqArticles() {
  const articles = publishedArticles()
  if (!articles.length) return null
  return (
    <section id="articles" className={styles.collection} aria-labelledby="articles-title">
      <div className={styles.container}>
        <h2 id="articles-title">More to explore</h2>
        <ul className={styles.cards}>
          {articles.map((article) => (
            <li key={article.slug}>
              <article>
                <h3><Link href={`/faq/articles/${article.slug}`}>{article.title}</Link></h3>
                <p>{article.description}</p>
                <time dateTime={article.publishedAt}>{articleDate(article.publishedAt!)}</time>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
