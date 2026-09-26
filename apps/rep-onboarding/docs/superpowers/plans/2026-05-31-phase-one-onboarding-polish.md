# Phase One Onboarding Polish Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Historical terminology note (September 4, 2026): the product name is **Team Management**. Older “Manage My Team” wording below describes the same feature and is retained only as historical plan context.

**Goal:** Improve the Britt with Bling new-rep onboarding demo with the approved Phase 1 polish and onboarding flow upgrades, while leaving Sparkle Suite question inbox integration for Phase 2.

**Architecture:** Keep the app as a data-driven Vite/React prototype. Improve the rep-facing experience through focused component/state/CSS changes in the existing files, with no backend, authentication, export workflow, or Sparkle Suite sync in Phase 1.

**Tech Stack:** Vite, React, TypeScript, localStorage, plain CSS, Vercel deployment.

---

## Phase Boundary

### In Scope For Phase 1

- Fix mobile sticky header and anchor-scroll behavior.
- Close or tame Nic-Nac during navigation.
- Improve mobile header order and narrow-screen button wrapping.
- Update browser document title.
- Improve Resource Binder organization with filters/categories.
- Add a stronger "today's next step" feel.
- Add a better stuck/help path that remains local demo state.
- Improve accessibility labels for path cards and icon-like controls.
- Verify desktop and mobile rendered behavior.

### Explicitly Out Of Scope For Phase 1

- Real Sparkle Suite `Manage My Team` question inbox.
- Real rep identity/authentication.
- Cross-site sync between this onboarding site and Sparkle Suite.
- Admin answer/status workflows.
- Copy/export/email workaround for saved questions.
- Any permanent question delivery mechanism.

Phase 2 should build the question pipeline between this onboarding site and Sparkle Suite so new-rep questions land in Brittany's `Manage My Team` workspace.

---

## File Structure

- Modify `C:\Users\louis\britt-with-bling-start-strong\index.html`
  - Update the browser title so it matches the current header branding.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\App.tsx`
  - Add navigation handlers that close Nic-Nac-related UI state where needed.
  - Pass any new reset/navigation props into child components.
  - Keep saved questions local and demo-only.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\components\Dashboard.tsx`
  - Add a stronger "Do this next" surface.
  - Add accessible labels for path cards.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\components\NicNac.tsx`
  - Support closing from parent navigation/reset.
  - Improve quick question layout behavior.
  - Keep responses canned and local.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\components\Resources.tsx`
  - Add category/filter controls.
  - Keep search and favorites.
  - Make the resource count reflect filtered/search results clearly.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\components\StepDetail.tsx`
  - Improve stuck/help actions without changing final question destination.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\data.ts`
  - Add resource categories or derive categories from resource IDs/source types.
  - Add any plain-English microcopy needed for the stronger next-step and stuck flow.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\types.ts`
  - Add minimal types for resource categories if needed.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\state.ts`
  - Reset any new local demo state only if it belongs to app progress/questions.
  - Do not add real backend sync.
- Modify `C:\Users\louis\britt-with-bling-start-strong\src\styles.css`
  - Mobile header order and spacing.
  - Anchor scroll margins.
  - Nic-Nac mobile panel behavior.
  - Binder filter controls.
  - "Do this next" visual treatment.

---

### Task 1: Browser Title And Navigation Polish

**Files:**
- Modify: `C:\Users\louis\britt-with-bling-start-strong\index.html`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\App.tsx`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\styles.css`

- [ ] **Step 1: Update the document title**

Change:

```html
<title>Britt with Bling. Strong Start.</title>
```

To:

```html
<title>Britt with Bling New Rep Path</title>
```

- [ ] **Step 2: Add navigation close behavior for Nic-Nac**

In `src\App.tsx`, add a simple navigation handler that can be passed to the nav links. If `NicNac` needs parent control, introduce a numeric `closeSignal` prop rather than storing all Nic-Nac messages in `App`.

Expected shape:

```tsx
const [nicNacCloseSignal, setNicNacCloseSignal] = useState(0);

function handleSectionNav() {
  setNicNacCloseSignal((value) => value + 1);
}
```

Update nav links:

```tsx
<a href="#resources" onClick={handleSectionNav}>Resources</a>
<a href="#questions" onClick={handleSectionNav}>Ask Brittany</a>
```

Pass to `NicNac`:

```tsx
<NicNac
  selectedStepId={appState.selectedStepId}
  prompt={nicNacPrompt}
  closeSignal={nicNacCloseSignal}
  onPromptHandled={() => setNicNacPrompt(null)}
  onEscalate={addNicNacQuestion}
/>
```

- [ ] **Step 3: Update `NicNacProps` and close on signal**

In `src\components\NicNac.tsx`, extend props:

```tsx
type NicNacProps = {
  selectedStepId: string;
  prompt: string | null;
  closeSignal: number;
  onPromptHandled: () => void;
  onEscalate: (question: RepQuestion) => void;
};
```

Update function signature:

```tsx
export function NicNac({ selectedStepId, prompt, closeSignal, onPromptHandled, onEscalate }: NicNacProps) {
```

Add effect:

```tsx
useEffect(() => {
  setIsOpen(false);
}, [closeSignal]);
```

- [ ] **Step 4: Fix mobile anchor scroll margin**

In `src\styles.css`, add this inside the mobile media query:

```css
  #home,
  #resources,
  #questions {
    scroll-margin-top: 190px;
  }
```

- [ ] **Step 5: Run verification**

Run:

```powershell
npx tsc --noEmit --pretty false
npm run build
```

Expected: both pass.

- [ ] **Step 6: Browser smoke check**

In the browser:

- Open the live or local site.
- Open Nic-Nac.
- Click `Resources`.
- Confirm Nic-Nac closes.
- Confirm `Resource binder` heading is not hidden under the sticky header on mobile.

---

### Task 2: Mobile Header Layout And Nic-Nac Fit

**Files:**
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\styles.css`

- [ ] **Step 1: Reorder mobile header**

Inside `@media (max-width: 760px)`, set the mobile grid order so the brand comes first, actions second, nav third:

```css
  .brand-home-link {
    grid-column: 1 / -1;
    grid-row: 1;
  }

  .topbar > .nic-nac {
    grid-column: 1;
    grid-row: 2;
    justify-self: stretch;
    width: auto;
  }

  .topbar .reset-button {
    grid-column: 2;
    grid-row: 2;
    justify-self: stretch;
  }

  .topbar nav {
    grid-column: 1 / -1;
    grid-row: 3;
    justify-self: start;
    margin-left: 0;
    margin-right: 0;
    flex-wrap: wrap;
    gap: 14px;
  }
```

- [ ] **Step 2: Prevent Nic-Nac text wrapping on narrow screens**

Add:

```css
  .topbar .nic-button,
  .topbar .reset-button {
    white-space: nowrap;
    padding-inline: 12px;
  }
```

For very narrow widths, add:

```css
@media (max-width: 360px) {
  .topbar {
    padding: 16px;
  }

  .topbar .nic-button,
  .topbar .reset-button {
    font-size: 13px;
  }
}
```

- [ ] **Step 3: Improve mobile Nic-Nac panel behavior**

Keep the panel inside the viewport and reduce height pressure:

```css
  .nic-panel {
    left: 0;
    right: 0;
    top: calc(100% + 10px);
    width: min(336px, calc(100vw - 64px));
    max-height: calc(100vh - 190px);
    display: flex;
    flex-direction: column;
  }

  .nic-messages {
    min-height: 120px;
    max-height: 240px;
  }
```

- [ ] **Step 4: Browser check at 390px and 320px**

Verify:

- Header brand appears first.
- `Nic-Nac` does not wrap.
- No horizontal overflow.
- Nic-Nac panel stays usable.

---

### Task 3: Stronger "Do This Next" Onboarding Surface

**Files:**
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\components\Dashboard.tsx`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\styles.css`

- [ ] **Step 1: Add a next-step focus block**

In `Dashboard.tsx`, below the hero card and above `Your path to getting started.`, add:

```tsx
      <section className="next-step-focus" aria-label="Recommended next step">
        <div>
          <span className="eyebrow">Do this next</span>
          <h2>{nextStep.title}</h2>
          <p>{nextStep.whatToDo}</p>
        </div>
        <button className="primary-button" onClick={() => onSelectStep(nextStep.id)}>
          Open this step
        </button>
      </section>
