import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { FaqExperience } from '@/app/_components/faq-experience'

export const metadata: Metadata = {
  title: {
    absolute: 'Sparkle Suite FAQ — Pricing, Setup & Live-Show Tools',
  },
  description:
    'Deeper answers on pricing, what is included, domains, mobile, and independence. Independent tools for Bomb Party reps — not affiliated with Bomb Party.',
  alternates: {
    canonical: '/faq',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Sparkle Suite FAQ — Pricing, Setup & Live-Show Tools',
    description:
      'Deeper answers on pricing, what is included, domains, mobile, and independence. Independent tools for Bomb Party reps.',
    url: '/faq',
    siteName: 'Sparkle Suite',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Sparkle Suite FAQ.',
      },
    ],
  },
}

interface FaqPageProps {
  searchParams?: Promise<{
    c?: string | string[]
  }>
}

export default async function FaqPage({ searchParams }: FaqPageProps) {
  const params = searchParams ? await searchParams : {}
  const rawTarget = Array.isArray(params.c) ? params.c[0] : params.c
  const target = rawTarget?.trim()
  if (target) {
    redirect(`/internal/customer-faq-preview?c=${encodeURIComponent(target)}`)
  }

  return <FaqExperience />
}
