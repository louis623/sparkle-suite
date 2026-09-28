import {
  sparkleSuiteTikTokChannelUrl,
  sparkleSuiteYouTubeChannelUrl,
} from '@/lib/sparkle-suite/public-landing-content'
import styles from './marketing-social-links.module.css'

function TikTokIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M14.2 3.1c.5 2.6 2 4.4 4.5 4.7v2.8a7.7 7.7 0 0 1-4.4-1.4v6.6a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v2.9a3 3 0 1 0 2.1 2.8V3.1h2.7Z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
      <path d="M23 12.2s0-3.2-.4-4.6a3 3 0 0 0-2.1-2.1C18.9 5 12 5 12 5s-6.9 0-8.5.5a3 3 0 0 0-2.1 2.1C1 9 1 12.2 1 12.2s0 3.2.4 4.6a3 3 0 0 0 2.1 2.1C5.1 19.4 12 19.4 12 19.4s6.9 0 8.5-.5a3 3 0 0 0 2.1-2.1c.4-1.4.4-4.6.4-4.6ZM9.8 15.5V8.9l6.2 3.3-6.2 3.3Z" />
    </svg>
  )
}

const channels = [
  { label: 'TikTok', href: sparkleSuiteTikTokChannelUrl, icon: <TikTokIcon /> },
  { label: 'YouTube', href: sparkleSuiteYouTubeChannelUrl, icon: <YouTubeIcon /> },
] as const

export function MarketingSocialLinks({
  tone = 'paper',
  className,
}: {
  tone?: 'paper' | 'night'
  className?: string
}) {
  const toneClass = tone === 'night' ? styles.night : styles.paper
  return (
    <nav aria-label="Sparkle Suite channels" className={className ? `${toneClass} ${className}` : toneClass}>
      {channels.map((channel) => (
        <a aria-label={`Sparkle Suite on ${channel.label}`} href={channel.href} key={channel.label}>
          {channel.icon}
          <span>{channel.label}</span>
        </a>
      ))}
    </nav>
  )
}
