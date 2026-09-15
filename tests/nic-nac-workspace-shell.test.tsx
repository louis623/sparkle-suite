import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DashboardPlaceholder } from '@/app/nic-nac/components/DashboardPlaceholder'

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasDeclaration(css: string, selector: string, declaration: string) {
  return new RegExp(
    `${escapeForRegex(selector)}\\s*\\{[\\s\\S]*?${escapeForRegex(
      declaration,
    )}\\s*;[\\s\\S]*?\\}`,
  ).test(css)
}

describe('Nic-Nac workspace shell reset', () => {
  it('renders workspace sections inside a top tablist instead of a sidebar rail', () => {
    const html = renderToStaticMarkup(createElement(DashboardPlaceholder))
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceShell.tsx'),
      'utf8',
    )
    const css = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceShell.module.css'),
      'utf8',
    )
    const dashboardCss = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.module.css',
      ),
      'utf8',
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-label="Workspace sections"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('aria-label="Scrollable live lineup"')
    expect(html).toContain('Drag customers to change their order.')
    expect(html).toContain('Checking connection')
    expect(html).not.toContain('Recover from a private archive')
    expect(html).not.toContain('Extension connection setup')
    expect(html).not.toContain('Last received')
    expect(html).not.toContain('>Expand<')
    expect(html).toContain('>Dance Floor<')
    expect(html).not.toContain('>Jewelry Library<')
    expect(html).toContain('>Calendar<')
    expect(html).not.toContain(
      'Manage the live workspace, customer site, trade tools, messages, and account settings.',
    )
    expect(source).not.toContain('workspaceSidebar')
    expect(css).not.toContain('.workspaceSidebar')
    expect(dashboardCss).not.toContain('.workspaceShell')
    expect(dashboardCss).not.toContain('.workspaceSidebar')
    expect(dashboardCss).not.toContain('.workspaceSidebarTitle')
    expect(dashboardCss).not.toContain('.workspaceSidebarIntro')
    expect(dashboardCss).not.toContain('.workspaceNavButton')
    expect(dashboardCss).not.toContain('.workspaceNavButtonActive')
    expect(dashboardCss).not.toContain('.workspaceNavButtonComingSoon')
    expect(source).toContain('className={styles.shell}')
    expect(source).toContain('className={styles.tabsWrap}')
    expect(source).toContain('className={styles.content}')
    expect(source).toContain('role="tabpanel"')
    expect(source).toContain('aria-labelledby={activeTabId}')
    expect(
      hasDeclaration(
        css,
        '.shell',
        'height: calc(var(--nic-nac-app-height, 100vh) - 12px)',
      ),
    ).toBe(true)
    expect(hasDeclaration(css, '.shell', 'min-height: 0')).toBe(true)
    expect(hasDeclaration(css, '.content', 'min-height: 0')).toBe(true)
    expect(hasDeclaration(css, '.content', 'overflow-y: auto')).toBe(true)
    expect(hasDeclaration(dashboardCss, '.main', 'overflow: hidden')).toBe(true)
    expect(hasDeclaration(dashboardCss, '.conceptHome', 'overflow: hidden')).toBe(true)
    expect(hasDeclaration(dashboardCss, '.embeddedChat', 'overflow: hidden')).toBe(true)

    const dashboardSource = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/DashboardPlaceholder.tsx'),
      'utf8',
    )
    const homeSource = dashboardSource.slice(
      dashboardSource.indexOf('function ConceptHomeWorkspace'),
      dashboardSource.indexOf('function ConceptPanel'),
    )
    expect(homeSource).toContain('className={styles.railLiveLineup}')
    expect(homeSource).toContain('<LiveLineupCard compact readOnly={liveLineupReadOnly} />')
    expect(homeSource.indexOf('className={styles.railLiveLineup}')).toBeLessThan(homeSource.indexOf('className={styles.conceptCenter}'))
  })

  it('keeps the compact workspace header while removing only the duplicate search', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.tsx',
      ),
      'utf8',
    )
    const css = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.module.css',
      ),
      'utf8',
    )
    const workspaceHeaderSource = source.slice(
      source.indexOf('function WorkspaceAppHeader'),
      source.indexOf('function ConceptHomeWorkspace'),
    )

    expect(source).toContain('function WorkspaceAppHeader')
    expect(source).toContain('aria-label="Go to Nic-Nac home"')
    expect(source).not.toContain('<form className={styles.appSearch} onSubmit={handleSubmit}>')
    expect(source).not.toContain('aria-label="Ask Nic-Nac anything"')
    expect(source).toContain('className={styles.appBrand}')
    expect(source).not.toContain('className={styles.appSearch}')
    expect(source).toContain('className={styles.appProfile}')
    expect(source).toContain('className={styles.appProfileMenu}')
    expect(source).toContain('supabase.auth.signOut()')
    expect(source).toContain("Logging out…")
    expect(source).toContain("'Log out'")
    expect(source).not.toContain('Preview site')
    expect(source).not.toContain('Sparkle with us.')
    expect(workspaceHeaderSource).not.toContain('Secret Rep ID Number')
    expect(css).toContain('.appHeader')
    expect(css).toContain('.appBrand')
    expect(css).not.toContain('.appSearch')
    expect(css).not.toContain('.appSearchInput')
    expect(css).toContain('.appProfile')
    expect(css).toContain('.appProfilePopover')
    expect(css).toContain('.appProfileLogout')
    expect(css).not.toContain('.publicSitePreview')
    expect(hasDeclaration(css, '.main', 'padding: 6px')).toBe(true)
  })

  it('keeps one clear-conversation control beside the personalized workspace heading', () => {
    const client = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/_client.tsx'),
      'utf8',
    )
    const header = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/NicNacHeader.tsx'),
      'utf8',
    )

    expect(client).toContain('onNewConversation={handleNewConversation}')
    expect(client).toContain("/api/nic-nac/conversation/clear")
    expect(client).toContain('Clear the persisted thread before rotating the id')
    expect(client).not.toContain('onRefreshConversation={handleRefreshConversation}')
    expect(client).not.toContain('refreshSignal={refreshSignal}')
    expect(client).not.toContain('<NicNacColumn\n                  variant="desktop"')
    expect(header).toContain('Clear conversation with Nic-Nac to start a new conversation')
    expect(header).toContain('Clear conversation')
    expect(header).not.toContain('Refresh conversation')
  })

  it('keeps the home workspace clear on phones and uses the Fold-open width deliberately', () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/DashboardPlaceholder.module.css',
      ),
      'utf8',
    )

    expect(css).toContain('.nicNacHeroActions button::before')
    expect(css).toContain('content: "+"')
    expect(css).toContain('@media (min-width: 600px) and (max-width: 840px)')
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
  })

  it('does not use the espresso gradient as the dominant shell surface', () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/WorkspaceShell.module.css',
      ),
      'utf8',
    )

    expect(css).not.toMatch(
      /linear-gradient\(\s*145deg,\s*#402924 0%,\s*#36221d 100%\s*\)/i,
    )
    expect(css).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.\d+\);/)
    expect(css).toContain('backdrop-filter: blur(')
  })

  it('supports keyboard navigation across workspace tabs', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/nic-nac/components/WorkspaceSectionTabs.tsx'),
      'utf8',
    )

    expect(source).toContain("key !== 'ArrowLeft'")
    expect(source).toContain("key !== 'ArrowRight'")
    expect(source).toContain("key !== 'Home'")
    expect(source).toContain("key !== 'End'")
    expect(source).toContain('querySelectorAll<HTMLButtonElement>')
    expect(source).toContain('nextTab.focus()')
    expect(source).toContain('onSectionChange(nextKey)')
    expect(source).toContain('role="tab"')
    expect(source).toContain('id={getWorkspaceSectionTabId(tab.key)}')
    expect(source).toContain('aria-controls={getWorkspaceSectionPanelId(tab.key)}')
    expect(source).toContain('aria-selected={active}')
    expect(source).toContain('tab.shortLabel')
  })

  it('styles mobile workspace tabs like thumb-friendly app navigation buttons', () => {
    const css = readFileSync(
      resolve(
        process.cwd(),
        'app/nic-nac/components/WorkspaceSectionTabs.module.css',
      ),
      'utf8',
    )

    expect(css).toContain('@media (max-width: 840px)')
    expect(css).toContain('flex-direction: column;')
    expect(css).toContain('align-items: center;')
    expect(css).toContain('justify-content: center;')
    expect(css).toContain('min-width: 58px;')
    expect(css).toContain('min-height: 54px;')
    expect(css).toContain('border-radius: 18px;')
  })
})
