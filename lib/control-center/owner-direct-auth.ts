import { getControlCenterAccess, OperatorAuthError, requireControlCenterOwner } from '@/lib/supabase/operator-auth'

export async function requireOwnerDirectAccess() {
  const access = requireControlCenterOwner(await getControlCenterAccess())
  // LOC agent grants are separate from Louis's interactive owner session.
  if (access.method !== 'control_center_session') {
    throw new OperatorAuthError('Direct messages require the interactive owner session.')
  }
  return access
}

export function requireOwnerDirectSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  if (!origin || fetchSite === 'cross-site') {
    throw new OperatorAuthError('Direct message writes require a same-origin request.')
  }
  let requestOrigin: string
  try {
    requestOrigin = new URL(request.url).origin
  } catch {
    throw new OperatorAuthError('Direct message request origin is invalid.')
  }
  if (origin !== requestOrigin) {
    throw new OperatorAuthError('Direct message writes require a same-origin request.')
  }
}
