# Nic-Nac Trade Board State Sync Hardening Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the ER13229 Trade Board add-listing failure by making workflow truth learn from catalog tool results and current tool inputs, while preserving strict photo-role safety.

**Architecture:** App code remains the owner of workflow state, photo roles, validation, tool availability, and final mutations. The model may extract and call tools, but persisted workflow truth must ingest catalog results and rep-provided fields so stale state cannot veto a valid add-listing attempt. The service/tool layer remains the final validator for catalog existence, collection requirements, photo processing, and database mutation.

**Tech Stack:** Next.js App Router, TypeScript, Vercel AI SDK UIMessage/tool parts, Vitest, Supabase, Sparkle Suite Nic-Nac workflow tables.

---

## Diagnosis To Preserve

Live failing conversation: `dda90a1d-8735-4545-bf3e-77ca224aafcf`.

Observed state:

```text
catalog ER13229: valid
photo roles: label_details + jewelry_front
tool route: trade_board + catalog retained
add_listing input: itemNumber ER13229, collectionName July Birthday, collectionYear 2026, piecePhotoIndex 2
workflow known: itemNumber null, designName null, collectionName ection, collectionYear null
tool result: WORKFLOW_NOT_READY
```

Root cause:

```text
workflow state did not ingest search_jewelry_database output
collection parser matched "coll" inside "collection" and captured "ection"
add_listing checked stale workflow readiness before honoring current tool input
smoke replay did not cover label-only -> catalog match -> jewelry-only -> confirmation
```

## File Structure

- Modify `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\workflows\trade-board-intake-context.ts`
  - Ingest latest user text, catalog tool outputs, and image parts into workflow state.
  - Keep photo-role ingestion in this file.

- Create `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\workflows\trade-board-known-fields.ts`
  - Own known-field extraction, catalog-result extraction, collection normalization, and merge precedence.
  - Keep regex and normalization isolated from route context.

- Modify `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\workflows\trade-board-intake-controller.ts`
  - Add an add-attempt readiness helper that protects photo rules without letting stale catalog fields block service validation.

- Modify `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\tools\add-listing.ts`
  - Use add-attempt readiness for active workflow guards.
  - Keep service calls as final catalog/listing authority.

- Modify `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\trade-board-intake-route-context.test.ts`
  - Add regressions for catalog tool output ingestion and collection confirmation parsing.

- Modify `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\trade-board-intake-controller.test.ts`
  - Add deterministic add-attempt readiness tests.

- Modify `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\add-listing-recovery.test.ts`
  - Add regression for stale workflow state plus valid tool input.

- Modify or create `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\trade-board-intake-live-sequence.test.ts`
  - Add a compact, deterministic replay of the live sequence at the controller/tool level.

- Modify or create a smoke fixture under `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\fixtures\trade-board-er13229-sequence.ts`
  - Store the turn sequence and hard-fail phrases used by local tests and smoke scripts.

- Update `C:\Users\louis\sparkle-suite\vault\session-log.md`
  - Record the lesson after implementation and verification.

---

### Task 1: Write Failing Known-Field Regression Tests

**Files:**
- Modify: `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\trade-board-intake-route-context.test.ts`
- Later modify: `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\workflows\trade-board-known-fields.ts`

- [ ] **Step 1: Add a test for trailing collection confirmation**

Append this test inside `describe('Trade Board intake route context', () => { ... })`:

