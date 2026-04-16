# Sparkle Suite — Shared Service Layer Specification

📍 WHERE THIS FILE LIVES: Google Drive /Neon Rabbit/
🔍 HOW CLAUDE ACCESSES IT: Upload to chat when needed
📁 UPLOAD TO PROJECT: No
🏷 PROJECT: Sparkle Suite
👤 WHO USES IT: Louis (reference), Claude (session context), Claude Code (build execution)
🔄 UPDATE TRIGGER: Any service function added, business rule changed, or error handling pattern modified

**Version:** 1.0 | **Created:** April 11, 2026 | **Status:** APPROVED — Ready for Phase 0 build
**Source session:** Session #23 (April 11, 2026) — Task 0.1b design session

---

## What This Is (Plain Language)

The shared service layer is the single set of functions that actually do all trade board work. Both Thumper (conversational chatbot) and the rep dashboard (buttons and forms) call these same functions. Neither interface contains business logic — all rules live here in the service layer.

Think of it as the kitchen in a restaurant. Thumper is one waiter. The dashboard is another. Both send orders to the same kitchen. The kitchen cooks identically regardless of who took the order.

**Why it matters:** One place to fix bugs. One place to change business rules. No risk of Thumper and the dashboard behaving differently.

---

## Architecture Pattern

```
Thumper Tool Handler              Dashboard API Route
  (app/api/thumper/tools/)          (app/api/dashboard/)
        │                                  │
        │   Handles auth, extracts         │   Handles auth, extracts
        │   rep_id, validates input        │   rep_id, validates input
        │   shape, formats response        │   shape, returns JSON
        │   as conversation                │
        │                                  │
        └──────────────┐   ┌───────────────┘
                       ▼   ▼
               Service Layer Function
                (lib/services/*.ts)
                       │
                       │   Validates business rules
                       │   Executes database operations
                       │   Returns typed result
                       │
                       ▼
              Supabase Client (server)
                (lib/supabase.ts)
```

**Key constraint:** Service functions never know who called them. They receive a `rep_id` (UUID) and validated input. They return a typed result. The caller handles everything else (auth, input parsing, response formatting).

---

## File Organization

Four service files plus two supporting files. All in `lib/services/` in the neon-rabbit-core repo.

| File | Domain | Tools Covered |
|------|--------|---------------|
| `trade-board.ts` | Listings — adding, viewing, removing, updating pieces on a rep's board | Tools 1, 2, 3, 8 |
| `trade-requests.ts` | Trade requests — customer submissions, rep approvals/rejections, history | Tools 4, 5, 6, 9 + customer submission |
| `trade-fulfillment.ts` | Fulfillment — post-approval shipping pipeline | Tool 10 + queue helper |
| `jewelry-database.ts` | Jewelry catalog — searching, resolving item numbers, creating new designs | Tool 7 + internal helpers |
| `types.ts` | All shared TypeScript types, input/output interfaces, enums | — |
| `errors.ts` | Custom error classes and predefined error messages | — |

---

## Critical Business Rule: One Request Per Piece

**Decided Session #23 (April 11, 2026). Supersedes Gap 22 Session #21 design.**

Only ONE trade request can exist per listing at a time. When a customer submits a trade request:

1. Listing status changes from "available" to "pending_trade" immediately
2. The piece DISAPPEARS from the public trade board completely
3. No other customer can request it
4. First-come, first-served

If the rep APPROVES: listing → "traded", fulfillment row created. Piece is gone permanently.
If the rep REJECTS: listing → "available", piece reappears on the board. Another customer can try.

**Why:** Simpler for reps (no inbox of competing requests to sort through), fairer for customers (first to click wins), eliminates favoritism and conflict, simpler code.

**Enforcement:**
- Customer-facing form: "I Want This" button only renders when `listing.status === 'available'`
- Supabase Realtime on `trade_listings` table: if another customer is viewing the board when a request is submitted, the piece disappears in real-time
- Database safety net: partial unique index `CREATE UNIQUE INDEX ON trade_requests(listing_id) WHERE status = 'pending'` prevents duplicate pending requests at the database level (flag for Phase 0.2)
- Service function validates listing status is "available" before accepting request

