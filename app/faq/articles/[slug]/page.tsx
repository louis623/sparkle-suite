import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { SuiteArticleExperience } from '@/app/_components/suite-article'
import { normalizeAmethystCustomDomainCandidate } from '@/lib/amethyst/host-routing'
import { articleMetadata, findPublishedArticle } from '@/lib/sparkle-suite/articles'

type Props = { params: Promise<{ slug: string }> }

async function requireArticle(params: Props['params']) {
  const requestHeaders = await headers()
  if (normalizeAmethystCustomDomainCandidate(requestHeaders.get('host')) ||
      normalizeAmethystCustomDomainCandidate(requestHeaders.get('x-forwarded-host'))) notFound()
  const { slug } = await params
  const article = findPublishedArticle(slug)
  if (!article) notFound()
  return article
}

export async function generateMetadata({ params }: Props) {
  return articleMetadata(await requireArticle(params))
}

export default async function ArticlePage({ params }: Props) {
  return <SuiteArticleExperience article={await requireArticle(params)} />
}
