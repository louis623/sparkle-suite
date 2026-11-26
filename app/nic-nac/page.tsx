import { Suspense } from 'react'
import NicNacClient from './_client'
import { MyWebsiteFirstPaint } from './my-website-first-paint'
import {
  reviewerSmokeModeEnabled,
} from '@/lib/reviewer-smoke/config'
import styles from './page.module.css'
import './nic-nac-tokens.css'
import { liveLineupOwnerMutationsAvailable } from '@/lib/live-lineup/runtime-mode'
import { getPaidNicNacContext } from '@/lib/nic-nac/auth'
import { getSiteSettingsDashboard } from '@/lib/services/site-settings'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

export const dynamic = 'force-dynamic'

export default async function NicNacPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const requestedSection = typeof params.section === 'string' ? params.section : ''
  let initialWorkspaceSettings: SiteSettingsDashboardResult | null = null
  try {
    const { repId, supabase } = await getPaidNicNacContext()
    initialWorkspaceSettings = await getSiteSettingsDashboard(supabase, repId)
  } catch {
    initialWorkspaceSettings = null
  }
  return (
    <main className={styles.page}>
      <div className={styles.app}>
        {requestedSection === 'site-settings' && initialWorkspaceSettings ? (
          <MyWebsiteFirstPaint settings={initialWorkspaceSettings} />
        ) : null}
        <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
          <NicNacClient
            liveLineupReadOnly={!liveLineupOwnerMutationsAvailable()}
            reviewerSmokeVisible={
              reviewerSmokeModeEnabled()
            }
            initialWorkspaceSettings={initialWorkspaceSettings}
            initialPaidAccess={initialWorkspaceSettings !== null}
          />
        </Suspense>
      </div>
    </main>
  )
}
