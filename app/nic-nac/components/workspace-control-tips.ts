/**
 * Short hover tips for Workspace controls whose labels hide a consequence.
 * Edit the sentences here. Keep each one plain and short.
 * Do not describe behavior the control does not have.
 */

export const WORKSPACE_CONTROL_TIP_IDS = [
  'reveal-next',
  'hold',
  'return',
  'customer-card',
  'party-controls',
  'recover-archive',
  'remove-dancer',
  'approve-request',
  'deny-request',
  'jewelry-library',
  'wispr-flow',
  'save-site-settings',
] as const

export type WorkspaceControlTipId = (typeof WORKSPACE_CONTROL_TIP_IDS)[number]

export const WORKSPACE_CONTROL_TIPS: Record<WorkspaceControlTipId, string> = {
  'reveal-next':
    'Moves this customer to the front of your waiting lineup. It does not reveal them on Bomb Party.',
  hold:
    'Takes this order off the public waiting list and keeps it private until you return it. Bomb Party orders stay the same.',
  return: 'Puts a held customer back at the end of the waiting lineup.',
  'customer-card':
    'Opens the private match for this order so you can see who it is. It does not change their place in line.',
  'party-controls':
    'Hides a party’s customers from this lineup without changing Bomb Party. Undo does not bring a hidden party back.',
  'recover-archive':
    'Brings chosen customers from an earlier show into private Hold only. Recovery pauses lineup updates and clears Undo.',
  'remove-dancer':
    'Takes this piece off the Dance Floor customers see, and cancels a waiting request for it.',
  'approve-request':
    'Opens a check of what they offered. Nothing is approved until you confirm in that review.',
  'deny-request':
    'Opens the same review so you can turn the request down with a reason. Nothing is denied until you confirm.',
  'jewelry-library':
    'Search the catalog, then add a piece to your Dance Floor so customers can request it.',
  'wispr-flow':
    'Optional voice typing so you can talk to Nic-Nac during a LIVE without stopping to type.',
  'save-site-settings': 'Publishes this draft to your public site. Preview does not.',
}

export function workspaceControlTipText(id: WorkspaceControlTipId) {
  return WORKSPACE_CONTROL_TIPS[id]
}