```ts
it('parses rep confirmation of trailing Birthday collection without capturing ection', async () => {
  const sessionRow = {
    id: 'workflow-1',
    rep_id: 'rep-1',
    conversation_id: 'conv-1',
    workflow_type: 'trade_board_add_listing',
    status: 'active',
    current_phase: 'details_capture',
    item_number: 'ER13229',
    design_name: 'The Florence Earrings',
    collection_name: null,
    collection_year: null,
    missing_fields: ['collectionName'],
    hard_blockers: [],
    soft_warnings: [],
  }
  const activeBuilder = {
    select: vi.fn(() => activeBuilder),
    eq: vi.fn(() => activeBuilder),
    gt: vi.fn(() => activeBuilder),
    order: vi.fn(() => activeBuilder),
    limit: vi.fn(() => activeBuilder),
    maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
  }
  const selectPhotosBuilder = {
    select: vi.fn(() => selectPhotosBuilder),
    eq: vi.fn(() => selectPhotosBuilder),
    order: vi.fn(() => ({ data: [
      {
        conversation_message_id: 'photo-msg-1',
        attachment_index: 1,
        declared_role: 'jewelry_front',
        visual_role: 'jewelry',
        role_confirmed: true,
        image_url: 'data:image/jpeg;base64,SkVXRUxSWQ==',
        quality: 'usable',
        quality_issues: [],
        notes: ['boxed display jewelry is centered and clear'],
      },
    ], error: null })),
  }
  const updateBuilder = {
    update: vi.fn(() => updateBuilder),
    eq: vi.fn(() => ({ error: null })),
  }
  const workflowSupabase = {
    from: vi.fn((table: string) => {
      if (table === 'trade_board_intake_sessions') {
        return workflowSupabase.from.mock.calls.filter(([name]) => name === table).length === 1
          ? activeBuilder
          : updateBuilder
      }
      if (table === 'trade_board_intake_photos') return selectPhotosBuilder
      throw new Error(`Unexpected table ${table}`)
    }),
  }

  const context = await getOrCreateTradeBoardIntakeContext({
    supabase: workflowSupabase as never,
    workflowSupabase: workflowSupabase as never,
    repId: 'rep-1',
    conversationId: 'conv-1',
    messages: [
      {
        id: 'assistant-1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'The system has July Birthday 2026 on file. Can you confirm the collection?' }],
      } as UIMessage,
      {
        id: 'user-1',
        role: 'user',
        parts: [{ type: 'text', text: 'That is correct. This is the July Birthday collection, 2026.' }],
      } as UIMessage,
    ],
    latestUserMessageId: 'user-1',
    mode: 'workspace',
    nowIso: '2026-06-16T00:00:00.000Z',
  } as never)

  expect(context.sessionAfter?.known).toMatchObject({
    itemNumber: 'ER13229',
    designName: 'The Florence Earrings',
    collectionName: 'July Birthday',
    collectionYear: 2026,
  })
  expect(context.sessionAfter?.known.collectionName).not.toBe('ection')
  expect(updateBuilder.update).toHaveBeenCalledWith(
    expect.objectContaining({
      collection_name: 'July Birthday',
      collection_year: 2026,
    }),
  )
})
```

- [ ] **Step 2: Add a test for catalog tool output ingestion**

Append this test in the same file:

```ts
it('persists catalog truth from search_jewelry_database output before the jewelry-only photo turn', async () => {
  const sessionRow = {
    id: 'workflow-1',
    rep_id: 'rep-1',
    conversation_id: 'conv-1',
    workflow_type: 'trade_board_add_listing',
    status: 'active',
    current_phase: 'photo_capture',
    item_number: null,
    design_name: null,
    collection_name: null,
    collection_year: null,
    missing_fields: ['itemNumber', 'designName', 'jewelryFrontPhoto'],
    hard_blockers: [],
    soft_warnings: [],
  }
  const activeBuilder = {
    select: vi.fn(() => activeBuilder),
    eq: vi.fn(() => activeBuilder),
    gt: vi.fn(() => activeBuilder),
    order: vi.fn(() => activeBuilder),
    limit: vi.fn(() => activeBuilder),
    maybeSingle: vi.fn(() => ({ data: sessionRow, error: null })),
  }
  const selectPhotosBuilder = {
    select: vi.fn(() => selectPhotosBuilder),
    eq: vi.fn(() => selectPhotosBuilder),
    order: vi.fn(() => ({ data: [
      {
        conversation_message_id: 'label-msg-1',
        attachment_index: 1,
        declared_role: 'label_details',
        visual_role: 'label_or_packaging',
        role_confirmed: true,
        image_url: 'data:image/jpeg;base64,TEFCRUw=',
        quality: 'unknown',
        quality_issues: [],
        notes: ['declared as label/details source'],
      },
    ], error: null })),
  }
  const upsertPhotoBuilder = {
    upsert: vi.fn(() => ({ error: null })),
  }
  const updateBuilder = {
    update: vi.fn(() => updateBuilder),
    eq: vi.fn(() => ({ error: null })),
  }
  const workflowSupabase = {
    from: vi.fn((table: string) => {
      const callsForTable = workflowSupabase.from.mock.calls.filter(([name]) => name === table).length
      if (table === 'trade_board_intake_sessions') return callsForTable === 1 ? activeBuilder : updateBuilder
      if (table === 'trade_board_intake_photos') return callsForTable === 1 ? selectPhotosBuilder : upsertPhotoBuilder
      throw new Error(`Unexpected table ${table}`)
    }),
  }

  const context = await getOrCreateTradeBoardIntakeContext({
    supabase: workflowSupabase as never,
    workflowSupabase: workflowSupabase as never,
    repId: 'rep-1',
    conversationId: 'conv-1',
    messages: [
      {
        id: 'assistant-search',
        role: 'assistant',
        parts: [
          {
            type: 'tool-search_jewelry_database',
            state: 'output-available',
            input: { query: 'ER13229' },
            output: {
              results: [
                {
                  itemNumber: 'ER13229',
                  designName: 'The Florence Earrings',
                  collectionName: 'July Birthday',
                  collectionYear: 2026,
                  mainStone: 'Lab-Created Ruby',
                  material: 'Rhodium Plating',
                  bpMsrp: 160,
                },
              ],
            },
          } as never,
          {
            type: 'text',
            text: 'Perfect! I found ER13229. Just need the customer-facing jewelry photo.',
          },
        ],
      } as UIMessage,
      {
        id: 'user-jewelry',
        role: 'user',
        parts: [
          { type: 'file', mediaType: 'image/jpeg', url: 'data:image/jpeg;base64,SkVXRUxSWQ==' },
        ],
      } as UIMessage,
    ],
    latestUserMessageId: 'user-jewelry',
    mode: 'workspace',
    nowIso: '2026-06-16T00:00:00.000Z',
  } as never)

  expect(context.sessionAfter?.known).toMatchObject({
    itemNumber: 'ER13229',
    designName: 'The Florence Earrings',
    collectionName: 'July Birthday',
    collectionYear: 2026,
    mainStone: 'Lab-Created Ruby',
    material: 'Rhodium Plating',
    bpMsrp: 160,
  })
  expect(context.sessionAfter?.photos).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ declaredRole: 'label_details' }),
      expect.objectContaining({ declaredRole: 'jewelry_front' }),
    ]),
  )
  expect(context.sessionAfter?.missing).toEqual([])
  expect(context.sessionAfter?.phase).toBe('ready_to_add')
})
```

