export type DualInterfaceClientMode = 'auth' | 'service_role'

export type DualInterfaceRouteMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface DualInterfaceContract {
  id: string
  routeFile: string
  routeMethods: DualInterfaceRouteMethod[]
  toolFile: string | null
  serviceFunctions: string[]
  clientMode: DualInterfaceClientMode
  notes: string
}

export const DUAL_INTERFACE_CONTRACTS: DualInterfaceContract[] = [
  {
    id: 'trade-board.list',
    routeFile: 'app/api/nic-nac/trade-board/route.ts',
    routeMethods: ['GET'],
    toolFile: 'lib/nic-nac/tools/list-my-trade-board.ts',
    serviceFunctions: ['getMyBoard'],
    clientMode: 'auth',
    notes: 'Read the authenticated rep board through the rep-scoped client.',
  },
  {
    id: 'trade-board.add',
    routeFile: 'app/api/nic-nac/trade-board/route.ts',
    routeMethods: ['POST'],
    toolFile: 'lib/nic-nac/tools/add-listing.ts',
    serviceFunctions: ['addListing'],
    clientMode: 'service_role',
    notes:
      'Add listings through admin-backed service code because catalog/design writes cross shared tables.',
  },
  {
    id: 'trade-board.update',
    routeFile: 'app/api/nic-nac/trade-board/route.ts',
    routeMethods: ['PATCH'],
    toolFile: 'lib/nic-nac/tools/update-listing.ts',
    serviceFunctions: ['updateListing'],
    clientMode: 'auth',
    notes: 'Patch only authenticated rep-owned listing fields.',
  },
  {
    id: 'trade-board.remove',
    routeFile: 'app/api/nic-nac/trade-board/route.ts',
    routeMethods: ['DELETE'],
    toolFile: 'lib/nic-nac/tools/remove-listing.ts',
    serviceFunctions: ['removeListing'],
    clientMode: 'auth',
    notes: 'Soft-remove authenticated rep-owned listings only.',
  },
  {
    id: 'trade-board.restore',
    routeFile: 'app/api/nic-nac/trade-board/route.ts',
    routeMethods: ['PATCH'],
    toolFile: 'lib/nic-nac/tools/restore-listing.ts',
    serviceFunctions: ['restoreListing'],
    clientMode: 'auth',
    notes: 'Restore authenticated rep-owned listings only inside the configured recovery window.',
  },
  {
    id: 'jewelry.search',
    routeFile: 'app/api/nic-nac/jewelry-library/route.ts',
    routeMethods: ['GET'],
    toolFile: 'lib/nic-nac/tools/search-jewelry-database.ts',
    serviceFunctions: ['searchJewelryDatabase'],
    clientMode: 'service_role',
    notes:
      'Search uses service role for shared catalog and aggregate active listing counts.',
  },
  {
    id: 'jewelry.add-from-library',
    routeFile: 'app/api/nic-nac/jewelry-library/route.ts',
    routeMethods: ['POST'],
    toolFile: 'lib/nic-nac/tools/add-listing.ts',
    serviceFunctions: ['addListing'],
    clientMode: 'service_role',
    notes: 'Library add is the same admin-backed listing creation contract.',
  },
  {
    id: 'trade-requests.list',
    routeFile: 'app/api/nic-nac/trade-requests/route.ts',
    routeMethods: ['GET'],
    toolFile: 'lib/nic-nac/tools/get-trade-requests.ts',
    serviceFunctions: ['getTradeRequests'],
    clientMode: 'auth',
    notes: 'Read incoming requests for authenticated rep-owned listings.',
  },
  {
    id: 'trade-requests.approve',
    routeFile: 'app/api/nic-nac/trade-requests/route.ts',
    routeMethods: ['POST'],
    toolFile: 'lib/nic-nac/tools/approve-trade.ts',
    serviceFunctions: ['approveTrade'],
    clientMode: 'service_role',
    notes:
      'Approve uses admin-backed atomic RPC service code after session-bound rep authentication.',
  },
  {
    id: 'trade-requests.reject',
    routeFile: 'app/api/nic-nac/trade-requests/route.ts',
    routeMethods: ['POST'],
    toolFile: 'lib/nic-nac/tools/reject-trade.ts',
    serviceFunctions: ['rejectTrade'],
    clientMode: 'service_role',
    notes:
      'Reject uses admin-backed atomic RPC service code after session-bound rep authentication.',
  },
  {
    id: 'fulfillment.list',
    routeFile: 'app/api/nic-nac/fulfillment-queue/route.ts',
    routeMethods: ['GET'],
    toolFile: 'lib/nic-nac/tools/get-fulfillment-queue.ts',
    serviceFunctions: ['getFulfillmentQueue'],
    clientMode: 'auth',
    notes: 'Read authenticated rep fulfillment queue through service layer.',
  },
  {
    id: 'fulfillment.update',
    routeFile: 'app/api/nic-nac/fulfillment-queue/route.ts',
    routeMethods: ['POST'],
    toolFile: 'lib/nic-nac/tools/update-fulfillment-status.ts',
    serviceFunctions: ['updateFulfillmentStatus'],
    clientMode: 'auth',
    notes: 'Update authenticated rep fulfillment status through the shared service layer.',
  },
]
