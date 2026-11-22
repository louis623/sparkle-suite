import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { LiveLineupExtensionDetails, ShowActionButton } from '@/app/nic-nac/components/LiveLineupShowControls'
import { canAcceptWorkspaceRefresh, isShowCommandAcknowledgement } from '@/app/nic-nac/components/live-lineup-client'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'
import type { ShowCommand } from '@/lib/live-lineup/show-control'

const current:WorkspaceLineupSnapshot = {
  authorized:true,runtimeWritable:true,revision:0,connection:'connecting',lastReceivedAt:null,lastChangedAt:null,
  entries:[],heldEntries:[],canManage:false,undoAvailable:false,sourceVersion:null,warning:null,tenantContext:'fixture',
  showControl:{revision:0,mode:'auto',phase:'ended',selection:'none',selectedPartyCount:0,
    runId:null,deadline:null,actor:'auto',waitingForFirstOrder:false},
  extensionStatus:{connected:false,lastSeenAt:null,workerVersion:'2.0.6',readerVersion:null,
    ackControlRevision:null,sourceStatus:'unknown',latestPublishedVersion:'2.0.12',updateNeeded:true},
}

it('offers lifecycle controls independently of drag readiness and shows both warnings', () => {
  const onAction = () => {}
  expect(renderToStaticMarkup(<ShowActionButton snapshot={current} disabled={false} onAction={onAction}/>)).toContain('Start Show')
  const started:WorkspaceLineupSnapshot = {...current,showControl:{...current.showControl!,mode:'started',revision:1}}
  expect(renderToStaticMarkup(<ShowActionButton snapshot={started} disabled={false} onAction={onAction}/>)).toContain('Stop Show')
  const output = renderToStaticMarkup(<LiveLineupExtensionDetails snapshot={started} label="Connecting" tone="loading" onStatus={onAction}/>)
  expect(output).toContain('Make sure you have an open party selected in the Live Lineup extension.')
  expect(output).toContain('Show started, but your Live Lineup extension isn&#x27;t connected.')
  expect(output).toContain('running 2.0.6; latest 2.0.12.')
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