---

## Postgres RPC Functions (Atomic Operations)

Three database-level functions ensure multi-table operations succeed or fail as a unit. These are called by the service layer — NOT directly by Thumper or dashboard routes.

### 1. `rpc_submit_trade_request`

Called when a customer submits a trade request from the public board.

**Atomic steps (all or nothing):**
1. Validate listing exists and status is "available"
2. INSERT into `trade_requests` (status: "pending")
3. UPDATE `trade_listings` SET status = "pending_trade"

**If listing is not "available":** Returns error — another customer got there first.

### 2. `rpc_approve_trade`

Called when a rep approves a pending trade request.

**Atomic steps (all or nothing):**
1. UPDATE `trade_requests` SET status = "approved"
2. UPDATE `trade_listings` SET status = "traded"
3. INSERT into `trade_fulfillment` (status: "approved")
4. UPDATE `jewelry_designs` INCREMENT `times_traded`

**Returns:** `fulfillment_id` for the newly created fulfillment record.

### 3. `rpc_reject_trade`

Called when a rep rejects a pending trade request.

**Atomic steps (all or nothing):**
1. UPDATE `trade_requests` SET status = "denied", reason, rep_notes
2. UPDATE `trade_listings` SET status = "available" (piece reappears on board)

---

## Service Functions — Complete Reference

### File: `lib/services/trade-board.ts`

Covers Tools 1, 2, 3, 8 — everything about managing pieces on a rep's board.

---

#### `addListing` (Tool 1 — Single)

**Purpose:** Add one piece to the rep's trade board.

**Signature:**
```typescript
export async function addListing(
  repId: string,
  input: {
    // At least one of itemNumber or labelPhotoUrl REQUIRED
    itemNumber?: string;
    labelPhotoUrl?: string;
    // Optional overrides
    listingPhotoUrl?: string;
    tradePreferences?: string;
    collectionName?: string;
    // Only needed when creating a new jewelry_designs row
    designName?: string;
    material?: string;
    mainStone?: string;
    bpMsrp?: number;
    piecePhotoUrl?: string;
    specialFeatures?: string;
    lengthInfo?: string;
    // Required
    clickwrapAcknowledged: boolean;
  }
): Promise<AddListingResult>
```

**Resolution logic (internal):**
1. Get `itemNumber` — provided directly OR extracted from label photo via OCR (OCR is handled by Thumper BEFORE calling this function; service receives the extracted item number)
2. Call `resolveItemNumber(itemNumber)` from `jewelry-database.ts`
3. IF FOUND + collection populated → INSERT `trade_listings` with canonical photo. Done.
4. IF FOUND + collection NULL → caller must provide `collectionName`. UPDATE `jewelry_designs.collection_id`. INSERT `trade_listings`. Done.
5. IF NOT FOUND → caller must provide all new design fields including `piecePhotoUrl`. Call `createDesign()`. INSERT `trade_listings`. Done.

**Validation rules:**
- At least one of `itemNumber` or `labelPhotoUrl` must be provided → error `MISSING_ITEM_INPUT`
- `clickwrapAcknowledged` must be `true` → error `CLICKWRAP_REQUIRED`
- If design not found in DB, `piecePhotoUrl` is REQUIRED → error `MISSING_PIECE_PHOTO`
- Duplicate check: same rep + same design + status "available" → error `DUPLICATE_LISTING`
- Sets `listed_at = now()` explicitly on INSERT (separate from `created_at`)
- Increments `jewelry_designs.times_listed` on EVERY listing, not just new designs

**Return:**
```typescript
interface AddListingResult {
  listingId: string;
  designId: string;
  status: 'available';
  isNewDesign: boolean;
  designName: string;
  itemNumber: string;
  photoSource: 'canonical' | 'custom';
}
```

---

#### `addListingBatch` (Tool 1 — Batch)

