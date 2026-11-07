/** Resolve the current owner or verified support context; never select a rep here. */
export function requestWorkspaceSetupState(url: string, signal?: AbortSignal) {
  // Resolve fetch at call time so the authorized support gateway wrapper stays active.
  return fetch(url, { credentials: 'include', cache: 'no-store', signal })
}