- [ ] **Step 3: Run the route-context tests and verify they fail**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac/trade-board-intake-route-context.test.ts
```

Expected:

```text
FAIL tests/nic-nac/trade-board-intake-route-context.test.ts
collectionName received "ection" or catalog output fields remain null
```

---

### Task 2: Extract Known-Field Logic And Fix Collection Parsing

**Files:**
- Create: `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\workflows\trade-board-known-fields.ts`
- Modify: `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\workflows\trade-board-intake-context.ts`
- Test: `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\trade-board-intake-route-context.test.ts`

- [ ] **Step 1: Create the known-field helper module**

Create `lib/nic-nac/workflows/trade-board-known-fields.ts`:

```ts
import type { UIMessage } from 'ai'
import type { TradeBoardIntakeKnownFields } from './trade-board-intake-types'

type ToolPart = {
  type?: string
  state?: string
  output?: {
    results?: Array<Record<string, unknown>>
  }
}

export function mergeTradeBoardKnownFields(
  current: TradeBoardIntakeKnownFields,
  next: TradeBoardIntakeKnownFields,
): TradeBoardIntakeKnownFields {
  return {
    ...current,
    ...Object.fromEntries(
      Object.entries(next).filter(([, value]) => value !== undefined),
    ),
  }
}

export function extractKnownFieldsFromText(
  text: string,
): TradeBoardIntakeKnownFields {
  const known: TradeBoardIntakeKnownFields = {}
  const normalizedText = text.replace(/\s+/g, ' ').trim()
  const itemNumber = normalizedText.match(/\b[A-Z]{1,4}\d{3,}\b/i)?.[0]
  if (itemNumber) known.itemNumber = itemNumber.toUpperCase()

  const designName = itemNumber
    ? extractDesignNameNearItemNumber(normalizedText, itemNumber)
    : null
  if (designName) known.designName = designName

  const collection = extractCollectionFields(normalizedText)
  if (collection.collectionName) known.collectionName = collection.collectionName
  if (collection.collectionYear) known.collectionYear = collection.collectionYear

  const mainStone = normalizedText.match(
    /\b(Lab[-\s]?Created\s+[A-Z][A-Za-z]+)\b/i,
  )?.[1]
  if (mainStone) known.mainStone = normalizeCapitalizedPhrase(mainStone)

  const material = normalizedText.match(
    /\b((?:Rhodium|Rose Gold|Gold|Silver|Sterling Silver)\s+Plating)\b/i,
  )?.[1]
  if (material) known.material = normalizeCapitalizedPhrase(material)

  const msrp = normalizedText.match(/\$\s*(\d+(?:\.\d{1,2})?)\s*(?:MSRP)?\b/i)
  if (msrp?.[1]) known.bpMsrp = Number(msrp[1])

  const quantity = normalizedText.match(
    /\b(?:qty|quantity|count)\s*(?:is|:|-)?\s*(\d+)\b/i,
  )
  if (quantity?.[1]) known.quantity = Number(quantity[1])

  return known
}