**Purpose:** Add multiple pieces in one operation. Same logic as `addListing` looped.

**Signature:**
```typescript
export async function addListingBatch(
  repId: string,
  items: Array<{
    itemNumber?: string;
    labelPhotoUrl?: string;
    listingPhotoUrl?: string;
    tradePreferences?: string;
    collectionName?: string;
    designName?: string;
    material?: string;
    mainStone?: string;
    bpMsrp?: number;
    piecePhotoUrl?: string;
    specialFeatures?: string;
    lengthInfo?: string;
  }>,
  clickwrapAcknowledged: boolean
): Promise<AddListingBatchResult>
```

**Behavior:**
- Batch-queries database for all item numbers
- Sorts into three buckets: ready to list / need collection / need full info and photo
- Auto-lists ready items immediately
- Returns pending items array for caller to collect missing info

**Return:**
```typescript
interface AddListingBatchResult {
  total: number;
  listed: number;
  needsInput: number;
  pending: Array<{
    itemNumber: string;
    needs: 'collection' | 'full_info_and_photo';
  }>;
  completed: string[]; // listing IDs
}
```

---

#### `getMyBoard` (Tool 2)

**Purpose:** Return the rep's current trade board with filters and summary stats.

**Signature:**
```typescript
export async function getMyBoard(
  repId: string,
  filters?: {
    statusFilter?: ListingStatus;
    collectionFilter?: string;
    typeFilter?: JewelryType;
    sortBy?: 'created_at' | 'listed_at' | 'msrp' | 'design_name' | 'collection';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
): Promise<BoardResult>
```

**Return:**
```typescript
interface BoardResult {
  listings: TradeListingWithDesign[];
  summary: {
    totalPieces: number;
    totalMsrp: number;
    typeBreakdown: Record<JewelryType, number>;
    pendingRequestCount: number;
  };
}
```

**Notes:**
- Pure read operation
- Joins `trade_listings` → `jewelry_designs` → `collections`
- `pendingRequestCount` counts requests with status "pending" across all rep's listings
- Default sort: `listed_at` descending (newest first)

---

#### `removeListing` (Tool 3)

**Purpose:** Soft-remove a listing from the rep's board.

**Signature:**
```typescript
export async function removeListing(
  repId: string,
  input: {
    listingId?: string;    // lookup by ID
    itemNumber?: string;   // OR lookup by item number
    reason?: RemovalReason; // sold | keeping | mistake | other
  }
): Promise<RemoveListingResult>
```

**Behavior:**
- Sets listing status → "removed" (soft delete — never hard delete)
- If a pending trade request exists for this listing → auto-cancel it (status → "cancelled")
- Returns warning to caller if a request was cancelled so Thumper/dashboard can inform the rep

**Validation:**
- Listing must belong to `repId` → error `UNAUTHORIZED`
- At least one of `listingId` or `itemNumber` required → error `LISTING_NOT_FOUND`

**Return:**
```typescript
interface RemoveListingResult {
  listingId: string;
  designName: string;
  previousStatus: ListingStatus;
  cancelledRequestId?: string; // present if a pending request was auto-cancelled
  cancelledRequestCustomerName?: string;
}
```

---

#### `updateListing` (Tool 8)

**Purpose:** Modify an existing listing's trade preferences, photo, or notes.

**Signature:**
```typescript
export async function updateListing(
  repId: string,
  input: {
    listingId?: string;
    itemNumber?: string;
    tradePreferences?: string;
    listingPhotoUrl?: string;
    useCanonicalPhoto?: boolean;
    repNotes?: string;
  }
): Promise<UpdateListingResult>
```

**Behavior:**
- Partial update — only provided fields change
- If `useCanonicalPhoto` is true, clears `listing_photo_url` and sets `uses_canonical_photo = true`

