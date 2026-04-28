// Public barrel for the shared service layer. Both Thumper tool handlers
// and dashboard routes can import from '@/lib/services'. Existing tool
// callers that import from '@/lib/services/trade-board' continue to work
// (trade-board.ts remains the stable facade for those names).

// Errors
export { ServiceError, TradeBoardError, errors } from './errors'

// Types
export type {
  ListingStatus,
  TradeRequestStatus,
  FulfillmentStatus,
  JewelryType,
  RemovalReason,
  RejectionReason,
  TradeListingWithDesign,
  BoardResult,
  RemoveListingResult,
  GetMyBoardFilters,
  AddListingInput,
  AddListingResult,
  BatchListingItem,
  AddListingBatchInput,
  AddListingBatchResult,
  UpdateListingInput,
  UpdateListingResult,
  SubmitTradeRequestInput,
  SubmitTradeRequestResult,
  GetTradeRequestsFilters,
  TradeRequestWithListing,
  ApproveTradeResult,
  RejectTradeResult,
  GetTradeHistoryOptions,
  TradeHistoryItem,
  TradeHistoryResult,
  UpdateFulfillmentInput,
  UpdateFulfillmentResult,
  FulfillmentQueueItem,
  SearchJewelryInput,
  JewelryDatabaseResult,
  ResolveItemNumberResult,
  CreateDesignInput,
  CreateDesignResult,
  UpdateCanonicalPhotoResult,
} from './types'

// Trade Board
export { getMyBoard, removeListing, addListing, addListingBatch, updateListing } from './trade-board'

// Trade Requests
export {
  submitTradeRequest,
  getTradeRequests,
  approveTrade,
  rejectTrade,
  getTradeHistory,
} from './trade-requests'

// Trade Fulfillment
export { updateFulfillmentStatus, getFulfillmentQueue } from './trade-fulfillment'

// Jewelry Database
export {
  resolveItemNumber,
  searchJewelryDatabase,
  createDesign,
  updateCanonicalPhoto,
} from './jewelry-database'
