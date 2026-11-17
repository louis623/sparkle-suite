import styles from './dance-floor.module.css'
export function SectionState({ status, error, loading, onRetry }: {
  status: 'loading' | 'ready' | 'error'; error: string; loading?: string; onRetry: () => void
}) {
  if (status === 'error') return <p role="alert">{error} <button type="button" className={styles.linkButton} onClick={onRetry}>Try again</button></p>
  if (status === 'loading') return <div role="status" aria-label={loading ?? 'Loading'}>{loading}<div className={styles.skeleton} /><div className={styles.skeletonShort} /></div>
  return null
}
