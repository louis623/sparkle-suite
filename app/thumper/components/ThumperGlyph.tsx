import styles from './ThumperGlyph.module.css'

export function ThumperGlyph({ size = 22 }: { size?: number }) {
  return (
    <span
      className={styles.glyph}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
      aria-hidden="true"
    >
      T
    </span>
  )
}
