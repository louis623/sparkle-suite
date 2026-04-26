import styles from './ErrorBlock.module.css'

export function ErrorBlock({
  message,
  onRetry,
  variant,
}: {
  message: string
  onRetry?: () => void
  variant?: 'global' | 'inline'
}) {
  const isInline = variant === 'inline'
  return (
    <div
      className={`${styles.block} ${isInline ? styles.inline : ''}`}
      role="alert"
    >
      <div className={styles.row}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          className={styles.icon}
        >
          <path
            d="M8 1.5L15 14H1L8 1.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M8 6.5V9.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
        </svg>
        <div className={styles.message}>{message}</div>
      </div>
      {onRetry ? (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {isInline ? 'Retry' : 'Try again'}
        </button>
      ) : null}
    </div>
  )
}