```

- [ ] **Step 2: Style the focus block**

Add:

```css
.next-step-focus {
  margin-top: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  border: 1px solid rgba(212, 175, 55, 0.28);
  border-radius: var(--ss-radius);
  padding: 22px;
  background: rgba(255, 248, 243, 0.86);
  box-shadow: var(--ss-shadow);
}

.next-step-focus h2 {
  margin: 0;
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 500;
}

.next-step-focus p {
  margin: 8px 0 0;
  color: var(--ss-muted);
  line-height: 1.5;
}
```

In mobile media query:

```css
  .next-step-focus {
    grid-template-columns: 1fr;
  }

  .next-step-focus .primary-button {
    width: 100%;
  }
```

- [ ] **Step 3: Verify the flow**

Expected:

- New reps see one clear next task before scanning all cards.
- `Open this step` selects the same step as `Continue next step`.
- Progress updates still work.

---

### Task 4: Better Local "I'm Stuck" Flow

**Files:**
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\components\StepDetail.tsx`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\styles.css`

- [ ] **Step 1: Rename the step help action**

Change the visible text:

```tsx
I need help
```

To:

```tsx
I'm stuck
```

Keep the saved question behavior unchanged:

```tsx
onClick={() => onNeedHelp(step.id, `I need help with: ${step.title}`)}
```

- [ ] **Step 2: Add plain helper text near the actions**

Before `.step-actions`, add:

```tsx
      <p className="stuck-helper">
        If this step does not make sense, save it for Brittany. This demo keeps it here until the Sparkle Suite team inbox is built.
      </p>
```

- [ ] **Step 3: Style helper text**

Add:

```css
.stuck-helper {
  margin: 18px 0 0;
  color: var(--ss-muted);
  font-size: 13px;
  line-height: 1.45;
}
```

- [ ] **Step 4: Verify behavior**

Expected:

- Button says `I'm stuck`.
- Clicking it adds a saved question.
- Saved question list still reads as demo/local state.
- No export or Sparkle Suite sync is added in this phase.

---

### Task 5: Resource Binder Categories

**Files:**
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\types.ts`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\data.ts`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\components\Resources.tsx`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\styles.css`

- [ ] **Step 1: Add resource category type**

In `src\types.ts`, add:

```ts
export type ResourceCategory = 'Start Here' | 'BPU' | 'Money' | 'Supplies' | 'Shipping' | 'Loyalty' | 'Sparkle Suite';
```

Update `Resource`:

```ts
category: ResourceCategory;
```

- [ ] **Step 2: Add categories to every resource**

Use this mapping in `src\data.ts`:

```ts
team-facebook-intro: 'Start Here'
team-social-growth: 'Start Here'
bp-enrollment-guide: 'Start Here'
bpu-enrollment-guide: 'BPU'
payquicker-setup: 'Money'
team-payout-notes: 'Money'
bp-income-disclosure: 'Money'
ftc-mlm-guidance: 'Money'
amazon-supply-list: 'Supplies'
setup-lighting-note: 'Supplies'
shipcom-setup-note: 'Shipping'
shipping-video-placeholder: 'Shipping'
bp-shipping-policy: 'Shipping'
bp-return-policy: 'Shipping'
loyalty-program-example: 'Loyalty'
sparkle-suite-preview: 'Sparkle Suite'
```

- [ ] **Step 3: Add filter state**

In `Resources.tsx`, add:

```tsx
const resourceCategories = ['All', 'Start Here', 'BPU', 'Money', 'Supplies', 'Shipping', 'Loyalty', 'Sparkle Suite'] as const;
type ResourceFilter = typeof resourceCategories[number];
const [activeCategory, setActiveCategory] = useState<ResourceFilter>('All');
```

Update filtering:

```tsx
.filter(({ resource }) => activeCategory === 'All' || resource.category === activeCategory)
.filter(({ resource }) => !query || getSearchText(resource).includes(query))
```

Add `activeCategory` to `useMemo` dependencies.

