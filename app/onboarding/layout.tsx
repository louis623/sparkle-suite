import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './onboarding.css'

export const metadata: Metadata = {
  title: { absolute: 'New Rep Onboarding | Sparkle Suite' },
  description: 'Private New Rep Onboarding',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function OnboardingLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return children
}
