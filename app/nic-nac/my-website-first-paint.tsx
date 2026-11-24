import {
  buildSiteSetupChecklist,
  siteSetupRemaining,
  siteSetupRemainingLabel,
} from '@/app/nic-nac/components/site-settings-layout'
import styles from '@/app/nic-nac/components/DashboardPlaceholder.module.css'
import type { SiteSettingsDashboardResult } from '@/lib/services/types'

/** The setup checklist in the first HTML, before the workspace client bundle hydrates. */
export function MyWebsiteFirstPaint({ settings }: { settings: SiteSettingsDashboardResult }) {
  const remaining = siteSetupRemaining(buildSiteSetupChecklist(settings))
  if (remaining.length === 0) return null
  return (
    <>
      <style>{`html:has([data-testid="site-setup-checklist"]) [data-server-checklist]{display:none}`}</style>
      <div className={styles.setupChecklist} data-server-checklist="">
        <p className={styles.setupChecklistCount}>{siteSetupRemainingLabel(remaining.length)}</p>
        <p className={styles.setupChecklistItems}>{remaining.map((item) => item.label).join(' · ')}</p>
      </div>
    </>
  )
}