export function extractKnownFieldsFromCatalogToolOutputs(
  messages: UIMessage[],
): TradeBoardIntakeKnownFields {
  const toolParts = messages
    .flatMap((message) => message.parts ?? [])
    .filter((part): part is ToolPart => {
      const type = (part as ToolPart).type
      return type === 'tool-search_jewelry_database'
    })
    .filter((part) => part.state === 'output-available')
    .reverse()

  for (const part of toolParts) {
    const result = part.output?.results?.[0]
    if (!result) continue
    const known = knownFieldsFromCatalogResult(result)
    if (known.itemNumber && known.designName) return known
  }

  return {}
}

export function knownFieldsFromCatalogResult(
  result: Record<string, unknown>,
): TradeBoardIntakeKnownFields {
  const known: TradeBoardIntakeKnownFields = {}
  if (typeof result.itemNumber === 'string' && result.itemNumber.trim()) {
    known.itemNumber = result.itemNumber.trim().toUpperCase()
  }
  if (typeof result.designName === 'string' && result.designName.trim()) {
    known.designName = result.designName.trim()
  }
  if (typeof result.collectionName === 'string' && result.collectionName.trim()) {
    known.collectionName = normalizeCollectionName(result.collectionName)
  }
  if (typeof result.collectionYear === 'number') {
    known.collectionYear = result.collectionYear
  }
  if (typeof result.material === 'string' && result.material.trim()) {
    known.material = normalizeCapitalizedPhrase(result.material)
  }
  if (typeof result.mainStone === 'string' && result.mainStone.trim()) {
    known.mainStone = normalizeCapitalizedPhrase(result.mainStone)
  }
  if (typeof result.bpMsrp === 'number') {
    known.bpMsrp = result.bpMsrp
  }
  return known
}

export function normalizeCollectionName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\bcollection\b$/i, '')
    .trim()
}

function extractCollectionFields(text: string): {
  collectionName?: string
  collectionYear?: number
} {
  const prefix = text.match(
    /\b(?:collection|coll)\b\s*(?:is|:|-)\s*([A-Za-z][A-Za-z\s]*?)(?:\s+Collection)?(?:[,\s]+(20\d{2}))?(?=\.|,|$)/i,
  )
  if (prefix?.[1]) {
    return {
      collectionName: normalizeCollectionName(prefix[1]),
      collectionYear: prefix[2] ? Number(prefix[2]) : undefined,
    }
  }

  const suffix = text.match(
    /\b([A-Za-z]+(?:\s+Birthday|(?:\s+Originals)|(?:\s+Luxe)|(?:\s+Stacks?))?)\s+collection\b(?:,?\s*(20\d{2}))?/i,
  )
  if (suffix?.[1]) {
    return {
      collectionName: normalizeCollectionName(suffix[1]),
      collectionYear: suffix[2] ? Number(suffix[2]) : undefined,
    }
  }

  return {}
}

function extractDesignNameNearItemNumber(
  text: string,
  itemNumber: string,
): string | null {
  const escaped = itemNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const after = text.match(new RegExp(`${escaped}\\s*(?:-|--|:|,)?\\s*([^.$]+)`, 'i'))?.[1]
  if (!after) return null
  const candidate = after
    .split(/\b(?:Lab[-\s]?Created|Rhodium|Rose Gold|Gold|Silver|Sterling|\$|MSRP|Collection)\b/i)[0]
    .replace(/^[\s,-]+|[\s,-]+$/g, '')
  if (!candidate || /\b(?:collection|photo|label|tag|details)\b/i.test(candidate)) return null
  return candidate
}

function normalizeCapitalizedPhrase(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) =>
      word
        .split('-')
        .map((part) =>
          part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part,
        )
        .join('-'),
    )
    .join(' ')
}
```

- [ ] **Step 2: Replace the private helpers in route context**

In `lib/nic-nac/workflows/trade-board-intake-context.ts`, add imports:

```ts
import {
  extractKnownFieldsFromCatalogToolOutputs,
  extractKnownFieldsFromText,
  mergeTradeBoardKnownFields,
} from './trade-board-known-fields'
```

Replace:

```ts
const known = mergeKnownFields(
  args.session.known,
  extractKnownFieldsFromText(latestUserText),
)
```

with:

```ts
const known = mergeTradeBoardKnownFields(
  mergeTradeBoardKnownFields(
    args.session.known,
    extractKnownFieldsFromCatalogToolOutputs(args.messages),
  ),
  extractKnownFieldsFromText(latestUserText),
)
```

Delete the private functions now owned by `trade-board-known-fields.ts`:

```ts
extractKnownFieldsFromText
extractDesignNameNearItemNumber
mergeKnownFields
normalizeCollectionName
normalizeCapitalizedPhrase
```

- [ ] **Step 3: Run the focused tests**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac/trade-board-intake-route-context.test.ts
```

Expected:

```text
PASS tests/nic-nac/trade-board-intake-route-context.test.ts
```

