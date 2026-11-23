import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import styles from '@/app/nic-nac/components/LiveLineupCard.module.css'
import { LiveLineupExtensionDetails, ShowActionButton } from '@/app/nic-nac/components/LiveLineupShowControls'
import { canAcceptWorkspaceRefresh, isShowCommandAcknowledgement } from '@/app/nic-nac/components/live-lineup-client'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import type { LineupExtensionStatus } from '@/lib/live-lineup/show-control'
import type { ShowCommand } from '@/lib/live-lineup/show-control'

const current:WorkspaceLineupSnapshot = {
  authorized:true,runtimeWritable:true,revision:0,connection:'connecting',lastReceivedAt:null,lastChangedAt:null,
  entries:[],heldEntries:[],canManage:false,undoAvailable:false,sourceVersion:null,warning:null,tenantContext:'fixture',
  showControl:{revision:0,mode:'auto',phase:'ended',selection:'none',selectedPartyCount:0,
    runId:null,deadline:null,actor:'auto',waitingForFirstOrder:false},
  extensionStatus:{connected:false,lastSeenAt:null,workerVersion:'2.0.6',readerVersion:null,
    ackControlRevision:null,sourceStatus:'unknown',latestPublishedVersion:'2.0.12',updateNeeded:true},
}

const UPDATE_HREF = '/nic-nac?section=help-resources&guide=live-lineup&part=update'
const UPDATE_HREF_HTML = UPDATE_HREF.replaceAll('&', '&amp;')

it('offers lifecycle controls independently of drag readiness and shows both warnings', () => {
  const onAction = () => {}
  expect(renderToStaticMarkup(<ShowActionButton snapshot={current} disabled={false} onAction={onAction}/>)).toContain('Start Show')
  const started:WorkspaceLineupSnapshot = {...current,showControl:{...current.showControl!,mode:'started',revision:1}}
  expect(renderToStaticMarkup(<ShowActionButton snapshot={started} disabled={false} onAction={onAction}/>)).toContain('Stop Show')
  const output = renderToStaticMarkup(<LiveLineupExtensionDetails snapshot={started} label="Connecting" tone="loading" onStatus={onAction}/>)
  expect(output).toContain('Make sure you have an open party selected in the Live Lineup extension.')
  expect(output).toContain('Show started, but your Live Lineup extension isn&#x27;t connected.')
  expect(output).toContain('Your Live Lineup extension is out of date')
  expect(output).toContain('You have <span class="' + styles.versionNowrap + '">2.0.6</span>. The newest is <span class="' + styles.versionNowrap + '">2.0.12</span>.')
  expect(output).not.toContain('Extension update needed')
  expect(output).not.toContain('running 2.0.6; latest 2.0.12.')
  expect(output.indexOf('Last reported version 2.0.6')).toBeLessThan(output.indexOf('role="status"'))
  expect(output.indexOf('role="status"')).toBeLessThan(output.indexOf('role="alert"'))
  expect(output).not.toContain('Lineup ends at')
})

it('rejects stale lifecycle state even if its row revision increased and proves receipts', () => {
  const command:ShowCommand = {type:'show-start',requestId:'11111111-1111-4111-8111-111111111111',expectedControlRevision:0}
  const run='22222222-2222-4222-8222-222222222222'
  const started:WorkspaceLineupSnapshot = {...current,
    showControl:{...current.showControl!,mode:'started',revision:1,runId:run},
    showReceipt:{action:'show-start',requestId:command.requestId,revision:1,runId:run},
  }
  expect(isShowCommandAcknowledgement(current,started,command)).toBe(true)
  expect(isShowCommandAcknowledgement(current,{...started,showReceipt:undefined},command)).toBe(false)
  expect(canAcceptWorkspaceRefresh(started,{...current,revision:1})).toBe(false)
  expect(canAcceptWorkspaceRefresh(current,started)).toBe(true)
})

