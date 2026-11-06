'use client'

import React from 'react'
import styles from './WorkspaceSetupRecovery.module.css'

export const WORKSPACE_RECOVERY_MESSAGE =
  'We couldn’t load your workspace. Please try again. If the problem continues, sign out and sign back in.'

export function WorkspaceSetupRecovery({
  onRetry,
  signInHref,
}: {
  onRetry: () => void | Promise<void>
  signInHref: string
}) {
  return (
    <section className={styles.card} aria-labelledby="workspace-recovery-title">
      <h1 id="workspace-recovery-title">Workspace unavailable</h1>
      <p role="alert">{WORKSPACE_RECOVERY_MESSAGE}</p>
      <div className={styles.actions}>
        <button type="button" onClick={onRetry}>Retry</button>
        <a href={signInHref}>Sign in</a>
      </div>
    </section>
  )
}