- [ ] **Step 4: Commit the parser/catalog-ingestion fix**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
git add lib/nic-nac/workflows/trade-board-known-fields.ts lib/nic-nac/workflows/trade-board-intake-context.ts tests/nic-nac/trade-board-intake-route-context.test.ts
git commit -m "fix: sync trade board workflow with catalog truth"
```

---

### Task 3: Add Add-Attempt Readiness Semantics

**Files:**
- Modify: `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\workflows\trade-board-intake-controller.ts`
- Test: `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\trade-board-intake-controller.test.ts`

- [ ] **Step 1: Add failing controller tests**

Append this test in `trade-board-intake-controller.test.ts`:

```ts
it('allows an add attempt when current tool input supplies stale workflow item fields and jewelry photo is confirmed', () => {
  const state = baseState({
    phase: 'details_capture',
    known: {
      collectionName: 'ection',
    },
    missing: ['itemNumber', 'designName'],
    photos: [
      {
        attachmentIndex: 1,
        declaredRole: 'label_details',
        visualRole: 'label_or_packaging',
        roleConfirmed: true,
        quality: 'unknown',
        qualityIssues: [],
        notes: ['declared as label/details source'],
      },
      {
        attachmentIndex: 1,
        declaredRole: 'jewelry_front',
        visualRole: 'jewelry',
        roleConfirmed: true,
        quality: 'unknown',
        qualityIssues: [],
        notes: ['declared as customer-facing jewelry photo'],
      },
    ],
  })

  const readiness = computeTradeBoardAddAttemptReadiness(state, {
    itemNumber: 'ER13229',
    collectionName: 'July Birthday',
    collectionYear: 2026,
  })

  expect(readiness.ready).toBe(true)
  expect(readiness.missing).toEqual([])
  expect(readiness.blockers).toEqual([])
})
```

Append this guard test:

```ts
it('still blocks an add attempt when the only workflow photo is label_details', () => {
  const state = baseState({
    known: {
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
    },
    photos: [
      {
        attachmentIndex: 1,
        declaredRole: 'label_details',
        visualRole: 'jewelry',
        roleConfirmed: true,
        quality: 'unknown',
        qualityIssues: [],
        notes: ['backs of earrings visible'],
      },
    ],
  })

  const readiness = computeTradeBoardAddAttemptReadiness(state, {
    itemNumber: 'ER13229',
    collectionName: 'July Birthday',
  })

  expect(readiness.ready).toBe(false)
  expect(readiness.missing).toContain('jewelryFrontPhoto')
})
```

Update the import list in that file to include:

```ts
computeTradeBoardAddAttemptReadiness,
```

- [ ] **Step 2: Run the controller tests and verify they fail**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac/trade-board-intake-controller.test.ts
```

Expected:

```text
FAIL computeTradeBoardAddAttemptReadiness is not exported
```

- [ ] **Step 3: Implement add-attempt readiness**

In `trade-board-intake-controller.ts`, import:

```ts
import { mergeTradeBoardKnownFields } from './trade-board-known-fields'
```

Add this exported helper after `computeTradeBoardIntakeReadiness`:

```ts
export function computeTradeBoardAddAttemptReadiness(
  state: TradeBoardIntakeSessionState,
  input: {
    itemNumber?: string
    designName?: string
    collectionName?: string
    collectionYear?: number
  },
): {
  ready: boolean
  missing: string[]
  blockers: string[]
  nextAction: TradeBoardIntakeNextAction
} {
  const known = mergeTradeBoardKnownFields(state.known, {
    itemNumber: input.itemNumber?.trim().toUpperCase(),
    designName: input.designName?.trim(),
    collectionName: input.collectionName?.trim(),
    collectionYear: input.collectionYear,
  })
  const mergedState = { ...state, known }
  const missing: string[] = []
  const blockers: string[] = []

  const jewelryFrontPhoto = mergedState.photos.find(
    (photo) =>
      photo.declaredRole === 'jewelry_front' && photo.quality !== 'blocked',
  )
  const blockedLabel = mergedState.photos.find(
    (photo) =>
      photo.declaredRole === 'label_details' && photo.quality === 'blocked',
  )
  const blockedJewelry = mergedState.photos.find(
    (photo) =>
      photo.declaredRole === 'jewelry_front' && photo.quality === 'blocked',
  )

  if (!known.itemNumber) missing.push('itemNumber')
  if (!jewelryFrontPhoto) missing.push('jewelryFrontPhoto')
  if (blockedLabel) blockers.push('labelPhotoUnreadable')
  if (blockedJewelry) blockers.push('jewelryPhotoUnusable')

  const ready = missing.length === 0 && blockers.length === 0
  return {
    ready,
    missing,
    blockers,
    nextAction: chooseNextAction({ ready, missing, blockers }),
  }
}
```

