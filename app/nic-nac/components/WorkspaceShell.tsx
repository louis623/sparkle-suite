import type { ReactNode } from 'react'

import {
  getWorkspaceSectionPanelId,
  getWorkspaceSectionTabId,
  WorkspaceSectionTabs,
  type WorkspaceSectionTab,
} from './WorkspaceSectionTabs'
import styles from './WorkspaceShell.module.css'

export function WorkspaceShell<TKey extends string>({
  tabs,
  activeSection,
  onSectionChange,
  header,
  notice,
  children,
}: {
  tabs: readonly WorkspaceSectionTab<TKey>[]
  activeSection: TKey
  onSectionChange: (section: TKey) => void
  header?: ReactNode
  notice?: ReactNode
  children: ReactNode
}) {
  const activeTabId = getWorkspaceSectionTabId(activeSection)
  const activePanelId = getWorkspaceSectionPanelId(activeSection)

  return (
    <div className={styles.shell}>
      {header ? <div className={styles.header}>{header}</div> : null}
      <section
        className={styles.content}
        role="tabpanel"
        id={activePanelId}
        aria-labelledby={activeTabId}
        data-workspace-scroll=""
      >
        {notice}
        {children}
      </section>
      <div className={styles.tabsWrap} data-workspace-tab-bar="">
        <WorkspaceSectionTabs
          tabs={tabs}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />
      </div>
    </div>
  )
}
