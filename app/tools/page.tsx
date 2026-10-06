import type { Metadata } from 'next'
import { ToolsExperience } from '@/app/_components/tools-experience'

export const metadata: Metadata = {
  title: { absolute: 'Sparkle Suite Tools — For Your Shows, Team & Business' },
  description: 'Explore Dance Floor, Live Lineup, Live Show Calendar, Team Management, Nic-Nac, and the supporting tools inside your Sparkle Suite workspace.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'Explore your Sparkle Suite tools',
    description: 'Take a closer look at the tools behind your show.',
    url: '/tools', siteName: 'Sparkle Suite', type: 'website',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Sparkle Suite websites and tools for live sellers' }],
  },
}

export default function ToolsPage() { return <ToolsExperience /> }