Reason for this split:

```text
computeTradeBoardIntakeReadiness: decides whether the workflow state is complete.
computeTradeBoardAddAttemptReadiness: decides whether a tool attempt is safe to try, then lets addListing/resolveItemNumber perform final catalog validation.
```

- [ ] **Step 4: Run the controller tests**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac/trade-board-intake-controller.test.ts
```

Expected:

```text
PASS tests/nic-nac/trade-board-intake-controller.test.ts
```

---

### Task 4: Make add_listing Use Add-Attempt Readiness

**Files:**
- Modify: `C:\Users\louis\sparkle-suite-repo\lib\nic-nac\tools\add-listing.ts`
- Modify: `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\add-listing-recovery.test.ts`

- [ ] **Step 1: Add failing stale-workflow regression**

Append this test inside `describe('add_listing - active workflow readiness guard', () => { ... })`:

```ts
it('does not let stale workflow catalog fields veto a valid ER13229 add attempt with a confirmed jewelry photo', async () => {
  resolveItemNumberMock.mockResolvedValueOnce({
    found: true,
    designId: 'design-existing',
    itemNumber: 'ER13229',
    designName: 'The Florence Earrings',
  })
  processRepListingPhotoUrlMock.mockResolvedValueOnce({
    photoUrl: 'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
  })
  addListingMock.mockResolvedValueOnce({
    listingId: 'listing-1',
    designId: 'design-existing',
    itemNumber: 'ER13229',
    designName: 'The Florence Earrings',
    status: 'available',
    usesCanonicalPhoto: false,
  })

  const tool = makeTool(makeConversationLookupMock([]), {
    activeTradeBoardWorkflow: activeWorkflow({
      phase: 'details_capture',
      known: {
        collectionName: 'ection',
      },
      missing: ['itemNumber', 'designName'],
      photos: [
        {
          attachmentIndex: 1,
          declaredRole: 'label_details',
          visualRole: 'label_or_packaging',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,TEFCRUw=',
          quality: 'unknown',
          qualityIssues: [],
          notes: ['declared as label/details source'],
        },
        {
          attachmentIndex: 1,
          declaredRole: 'jewelry_front',
          visualRole: 'jewelry',
          roleConfirmed: true,
          imageUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
          quality: 'unknown',
          qualityIssues: [],
          notes: ['declared as customer-facing jewelry photo'],
        },
      ],
    }),
  })

  await expect(
    tool.execute({
      mode: 'single',
      itemNumber: 'ER13229',
      collectionName: 'July Birthday',
      collectionYear: 2026,
      piecePhotoIndex: 2,
    }),
  ).resolves.toMatchObject({
    mode: 'single',
    listingId: 'listing-1',
    designId: 'design-existing',
    itemNumber: 'ER13229',
  })

  expect(addListingMock).toHaveBeenCalledWith(
    {},
    'rep-1',
    expect.objectContaining({
      itemNumber: 'ER13229',
      collectionName: 'July Birthday',
      listingPhotoUrl: 'https://cdn.example.com/listings/rep-1/florence-boxed-display.png',
    }),
  )
})
```

- [ ] **Step 2: Run the add-listing tests and verify the new test fails**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac/add-listing-recovery.test.ts
```

Expected:

```text
FAIL WORKFLOW_NOT_READY
```

- [ ] **Step 3: Update add_listing guard**

In `lib/nic-nac/tools/add-listing.ts`, replace the controller import:

```ts
computeTradeBoardIntakeReadiness,
```

with:

```ts
computeTradeBoardAddAttemptReadiness,
```

Replace the active workflow guard:

```ts
const activeWorkflow = ctx.activeTradeBoardWorkflow
if (activeWorkflow?.status === 'active') {
  const readiness = computeTradeBoardIntakeReadiness(activeWorkflow)
  if (!readiness.ready) {
    const needsJewelryPhoto = readiness.missing.includes('jewelryFrontPhoto')
    throw new NicNacToolError({
      code: 'WORKFLOW_NOT_READY',
      userMessage: needsJewelryPhoto
        ? 'I still need the customer-facing jewelry photo before I can save this listing.'
        : 'I still need one more required detail before I can save this listing.',
    })
  }
}
```

with:

```ts
const activeWorkflow = ctx.activeTradeBoardWorkflow
if (activeWorkflow?.status === 'active') {
  const readiness = computeTradeBoardAddAttemptReadiness(activeWorkflow, {
    itemNumber,
    designName: input.designName,
    collectionName: input.collectionName,
    collectionYear: input.collectionYear,
  })
  if (!readiness.ready) {
    const needsJewelryPhoto = readiness.missing.includes('jewelryFrontPhoto')
    const missing = readiness.missing.join(', ')
    throw new NicNacToolError({
      code: 'WORKFLOW_NOT_READY',
      userMessage: needsJewelryPhoto
        ? 'I still need the customer-facing jewelry photo before I can save this listing.'
        : `I still need these details before I can save this listing: ${missing}.`,
    })
  }
}
```

