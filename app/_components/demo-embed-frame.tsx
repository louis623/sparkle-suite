import {
  demoEmbedSrc,
  type DemoEmbed,
} from '@/lib/sparkle-suite/demo-page-content'
import styles from './demo-experience.module.css'

export function DemoEmbedFrame({
  embed,
  variant,
}: {
  embed: DemoEmbed
  variant: 'hero' | 'card' | 'tour'
}) {
  const platformLabel = embed.platform === 'youtube' ? 'YouTube' : 'TikTok'

  return (
    <figure className={styles.embed} data-variant={variant}>
      <div className={styles.player} data-platform={embed.platform}>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading={variant === 'hero' ? 'eager' : 'lazy'}
          referrerPolicy="strict-origin-when-cross-origin"
          src={demoEmbedSrc(embed)}
          title={embed.title}
        />
      </div>
      <figcaption>
        <p>{platformLabel}</p>
        <strong>{embed.title}</strong>
        <span>{embed.summary}</span>
        <a href={embed.url} rel="noreferrer" target="_blank">
          Watch on {platformLabel}
        </a>
      </figcaption>
    </figure>
  )
}