**Validation:**
- Listing must belong to `repId` → error `UNAUTHORIZED`
- Listing must be in "available" or "pending_trade" status (can't edit traded/removed listings)

**Return:**
```typescript
interface UpdateListingResult {
  listingId: string;
  updatedFields: string[];
}
```

---

### File: `lib/services/trade-requests.ts`

Covers Tools 4, 5, 6, 9 — trade request management plus customer submission.

---

#### `submitTradeRequest` (Customer-Facing — NOT a Thumper tool)

**Purpose:** Customer submits a trade request from the public board. This is a public API operation, not rep-authenticated.

**Signature:**
```typescript
export async function submitTradeRequest(
  input: {
    listingId: string;
    customerName: string;
    customerDescription: string;
    clickwrapAcknowledged: boolean;
  }
): Promise<SubmitTradeRequestResult>
```

**Behavior:**
- Calls `rpc_submit_trade_request` Postgres function (atomic)
- INSERT `trade_requests` + UPDATE `trade_listings.status` → "pending_trade" in one transaction
- Piece disappears from public board immediately (Supabase Realtime broadcasts the status change)

**Validation:**
- `clickwrapAcknowledged` must be true → error `CLICKWRAP_REQUIRED`
- Listing must exist → error `LISTING_NOT_FOUND`
- Listing status must be "available" → error `REQUEST_ALREADY_EXISTS` (another customer got there first)
- `customerName` and `customerDescription` must be non-empty

**Return:**
```typescript
interface SubmitTradeRequestResult {
  requestId: string;
  listingId: string;
  designName: string;
  customerName: string;
}
```

---

#### `getTradeRequests` (Tool 4)

**Purpose:** Return the rep's incoming trade request inbox.

**Signature:**
```typescript
export async function getTradeRequests(
  repId: string,
  filters?: {
    statusFilter?: TradeRequestStatus; // default: 'pending'
    listingId?: string;
    sortBy?: 'created_at' | 'customer_name';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
): Promise<TradeRequestsResult>
```

**Return:**
```typescript
interface TradeRequestsResult {
  requests: Array<{
    requestId: string;
    customerName: string;
    customerDescription: string;
    createdAt: string;
    status: TradeRequestStatus;
    listing: {
      listingId: string;
      designName: string;
      itemNumber: string;
      bpMsrp: number;
      photoUrl: string;
      collection: string;
    };
  }>;
  totalCount: number;
}
```

**Notes:**
- Pure read operation
- Default status filter is "pending" — shows actionable items first
- MSRP match quality flagging is NOT in this function — that's a Thumper presentation concern. Thumper reads the `bpMsrp` and `customerDescription` and interprets the match quality conversationally.

---

#### `approveTrade` (Tool 5)

**Purpose:** Approve a pending trade request.

**Signature:**
```typescript
export async function approveTrade(
  repId: string,
  input: {
    requestId: string;
    repNotes?: string;
  }
): Promise<ApproveTradeResult>
```

**Behavior:**
- Calls `rpc_approve_trade` Postgres function (atomic — 4 steps)
- Request status → "approved"
- Listing status → "traded" (from either "available" or "pending_trade" — both valid at approval time)
- Creates `trade_fulfillment` row (status: "approved")
- Increments `jewelry_designs.times_traded`

**Validation:**
- Request must exist and belong to rep's listing → error `UNAUTHORIZED`
- Request must be in "pending" status → error `REQUEST_NOT_PENDING`

**Return:**
```typescript
interface ApproveTradeResult {
  requestId: string;
  fulfillmentId: string;
  designName: string;
  customerName: string;
}
```

---

#### `rejectTrade` (Tool 6)

**Purpose:** Reject a pending trade request. Piece reappears on board.

**Signature:**
```typescript
export async function rejectTrade(
  repId: string,
  input: {
    requestId: string;
    reason?: RejectionReason; // msrp_mismatch | not_interested | changed_mind | other
    repNotes?: string;
  }
): Promise<RejectTradeResult>
```

**Behavior:**
- Calls `rpc_reject_trade` Postgres function (atomic — 2 steps)
- Request status → "denied"
- Listing status → "available" (piece reappears on public board via Realtime)
- No fulfillment row created
- No customer notification sent

**Validation:**
- Request must exist and belong to rep's listing → error `UNAUTHORIZED`
- Request must be in "pending" status → error `REQUEST_NOT_PENDING`

**Return:**
```typescript
interface RejectTradeResult {
  requestId: string;
  listingId: string;
  designName: string;
  listingRestoredToAvailable: boolean;
}
```

---

#### `getTradeHistory` (Tool 9)

**Purpose:** Return completed, denied, and cancelled trades with summary analytics.

**Signature:**
```typescript
export async function getTradeHistory(
  repId: string,
  filters?: {
    statusFilter?: TradeRequestStatus; // approved | denied | cancelled
    customerName?: string;
    itemNumber?: string;
    collectionFilter?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'created_at' | 'customer_name' | 'msrp';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
): Promise<TradeHistoryResult>
```

**Return:**
```typescript
interface TradeHistoryResult {
  trades: TradeHistoryEntry[];
  summary: {
    totalCompleted: number;
    totalMsrpTraded: number;
    avgFulfillmentDays: number; // calculated from fulfillment created_at to completed_at
    topDesign: { designName: string; timesTraded: number } | null;
    repeatCustomers: Array<{ name: string; tradeCount: number }>;
  };
  totalCount: number;
}
```

**Notes:**
- Pure read operation
- Joins: `trade_requests` → `trade_fulfillment` → `trade_listings` → `jewelry_designs` → `collections`
- `avgFulfillmentDays` only calculated from trades with status "completed"

---

### File: `lib/services/trade-fulfillment.ts`

Covers Tool 10 plus the fulfillment queue helper for dashboard.

---

#### `updateFulfillmentStatus` (Tool 10)

**Purpose:** Move an approved trade through the fulfillment pipeline.

**Signature:**
```typescript
export async function updateFulfillmentStatus(
  repId: string,
  input: {
    requestId?: string;      // lookup by request ID
    customerName?: string;   // OR lookup by customer name
    newStatus: FulfillmentStatus; // approved → shipped → completed
    shippingNotes?: string;
    addToBoard?: boolean;    // on completion, signal to add received piece
  }
): Promise<UpdateFulfillmentResult>
```

**Behavior:**
- Forward-only status progression: approved → shipped → completed (no backwards)
- If lookup by `customerName` and multiple active fulfillments match → error `AMBIGUOUS_CUSTOMER` (ask rep to specify which one)
- On "completed" with `addToBoard = true` → returns `shouldPromptAddToBoard: true` so Thumper/dashboard can initiate `addListing` flow for the revealed piece the rep received

**Validation:**
- Fulfillment must exist and belong to rep → error `UNAUTHORIZED`
- Status must progress forward → error `INVALID_STATUS_TRANSITION`
- At least one of `requestId` or `customerName` required

**Return:**
```typescript
interface UpdateFulfillmentResult {
  requestId: string;
  fulfillmentId: string;
  previousStatus: FulfillmentStatus;
  newStatus: FulfillmentStatus;
  shouldPromptAddToBoard: boolean;
  customerName: string;
}
```

**Thumper nudge data (NOT in this function — handled by Thumper's scheduled checks):**
- 3+ days at "approved" → "Your trade with Sarah is still pending shipment. Ready to ship her piece?"
- 5+ days at "shipped" → "Sarah's package went out 5 days ago. Ready to mark that trade as complete?"

---

#### `getFulfillmentQueue` (Dashboard Helper — NOT a Thumper Tool)

**Purpose:** Return all active fulfillment work items for the rep's dashboard.

**Signature:**
```typescript
export async function getFulfillmentQueue(
  repId: string,
  filters?: {
    statusFilter?: FulfillmentStatus; // filter to specific status
    limit?: number;
    offset?: number;
  }
): Promise<FulfillmentQueueResult>
```

**Return:**
```typescript
interface FulfillmentQueueResult {
  items: Array<{
    fulfillmentId: string;
    requestId: string;
    customerName: string;
    designName: string;
    itemNumber: string;
    photoUrl: string;
    bpMsrp: number;
    customerDescription: string; // what customer offered
    fulfillmentStatus: FulfillmentStatus;
    approvedAt: string;
    statusUpdatedAt: string;
    shippingNotes?: string;
    daysSinceLastUpdate: number;
  }>;
  totalCount: number;
}
```

**Notes:**
- Pure read operation
- Only returns non-completed fulfillments (active work items)
- Completed items are accessed via `getTradeHistory` instead
- `daysSinceLastUpdate` helps identify stale items in the dashboard UI

---

### File: `lib/services/jewelry-database.ts`

Covers Tool 7 plus internal helpers used by `addListing`.

---

#### `searchJewelryDatabase` (Tool 7)

**Purpose:** Search the full jewelry catalog across all reps. Privacy-respecting — aggregate stats only.

**Signature:**
```typescript
export async function searchJewelryDatabase(
  repId: string, // needed for isOnMyBoard flag
  filters: {
    query?: string;           // free text search on design_name, material, main_stone
    itemNumber?: string;      // exact match
    collectionFilter?: string;
    typeFilter?: JewelryType; // RG | NK | ER | ST | BR
    materialFilter?: string;
    msrpMin?: number;
    msrpMax?: number;
    stoneFilter?: string;
    sortBy?: 'design_name' | 'msrp' | 'times_traded' | 'times_listed';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }
): Promise<JewelrySearchResult>
```

**Return:**
```typescript
interface JewelrySearchResult {
  designs: Array<{
    designId: string;
    itemNumber: string;
    designName: string;
    collection: string | null;
    material: string;
    mainStone: string;
    bpMsrp: number;
    canonicalPhotoUrl: string | null;
    typePrefix: JewelryType;
    timesTraded: number;
    timesListed: number;
    specialFeatures?: string;
    lengthInfo?: string;
    isOnMyBoard: boolean;          // does THIS rep have it listed?
    activeListingsCount: number;   // how many reps have it listed (aggregate)
  }>;
  totalCount: number;
}
```

**Privacy rule:** `activeListingsCount` is aggregate only. Reps cannot see WHICH other reps have a piece listed. No individual rep identification.

**Full-text search note:** The `query` parameter searches across `design_name`, `material`, and `main_stone` fields. Requires a GIN index for performance. **Phase 0.2 must create this index.** Without it, free text search falls back to slow `ILIKE` queries.

Phase 0.2 should add:
```sql
CREATE INDEX idx_designs_fulltext ON jewelry_designs
  USING GIN (to_tsvector('english', coalesce(design_name, '') || ' ' || coalesce(material, '') || ' ' || coalesce(main_stone, '')));
```

---

#### `resolveItemNumber` (Internal Helper)

**Purpose:** Look up a jewelry design by item number. Used internally by `addListing`.

**Signature:**
```typescript
export async function resolveItemNumber(
  itemNumber: string
): Promise<DesignLookupResult>
```

**Return:**
```typescript
interface DesignLookupResult {
  found: boolean;
  design?: JewelryDesign;        // full design record if found
  hasCollection: boolean;         // true if collection_id is populated
  collectionName?: string;        // collection name if populated
}
```

---

#### `createDesign` (Internal Helper)

**Purpose:** Create a new jewelry design record when it doesn't exist in the database. Used internally by `addListing`.

**Signature:**
```typescript
export async function createDesign(
  input: {
    itemNumber: string;
    designName: string;
    material: string;
    mainStone: string;
    bpMsrp: number;
    piecePhotoUrl: string; // becomes canonical_photo_url
    collectionName?: string;
    specialFeatures?: string;
    lengthInfo?: string;
  }
): Promise<JewelryDesign>
```

**Behavior:**
- Extracts `type_prefix` from the first two characters of `itemNumber` (RG, NK, ER, ST, BR)
- If `collectionName` provided → look up or create `collections` row, set `collection_id`
- `piecePhotoUrl` becomes `canonical_photo_url`
- `times_traded` and `times_listed` initialized to 0

---

#### `updateCanonicalPhoto` (Internal Helper)

**Purpose:** Update the canonical photo for a design when a rep uploads a better one.

**Signature:**
```typescript
export async function updateCanonicalPhoto(
  designId: string,
  photoUrl: string
): Promise<void>
```

**Notes:**
- Admin-level operation — Louis curates best photos
- Future: Thumper prompts reps "Your photo looks better than what we have. Want to update the database photo?"

---

## Error Handling

### Error Class

```typescript
// lib/services/errors.ts

export class ServiceError extends Error {
  constructor(
    public code: string,        // machine-readable error code
    public message: string,     // developer-readable description
    public userMessage: string, // friendly message for Thumper / dashboard UI
    public statusCode: number = 400
  ) {
    super(message);
  }
}
```

### How Callers Use Errors

**Thumper tool handler:** Catches `ServiceError`, uses `userMessage` as Thumper's conversational response to the rep.

**Dashboard API route:** Catches `ServiceError`, returns JSON `{ error: code, message: userMessage }` with the HTTP `statusCode`.

### Predefined Errors

```typescript
export const Errors = {

  // Input validation
  MISSING_ITEM_INPUT: new ServiceError(
    'MISSING_ITEM_INPUT',
    'No item number or label photo provided',
    'I need either the item number or a photo of the label to get started.',
    400
  ),

  MISSING_PIECE_PHOTO: new ServiceError(
    'MISSING_PIECE_PHOTO',
    'New design requires piece photo for canonical image',
    'This is a new design — I need a photo from your lightbox to add it to the database.',
    400
  ),

  CLICKWRAP_REQUIRED: new ServiceError(
    'CLICKWRAP_REQUIRED',
    'Clickwrap acknowledgment not provided',
    'You need to confirm ownership and MSRP accuracy before listing.',
    400
  ),

  // Listing errors
  LISTING_NOT_FOUND: new ServiceError(
    'LISTING_NOT_FOUND',
    'Trade listing not found or does not belong to this rep',
    'I couldn\'t find that listing on your board.',
    404
  ),

  DUPLICATE_LISTING: new ServiceError(
    'DUPLICATE_LISTING',
    'Design already listed by this rep with status available',
    'You already have this piece on your board. Want to update it instead?',
    409
  ),

  // Trade request errors
  REQUEST_NOT_PENDING: new ServiceError(
    'REQUEST_NOT_PENDING',
    'Trade request is not in pending status',
    'That trade request has already been handled.',
    409
  ),

  REQUEST_ALREADY_EXISTS: new ServiceError(
    'REQUEST_ALREADY_EXISTS',
    'Listing already has a pending trade request from another customer',
    'This piece already has a pending trade request. Check back later — it may become available again.',
    409
  ),

  // Fulfillment errors
  INVALID_STATUS_TRANSITION: new ServiceError(
    'INVALID_STATUS_TRANSITION',
    'Cannot move fulfillment status backwards',
    'You can only move trades forward: approved → shipped → completed.',
    400
  ),

  AMBIGUOUS_CUSTOMER: new ServiceError(
    'AMBIGUOUS_CUSTOMER',
    'Multiple active fulfillments match this customer name',
    'You have more than one active trade with that customer. Which one do you mean?',
    400
  ),

  FULFILLMENT_NOT_FOUND: new ServiceError(
    'FULFILLMENT_NOT_FOUND',
    'Fulfillment record not found',
    'I couldn\'t find that trade in your fulfillment queue.',
    404
  ),

  // Authorization
  UNAUTHORIZED: new ServiceError(
    'UNAUTHORIZED',
    'Rep does not own this resource',
    'Something went wrong — that doesn\'t seem to be yours.',
    403
  ),

} as const;
```

---

## Security: Two Layers

### Layer 1 — Supabase RLS (Database Level)

Already designed in SS_Supabase_Schema_v1_0.md. RLS policies restrict every query to the authenticated rep's data. Even if the service code has a bug, the database won't return another rep's data.

### Layer 2 — Service Function Validation (Application Level)

Every write operation double-checks that the target resource belongs to `repId` before modifying it. Belt and suspenders.

### Supabase Client Strategy

```typescript
// lib/supabase.ts

// For rep-authenticated operations (most service functions)
// Uses the rep's auth token — RLS enforces data isolation
export function createAuthClient(authToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${authToken}` } } }
  );
}

