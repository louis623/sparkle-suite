import { Suspense } from 'react'
import NicNacClient from './_client'
import {
  reviewerSmokeModeEnabled,
  workspaceReviewAccessEnabled,
} from '@/lib/reviewer-smoke/config'
import styles from './page.module.css'
import './nic-nac-tokens.css'
import { liveLineupOwnerMutationsAvailable } from '@/lib/live-lineup/runtime-mode'

export const dynamic = 'force-dynamic'

export default function NicNacPage() {
  return (
    <main className={styles.page}>
      <div className={styles.app}>
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
          <NicNacClient
            liveLineupReadOnly={!liveLineupOwnerMutationsAvailable()}
            reviewerSmokeVisible={
              reviewerSmokeModeEnabled() || workspaceReviewAccessEnabled()
            }
          />
        </Suspense>
      </div>
    </main>
  )
}