it('reserves a readable Workspace rail and keeps the calendar message during deferred data', () => {
  const shell = readFileSync('app/nic-nac/components/DashboardPlaceholder.module.css','utf8')
  const card = readFileSync('app/nic-nac/components/LiveLineupCard.module.css','utf8')
  const home = readFileSync('lib/amethyst/v2/homepage.jsx','utf8')
  expect(shell).toMatch(/\.signatureHome \.lineupRail\s*\{\s*min-block-size: 360px;/)
  expect(card).toMatch(/\.card \.extensionRow \.statusButton\s*\{[^}]*color: #34234a;/)
  const strip = home.slice(home.indexOf('function LiveQueueStrip('),home.indexOf('function LiveQueueModal('))
  expect(strip).toContain('Check the calendar for the next show.')
  expect(strip).not.toContain('data-page-placeholder="calendar-strip"')
  expect(card).toMatch(/height:\s*min\(480px,\s*70dvh\)/)
  expect(card).toMatch(/\.updateNotice\s*\{[^}]*background:\s*#fff1d2;[^}]*color:\s*#6e3909;[^}]*animation:\s*none;/)
  expect(card).toMatch(/\.versionNowrap\s*\{[^}]*white-space:\s*nowrap;/)
  expect(card).toMatch(/\.card \.updateNotice a:focus-visible\s*\{[^}]*outline:\s*3px solid #8052a7;/)
  expect(card).toMatch(/min-block-size:\s*44px;/)
  expect(card).not.toMatch(/@keyframes/)
  const controls = readFileSync('app/nic-nac/components/LiveLineupShowControls.tsx','utf8')
  expect(controls).not.toContain('Extension update needed')
  expect(controls).toContain("'" + UPDATE_HREF + "'")
  expect(controls).not.toContain("from 'next/link'")
  expect(controls).not.toMatch(/useEffect|setTimeout|setInterval|fetch\(/)
  const cardSource = readFileSync('app/nic-nac/components/LiveLineupCard.tsx','utf8')
  expect(cardSource).toMatch(/<LiveLineupExtensionDetails[^>]*readOnly=\{readOnly\}/)
})

function extension(overrides: Partial<LineupExtensionStatus>): WorkspaceLineupSnapshot {
  return {...current, authorized: true, extensionStatus: {...current.extensionStatus!, ...overrides}}
}

function details(snapshot: WorkspaceLineupSnapshot, readOnly = false) {
  return renderToStaticMarkup(<LiveLineupExtensionDetails snapshot={snapshot} label="Connecting" tone="loading" onStatus={() => {}} readOnly={readOnly}/>)
}

it('shows the out-of-date notice only for an older authorized extension', () => {
  const older = details(extension({workerVersion: '2.0.12', latestPublishedVersion: '2.0.13', updateNeeded: true}))
  expect(older).toContain('Your Live Lineup extension is out of date')
  expect(older).toContain('You have <span class="' + styles.versionNowrap + '">2.0.12</span>. The newest is <span class="' + styles.versionNowrap + '">2.0.13</span>.')
  expect(older).toContain('href="' + UPDATE_HREF_HTML + '"')
  expect(older).toContain('>How to update</a>')
  expect(older).toContain('role="status"')
  expect(older).not.toContain('next/link')
  expect(older).not.toContain('Extension update needed')

  const hidden = [
    extension({workerVersion: '2.0.13', latestPublishedVersion: '2.0.13', updateNeeded: false}),
    extension({workerVersion: '2.0.14', latestPublishedVersion: '2.0.13', updateNeeded: false}),
    extension({workerVersion: null, latestPublishedVersion: '2.0.13', updateNeeded: true}),
    extension({workerVersion: 'demo-1.0.0', latestPublishedVersion: '2.0.13', updateNeeded: false}),
    extension({workerVersion: '2.0.6', latestPublishedVersion: null, updateNeeded: true}),
    {...extension({workerVersion: '2.0.6', latestPublishedVersion: '2.0.13', updateNeeded: true}), authorized: false},
  ]
  for (const snapshot of hidden) {
    const html = details(snapshot)
    expect(html).not.toContain('Your Live Lineup extension is out of date')
    expect(html).not.toContain('How to update')
    expect(html).not.toContain(UPDATE_HREF)
  }

  const support = details(extension({workerVersion: '2.0.6', latestPublishedVersion: '2.0.13', updateNeeded: true}), true)
  expect(support).toContain('Your Live Lineup extension is out of date')
  expect(support).toContain('You have <span class="' + styles.versionNowrap + '">2.0.6</span>. The newest is <span class="' + styles.versionNowrap + '">2.0.13</span>.')
  expect(support).not.toContain('<a ')
  expect(support).not.toContain('How to update')
  expect(support).not.toContain(UPDATE_HREF)

  const supportSession = details({...extension({workerVersion: '2.0.6', latestPublishedVersion: '2.0.13', updateNeeded: true}), authorized: false}, true)
  expect(supportSession).toContain('Your Live Lineup extension is out of date')
  expect(supportSession).toContain('You have <span class="' + styles.versionNowrap + '">2.0.6</span>. The newest is <span class="' + styles.versionNowrap + '">2.0.13</span>.')
  expect(supportSession).not.toContain('<a ')
  expect(supportSession).not.toContain('How to update')
  expect(supportSession).not.toContain(UPDATE_HREF)
})

it('renders a static 390-wide Live Lineup card with the notice and two rows', () => {
  const snapshot = {...extension({workerVersion: '2.0.12', latestPublishedVersion: '2.0.13', updateNeeded: true, connected: true}),
    showControl: {...current.showControl!, selection: 'some' as const, selectedPartyCount: 1}}
  const html = renderToStaticMarkup(
    <section className={`${styles.card} ${styles.compact}`} data-viewport-width="390" style={{width: 390}}>
      <header className={styles.header}>
        <div className={styles.titleRow}><h2>Live Lineup</h2></div>
        <div className={styles.headerActions}>
          <ShowActionButton snapshot={snapshot} disabled={false} onAction={() => {}} />
          <button type="button" className={styles.fullButton}>↗ Full lineup</button>
        </div>
      </header>
      <LiveLineupExtensionDetails snapshot={snapshot} label="Connected + Updating" tone="updating" onStatus={() => {}} />
      <div className={styles.scroll}>
        <ol className={styles.list} aria-label="Customers waiting">
          <li className={styles.row}>Avery Stone</li>
          <li className={styles.row}>Blair Moss</li>
        </ol>
      </div>
    </section>,
  )
  expect(html).toContain('data-viewport-width="390"')
  expect(html).toContain('width:390px')
  expect(html).toContain(styles.card)
  expect(html).toContain(styles.compact)
  expect(html).toContain('Start Show')
  expect(html).toContain('Full lineup')
  expect(html).toContain('Your Live Lineup extension is out of date')
  expect(html).toContain('href="' + UPDATE_HREF_HTML + '"')
  expect(html.indexOf('</header>')).toBeLessThan(html.indexOf('Your Live Lineup extension is out of date'))
  expect(html.match(new RegExp('class="' + styles.row + '"', 'g'))?.length).toBe(2)
  expect(html).not.toContain('Extension update needed')
})
