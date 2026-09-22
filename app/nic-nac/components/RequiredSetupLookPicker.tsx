'use client'

import Link from 'next/link'
import { useAvailableAmethystSkinCards } from './useAvailableAmethystSkinCards'
import styles from './RequiredSetupLookPicker.module.css'

export function RequiredSetupLookPicker({
  repId,
  onChoose,
  disabled = false,
}: {
  repId?: string | null
  onChoose: (message: string) => void
  disabled?: boolean
}) {
  const skinOptions = useAvailableAmethystSkinCards(repId)
  return (
    <section className={styles.panel} aria-label="Customer-facing site theme">
      <div className={styles.header}>
        <p className={styles.kicker}>Customer-facing site theme</p>
        <h2>Choose the Look for your public site</h2>
        <p>
          This only changes the public customer-facing Amethyst site. Your
          Sparkle Suite Workspace keeps the standard workspace theme.
        </p>
      </div>
      {skinOptions.status === 'loading' ? (
        <p className={styles.styleName} role="status">
          Loading the themes available to your account…
        </p>
      ) : skinOptions.status === 'error' ? (
        <p className={styles.styleName} role="alert">
          Your themes are unavailable right now. Refresh and try again.
        </p>
      ) : (
      <div className={styles.grid}>
        {skinOptions.cards.map((skin, index) => {
          const [ground, primary, accent] = skin.swatches
          return (
            <article key={skin.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.code}>{skin.code}</span>
                {index === 1 ? (
                  <span className={styles.recommended}>Recommended</span>
                ) : null}
              </div>
              <div className={styles.preview} aria-hidden="true">
                <div
                  className={styles.previewHero}
                  style={{
                    background: `linear-gradient(135deg, ${ground?.value ?? '#fff'} 0%, ${primary?.value ?? '#ee2c9b'} 58%, ${accent?.value ?? '#ffd4ea'} 100%)`,
                  }}
                />
                <div
                  className={styles.previewCard}
                  style={{
                    borderColor: accent?.value ?? primary?.value ?? '#ee2c9b',
                    background: ground?.value ?? '#fff',
                  }}
                >
                  <span style={{ background: primary?.value ?? '#ee2c9b' }} />
                  <span />
                  <span />
                </div>
              </div>
              <div className={styles.copy}>
                <h3>{skin.label}</h3>
                <p className={styles.styleName}>
                  {skin.headingFont} / {skin.bodyFont}
                </p>
                <p>{skin.description}</p>
              </div>
              <div
                className={styles.swatches}
                aria-label={`${skin.label} theme colors`}
              >
                {skin.swatches.map((swatch) => (
                  <span
                    key={`${skin.id}-${swatch.label}`}
                    className={styles.swatch}
                    style={{ background: swatch.value }}
                    title={swatch.label}
                  />
                ))}
              </div>
              {skin.previewHref ? (
                <Link
                  href={skin.previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  prefetch={false}
                  className={styles.styleName}
                  aria-label={`Preview ${skin.label} (opens in a new tab)`}
                >
                  Preview this skin ↗
                </Link>
              ) : null}
              <button
                type="button"
                className={styles.choose}
                onClick={() =>
                  onChoose(
                    `Use ${skin.label} (${skin.code}) for my customer-facing site theme.`,
                  )
                }
                disabled={disabled}
              >
                Choose this customer-site Look
              </button>
            </article>
          )
        })}
      </div>
      )}
    </section>
  )
}