- [ ] **Step 4: Render filter chips**

Above the search input, add:

```tsx
      <div className="binder-filters" aria-label="Resource filters">
        {resourceCategories.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? 'active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
```

- [ ] **Step 5: Style filters**

Add:

```css
.binder-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}

.binder-filters button {
  min-height: 36px;
  border: 1px solid var(--ss-border);
  border-radius: var(--ss-pill);
  padding: 0 12px;
  color: var(--ss-muted);
  background: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.binder-filters button.active {
  border-color: rgba(212, 175, 55, 0.48);
  color: #0a0a0a;
  background: linear-gradient(90deg, #d4af37 0%, #f4c2c2 100%);
}
```

- [ ] **Step 6: Verify filters**

Expected:

- `All` shows 16 resources.
- `BPU` shows `Bomb Party University Access Guide`.
- `Supplies` shows Amazon list and setup/lighting.
- Search works inside the selected category.
- Favorites still pin to the top inside the filtered results.

---

### Task 6: Accessibility And Copy Polish

**Files:**
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\components\Dashboard.tsx`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\components\Resources.tsx`
- Modify: `C:\Users\louis\britt-with-bling-start-strong\src\styles.css`

- [ ] **Step 1: Add path card aria labels**

In `Dashboard.tsx`, compute a clear label inside the group map:

```tsx
const cardLabel = `${group}. ${doneCount} of ${groupSteps.length} done.${helpCount > 0 ? ` ${helpCount} step needs help.` : ''}`;
```

Add it to the button:

```tsx
aria-label={cardLabel}
```

- [ ] **Step 2: Add filter focus visible support**

Extend the existing focus-visible selector:

```css
.binder-filters button:focus-visible,
```

- [ ] **Step 3: Review visible copy for Phase 2 clarity**

Keep saved questions local, but add one subtle note in `Questions.tsx` only if it does not overpromise:

```tsx
<p>For this demo, questions stay here. Later, this area will connect to Brittany's Sparkle Suite team workspace.</p>
```

Do not add export, send, sync, email, or admin wording.

- [ ] **Step 4: Verify accessibility text**

Use browser DOM snapshot or accessibility labels to confirm path cards are no longer read as run-together text.

---

### Task 7: Full Verification And Deploy

**Files:**
- No source edits unless verification finds issues.

- [ ] **Step 1: Run static checks**

Run:

```powershell
npx tsc --noEmit --pretty false
npm run build
```

Expected: both pass.

- [ ] **Step 2: Desktop smoke test**

Viewport: `1280x900`

Verify:

- Page loads with title `Britt with Bling New Rep Path`.
- Header brand is first.
- Nic-Nac opens and closes.
- `Resources` nav closes Nic-Nac and scrolls correctly.
- `Do this next` block selects the correct next step.
- `I'm stuck` creates a saved question.
- Resource filters and search work together.
- No console warnings/errors.

- [ ] **Step 3: Mobile smoke test**

Viewports: `390x844` and `320x740`

Verify:

- No horizontal overflow.
- Brand appears first in header.
- Nic-Nac text does not wrap.
- Nic-Nac panel fits and is usable.
- Anchor headings are not hidden under the sticky header.
- Resource filters wrap cleanly.

- [ ] **Step 4: Deploy**

Run:

```powershell
npm exec --yes vercel -- deploy --prod --yes
```

Expected:

- Vercel deploy succeeds.
- Alias updates: `https://britt-with-bling-start-strong.vercel.app/`

- [ ] **Step 5: Live verification**

Fetch the live site and confirm the new bundle is served. In browser, repeat a quick smoke check on the live URL.

---

## Phase 2 Planning Notes

When Sparkle Suite work begins, design the shared question pipeline around:

- Rep identity.
- Team lead identity.
- Training site ID or team ID.
- Step ID and step title.
- Question text.
- Source: rep button or Nic-Nac escalation.
- Status: open, answered, archived.
- Brittany/team lead response.
- Created/updated timestamps.

The target destination should be Sparkle Suite:

`Manage My Team` -> `New Rep Questions` or `Training Questions`

The onboarding site should stay the rep-facing intake surface. Sparkle Suite should be the team-lead workspace.