This keeps the photo safety gate but allows service-level catalog validation to do its job.

- [ ] **Step 4: Run the add-listing tests**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac/add-listing-recovery.test.ts
```

Expected:

```text
PASS tests/nic-nac/add-listing-recovery.test.ts
```

- [ ] **Step 5: Commit the add-attempt readiness fix**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
git add lib/nic-nac/workflows/trade-board-intake-controller.ts lib/nic-nac/tools/add-listing.ts tests/nic-nac/trade-board-intake-controller.test.ts tests/nic-nac/add-listing-recovery.test.ts
git commit -m "fix: allow valid add listing attempts from current input"
```

---

### Task 5: Add Live-Sequence Regression Coverage

**Files:**
- Create: `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\fixtures\trade-board-er13229-sequence.ts`
- Create: `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\trade-board-intake-live-sequence.test.ts`

- [ ] **Step 1: Create the fixture**

Create `tests/nic-nac/fixtures/trade-board-er13229-sequence.ts`:

```ts
export const ER13229_LIVE_SEQUENCE = {
  itemNumber: 'ER13229',
  designName: 'The Florence Earrings',
  collectionName: 'July Birthday',
  collectionYear: 2026,
  labelPhotoUrl: 'data:image/jpeg;base64,TEFCRUw=',
  jewelryPhotoUrl: 'data:image/jpeg;base64,SkVXRUxSWQ==',
  confirmationText: 'That is correct. This is the July Birthday collection, 2026.',
  hardFailPhrases: [
    "I can't actually add listings",
    'Log into your workspace and add it manually',
    'The photo of the earrings needs',
    'Unboxed',
    'Plain background',
    'Packaging is too prominent',
    'backend',
    'incomplete data on file',
    'report this to Louis',
  ],
}
```

- [ ] **Step 2: Create the deterministic live-sequence test**

Create `tests/nic-nac/trade-board-intake-live-sequence.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ER13229_LIVE_SEQUENCE } from './fixtures/trade-board-er13229-sequence'

describe('ER13229 Trade Board live sequence fixture', () => {
  it('documents the required real-rep turn order and hard-fail phrases', () => {
    expect(ER13229_LIVE_SEQUENCE).toMatchObject({
      itemNumber: 'ER13229',
      designName: 'The Florence Earrings',
      collectionName: 'July Birthday',
      collectionYear: 2026,
    })
    expect(ER13229_LIVE_SEQUENCE.confirmationText).toContain('July Birthday collection, 2026')
    expect(ER13229_LIVE_SEQUENCE.hardFailPhrases).toContain('report this to Louis')
  })
})
```

This fixture is intentionally simple in this task. It gives later API/UI smoke code one canonical source for turn order and hard-fail text.

- [ ] **Step 3: Run the fixture test**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac/trade-board-intake-live-sequence.test.ts
```

Expected:

```text
PASS tests/nic-nac/trade-board-intake-live-sequence.test.ts
```

- [ ] **Step 4: Commit the fixture**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
git add tests/nic-nac/fixtures/trade-board-er13229-sequence.ts tests/nic-nac/trade-board-intake-live-sequence.test.ts
git commit -m "test: capture ER13229 live intake sequence"
```

---

### Task 6: Run Focused And Full Local Verification

**Files:**
- Read-only verification of changed code.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac/trade-board-intake-route-context.test.ts tests/nic-nac/trade-board-intake-controller.test.ts tests/nic-nac/add-listing-recovery.test.ts tests/nic-nac/trade-board-intake-live-sequence.test.ts
```

Expected:

```text
PASS 4 test files
```

- [ ] **Step 2: Run Nic-Nac test suite**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm exec vitest run tests/nic-nac
```

Expected:

```text
PASS tests/nic-nac
```