// For cross-rep reads and admin operations ONLY
// Bypasses RLS — use with extreme caution
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

**Which client each function uses:**
- `searchJewelryDatabase` → service client (reads aggregate data across all reps)
- `submitTradeRequest` → service client (customer is not authenticated as a rep)
- `resolveItemNumber`, `createDesign` → service client (shared data, not rep-scoped)
- ALL other functions → auth client (rep-scoped operations)

---

## Schema Flags for Phase 0.2

These items are NOT in SS_Supabase_Schema_v1_0.md yet and must be added during the Phase 0.2 table creation:

1. **Partial unique index for one-request-per-piece rule:**
   ```sql
   CREATE UNIQUE INDEX idx_one_pending_request_per_listing
     ON trade_requests(listing_id)
     WHERE status = 'pending';
   ```

2. **GIN index for jewelry database free-text search:**
   ```sql
   CREATE INDEX idx_designs_fulltext ON jewelry_designs
     USING GIN (to_tsvector('english',
       coalesce(design_name, '') || ' ' ||
       coalesce(material, '') || ' ' ||
       coalesce(main_stone, '')));
   ```

3. **Three Postgres RPC functions:**
   - `rpc_submit_trade_request(p_listing_id, p_customer_name, p_customer_description)`
   - `rpc_approve_trade(p_request_id, p_rep_notes)`
   - `rpc_reject_trade(p_request_id, p_reason, p_rep_notes)`

