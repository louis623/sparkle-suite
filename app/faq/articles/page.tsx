import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { SuiteArticleIndex } from '@/app/_components/suite-article-index'
import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import { articleIndexMetadata, publishedArticles } from '@/lib/sparkle-suite/articles'

async function requireSuiteHost() {
  const requestHeaders = await headers()
  if (
    normalizeAmethystCustomDomainCandidate(requestHeaders.get('host')) ||
    normalizeAmethystCustomDomainCandidate(requestHeaders.get('x-forwarded-host'))
  ) notFound()
}

export async function generateMetadata() {
  await requireSuiteHost()
  return articleIndexMetadata()
}

export default async function ArticleIndexPage() {
  await requireSuiteHost()
  return <SuiteArticleIndex articles={publishedArticles()} />
}