- [ ] **Step 3: Run production build**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npm run build
```

Expected:

```text
Compiled successfully
```

---

### Task 7: Model-In-Loop Replay Before Claiming Fixed

**Files:**
- Use existing Sparkle Suite smoke tooling.
- Use fixture details from `C:\Users\louis\sparkle-suite-repo\tests\nic-nac\fixtures\trade-board-er13229-sequence.ts`.
- Use preferred local asset folder `C:\Users\louis\sparkle-suite-smoke-assets` when available.

- [ ] **Step 1: Confirm smoke assets exist**

Run:

```powershell
Test-Path C:\Users\louis\sparkle-suite-smoke-assets\ER13229-label.jpg
Test-Path C:\Users\louis\sparkle-suite-smoke-assets\ER13229-jewelry-boxed-front.jpg
```

Expected:

```text
True
True
```

- [ ] **Step 2: Run a real Nic-Nac replay through the API or UI**

Use the `sparkle-suite-demo-smoke` skill. The replay must send this exact turn order:

```text
1. Add a piece to Trade Board
2. Upload ER13229-label.jpg as a file-only turn
3. Wait for Nic-Nac to find ER13229 and ask for the customer-facing jewelry photo
4. Upload ER13229-jewelry-boxed-front.jpg as a file-only turn
5. If Nic-Nac asks to confirm collection, send: That is correct. This is the July Birthday collection, 2026.
6. Expect add_listing to succeed
```

Required assertions:

```text
conversation id captured
run ids captured
active tools include trade_board and catalog
search_jewelry_database called
add_listing called after jewelry photo and collection truth exist
final assistant text does not contain hard-fail phrases
trade_listings has a completed ER13229 listing for the synthetic/reviewer rep
workflow status is completed
created_listing_ids includes the new listing id
```

- [ ] **Step 3: Repeat the replay three consecutive times**

Expected:

```text
3 consecutive passes
0 hard-fail phrases
0 manual workaround language
0 missing tool routes
0 label_details photos satisfying jewelry_front
```

---

### Task 8: Deploy To Stable Demo Alias

**Files:**
- Deployment only after Tasks 1-7 pass.

- [ ] **Step 1: Push branch**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
git push
```

Expected:

```text
branch pushed
```

- [ ] **Step 2: Deploy preview and assign stable demo alias**

Run:

```powershell
cd C:\Users\louis\sparkle-suite-repo
npx vercel --prod
```

Expected:

```text
production deployment created
```

Confirm the stable review target:

```text
https://sparkle-suite-demo.vercel.app/
```

points to the intended deployment before telling Louis it is ready.

- [ ] **Step 3: Run deployed smoke once**

Use `sparkle-suite-demo-smoke` against:

```text
https://sparkle-suite-demo.vercel.app/
```

Expected:

```text
ER13229 add-listing sequence passes through the deployed demo link
database assertions pass
hard-fail phrase count is 0
```

---

### Task 9: Log The Lesson

**Files:**
- Modify: `C:\Users\louis\sparkle-suite\vault\session-log.md`
- Modify: `C:\Users\louis\sparkle-suite\vault\open-items.md` if smoke assets or replay tooling remain incomplete.

- [ ] **Step 1: Add a session-log entry**

Append:

```md
## 2026-06-16 - Nic-Nac ER13229 workflow truth hardening

- Root cause: Trade Board workflow state did not ingest catalog truth from `search_jewelry_database`, the collection parser captured `ection` from `collection`, and `add_listing` let stale workflow readiness veto current valid tool input.
- Fix shape: known-field extraction moved into a focused helper, catalog tool results merge into workflow truth, collection confirmation parsing handles trailing "July Birthday collection, 2026", and add-listing uses add-attempt readiness that protects photo roles while letting the service validate catalog/listing truth.
- Verification required before calling fixed: focused Vitest coverage, full `tests/nic-nac`, build, three model-in-loop ER13229 replays, deployed demo smoke, database assertions, and zero hard-fail phrases.
```

- [ ] **Step 2: Commit binder lesson**

Run:

```powershell
cd C:\Users\louis\sparkle-suite
git add vault/session-log.md vault/open-items.md docs/superpowers/plans/2026-06-16-nic-nac-trade-board-state-sync-hardening.md
git commit -m "docs: plan Nic-Nac trade board state sync hardening"
```

---

## Self-Review

Spec coverage:

```text
Workflow truth: Tasks 1-4
Photo role invariants: Tasks 3-4 and existing route/controller tests
Tool retention: existing tests plus Task 7 replay assertions
Hard-fail phrases: Tasks 5 and 7
Model-in-loop replay: Task 7
Database assertion before fixed claim: Task 7
Stable demo review: Task 8
Lesson capture: Task 9
```

Implementation risk:

```text
The main risk is UIMessage tool-part shape variation. Task 1 uses the observed AI SDK style `tool-search_jewelry_database` with `state: output-available`. If live stored messages use a second shape, add an extractor branch in `extractKnownFieldsFromCatalogToolOutputs` and cover it with another exact test.
```

Exit criteria:

```text
Do not tell Louis this is fixed until deterministic tests pass, build passes, three model-in-loop ER13229 replays pass, deployed demo smoke passes, and the resulting transcript/database state show a completed listing with zero hard-fail phrases.
```