---

## Enum Types (TypeScript)

These mirror the Postgres enums from SS_Supabase_Schema_v1_0.md:

```typescript
// lib/services/types.ts

type ListingStatus = 'available' | 'pending_trade' | 'traded' | 'removed';
type TradeRequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled';
type FulfillmentStatus = 'approved' | 'shipped' | 'completed';
type JewelryType = 'RG' | 'NK' | 'ER' | 'ST' | 'BR';
type RemovalReason = 'sold' | 'keeping' | 'mistake' | 'other';
type RejectionReason = 'msrp_mismatch' | 'not_interested' | 'changed_mind' | 'other';
```

---

## What This Spec Does NOT Cover

These are handled by OTHER phases and other service modules — not the trade board service layer:

- **Thumper conversation management** — message history, streaming, model routing (Phase 1.1–1.4)
- **Calendar operations** — add/update/cancel events, show cards (Phase 1.6, Phase 4)
- **Site customization** — banner, ticker, tagline, hero image (Phase 1.7)
- **SMS/Email sending** — Telnyx, Resend, wallet billing, content screening (Phase 5)
- **Thumper memory** — rep notes, conversation summaries (Phase 1.9)
- **AI photo enhancement** — pre-flight check, Photoroom API, QA inspector (Phase 7)
- **Onboarding pipeline** — agents, gates, intake form (Phase 8)
- **OCR / label photo extraction** — Thumper handles this BEFORE calling `addListing`. The service function receives the already-extracted item number. OCR is a Thumper concern, not a service layer concern.
- **MSRP match quality flagging** — Thumper interprets the data returned by `getTradeRequests` and adds its own commentary. Not a service function.
- **Thumper nudges for stale fulfillments** — Thumper's scheduled check reads fulfillment data and sends conversational nudges. The service layer just provides the data.

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | April 11, 2026 | Initial spec. All 10 trade board tools + customer submission + fulfillment queue helper. One-request-per-piece rule (Session #23 decision). Three Postgres RPC functions. Two-layer security. |

---

*This spec is the single source of truth for the Sparkle Suite shared service layer. Claude Code reads this when building Phase 1.5 (Thumper tools), Phase 3 (Trade Board UI), and Phase 6 (Rep Dashboard). Update it when business rules change. Do not update for features still in brainstorming — those go to Open Brain.*
