# Mobile App Preview Alignment Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realign the signed-in Sparkle Finder web app with the July 3 A/B/C mobile app preview: A opens the app, B is the collection layer, and C is the guided find flow, while preserving all existing Sparkle Finder functionality.

**Architecture:** Keep the current Next.js routes, Supabase-backed data model, Nic-Nac plumbing, collection persistence, route guards, and smoke coverage. Change the signed-in UI hierarchy so customers see a simple Amethyst-skinned app home first, then flow into collection and guided find surfaces instead of seeing dense panels or legacy dashboard framing.

**Tech Stack:** Next.js App Router, React Server Components, TypeScript, Tailwind classes, CSS custom properties in `app/globals.css`, Vitest route/render tests, Playwright smoke tests, Vercel deployment.

---

## Reference Lock

Use this local preview as the visual/product reference:

```text
C:\Users\louis\sparkle-finder-repo\.superpowers\brainstorm\manual-20260703093620\content\homepage-overhaul-options.html
```

The browser preview served from `http://localhost:62166/` showed:

- `A. Simple Home Dashboard` as the opening app screen.
- `B. Collection First` as the collection layer customers flow into.
- `C. Guided Find Flow` behind the primary `Find a Piece` action.

Do not use the old May 29 locked homepage concept as the redesign target. That older image is scrapped for this pass.

## Capability Placement Map

Keep these capabilities, but place them behind simple customer goals:

| Capability | Where It Lives In The New UI |
| --- | --- |
| Library search | `Find` tab and `Browse Library` action |
| Owned collection | `Collection` tab and B layer |
| Wishlist | A next-step card, B wishlist rail, C wishlist option |
| Diamonds and Unicorns | B collection stats and C optional browse path |
| Found by Sparkle Finder | B collection stats |
| Bling Vault lazy mosaic | B collection layer |
| Hero Piece | B collection layer |
| Nic-Nac help | C guided find flow and library/item contexts |
| Live shows | C "More ways to look" path |
| Rep boards | C "More ways to look" path and item detail leads |
| Reps directory | Top-level `Reps` tab |
| Favorite reps | Reps page and C contextual link |
| Collectors/showcase discovery | C contextual link |
| Missing-piece/showcase studio | C photo/label path |
| Photo setup guide | C photo/label path |
| Account/profile/billing | `Me` tab/account route |
| Legal/auth routes | unchanged |

Primary mobile tabs should be:

```text
Home | Find | Collection | Reps | Me
```

The Library stays reachable, but it should not compete as a top-level app tab if `Find` is the customer goal.

---

## File Map

Modify:

- `components/layout/SparkleFinderNav.tsx` - change app nav to `Home`, `Find`, `Collection`, `Reps`, `Me`; keep desktop and mobile route behavior consistent.
- `components/home/SimpleFinderHome.tsx` - make A match the preview: one clean card, one headline, one sentence, one primary action, two secondary actions, and one small next-step card. Move dense stats/profile out of A.
- `components/home/HomepageBlingVault.tsx` - make this section the B collection layer, including the compact stats and account/profile cue if needed.
- `components/home/HeroPieceSpotlight.tsx` - ensure Hero Piece feels like part of "My Collection" rather than a management widget.
- `components/home/WishlistRail.tsx` - keep wishlist simple and customer-goal oriented.
- `components/home/BlingVaultMosaic.tsx` - preserve lazy loading and tile batch limits while tightening copy.
- `components/home/FindPiecePanel.tsx` - make C a guided flow with simple choices first and contextual advanced links second.
- `components/home/BlingVaultTile.tsx` - adjust only if needed for Amethyst polish or text fit.
- `app/globals.css` - tune Amethyst app shell tokens, bottom nav, card surfaces, Nic-Nac compact form, and responsive spacing.
- `tests/sparkle-finder/routes.test.ts` - update signed-in homepage contract and capability-preservation assertions.
- `tests/smoke/sparkle-finder-home.spec.ts` - update authenticated mobile smoke checks and visual-overlap checks.
- `vault/session-log.md`, `vault/decisions.md`, and `vault/open-items.md` - update only after verification.

Do not modify unless a test exposes a real integration bug:

- Supabase migrations.
- Nic-Nac API routes, model policy, memory, telemetry, or tools.
- Collection persistence/save actions.
- Auth architecture.
- Billing/Stripe behavior.
- Guardrail copy rules.

---

### Task 1: Lock The Correct A/B/C Contract In Tests

**Files:**

- Modify: `tests/sparkle-finder/routes.test.ts`
- Modify: `tests/smoke/sparkle-finder-home.spec.ts`

- [ ] **Step 1: Update signed-in nav route assertions**

In `tests/sparkle-finder/routes.test.ts`, update the signed-in nav expectations so the nav markup contains:

```ts
expect(navMarkup).toContain('href="/"');
expect(navMarkup).toContain(">Home<");
expect(navMarkup).toContain('href="/#find-a-piece"');
expect(navMarkup).toContain(">Find<");
expect(navMarkup).toContain('href="/#bling-vault"');
expect(navMarkup).toContain(">Collection<");
expect(navMarkup).toContain('href="/reps"');
expect(navMarkup).toContain(">Reps<");
expect(navMarkup).toContain('href="/account"');
expect(navMarkup).toContain(">Me<");
expect(navMarkup).not.toContain('href="/library"');
expect(navMarkup).not.toContain('href="/live-shows"');
expect(navMarkup).not.toContain('href="/rep-boards"');
expect(navMarkup).not.toContain('href="/favorites"');
expect(navMarkup).not.toContain('href="/collectors"');
expect(navMarkup).not.toContain('href="/shop"');
```

- [ ] **Step 2: Update authenticated homepage route assertions**

In the test that renders the main homepage for signed-in customers, assert the A/B/C structure in order:

```ts
const simpleHomeIndex = markup.indexOf('data-smoke="simple-finder-home"');
const findIndex = markup.indexOf('data-smoke="find-piece-panel"');
const collectionIndex = markup.indexOf('data-smoke="homepage-bling-vault"');

expect(simpleHomeIndex).toBeGreaterThan(-1);
expect(findIndex).toBeGreaterThan(simpleHomeIndex);
expect(collectionIndex).toBeGreaterThan(findIndex);
expect(markup).toContain("Find the pieces you love.");
expect(markup).toContain("Build your collection with Sparkle Finder.");
expect(markup).toContain("Find a Piece");
expect(markup).toContain("My Collection");
expect(markup).toContain("Browse Library");
expect(markup).toContain("Wishlist check");
expect(markup).toContain("Build your collection.");
expect(markup).toContain("Hero Piece");
expect(markup).toContain("Bling Vault");
expect(markup).not.toContain("Nic-Nac Home");
expect(markup).not.toContain("Command Center");
expect(markup).not.toContain("Today across Sparkle Suite");
```

- [ ] **Step 3: Assert A stays light**

Extract the A section and ensure it does not carry the dense profile/stat grid:

```ts
const simpleHomeMarkup = markup.slice(simpleHomeIndex, findIndex);

expect(simpleHomeMarkup).toContain("Find a Piece");
expect(simpleHomeMarkup).toContain("My Collection");
expect(simpleHomeMarkup).toContain("Browse Library");
expect(simpleHomeMarkup).toContain("Wishlist check");
expect(simpleHomeMarkup).not.toContain("Found by Sparkle Finder");
expect(simpleHomeMarkup).not.toContain("Diamonds");
expect(simpleHomeMarkup).not.toContain("Unicorns");
expect(simpleHomeMarkup).not.toContain("Account");
```

- [ ] **Step 4: Assert B preserves collection motivation stats**

Extract the B section and assert the motivating stats remain there:

```ts
const collectionMarkup = markup.slice(collectionIndex);

expect(collectionMarkup).toContain("Owned");
expect(collectionMarkup).toContain("Wishlist");
expect(collectionMarkup).toContain("Diamonds");
expect(collectionMarkup).toContain("Unicorns");
expect(collectionMarkup).toContain("Found by Sparkle Finder");
expect(collectionMarkup).not.toContain(">Saved<");
expect(collectionMarkup).not.toContain("Featured");
```

- [ ] **Step 5: Assert C preserves all advanced paths contextually**

Extract the C section and assert all current capabilities remain reachable:

```ts
const findMarkup = markup.slice(findIndex, collectionIndex);

expect(findMarkup).toContain('href="/library"');
expect(findMarkup).toContain("I know the name");
expect(findMarkup).toContain("I know the collection");
expect(findMarkup).toContain("I have a photo or label");
expect(findMarkup).toContain("Check my Wishlist");
expect(findMarkup).toContain("Ask Nic-Nac for Help");
expect(findMarkup).toContain('href="/photo-setup"');
expect(findMarkup).toContain('href="/silver#showcase-studio"');
expect(findMarkup).toContain('href="/live-shows"');
expect(findMarkup).toContain('href="/rep-boards"');
expect(findMarkup).toContain('href="/favorites"');
expect(findMarkup).toContain('href="/collectors"');
expect(findMarkup).toContain('href="/reps"');
expect(findMarkup).not.toContain('href="/shop"');
```

- [ ] **Step 6: Update authenticated Playwright smoke**

In `tests/smoke/sparkle-finder-home.spec.ts`, update the authenticated homepage smoke to check:

```ts
await expect(page.locator('[data-smoke="simple-finder-home"]')).toBeVisible();
await expect(page.locator('[data-smoke="find-piece-panel"]')).toBeVisible();
await expect(page.locator('[data-smoke="homepage-bling-vault"]')).toBeVisible();
await expect(page.getByRole("link", { name: "Find a Piece" })).toBeVisible();
await expect(page.getByRole("link", { name: "My Collection" })).toBeVisible();
await expect(page.getByRole("link", { name: "Browse Library" }).first()).toBeVisible();
await expect(page.getByText("Wishlist check")).toBeVisible();
await expect(page.locator('[data-smoke="simple-finder-home"]').getByText("Found by Sparkle Finder")).toHaveCount(0);
await expect(page.locator('[data-smoke="homepage-bling-vault"]').getByText("Found by Sparkle Finder")).toBeVisible();
await expect(page.getByRole("link", { name: "I have a photo or label" })).toBeVisible();
await expect(page.getByRole("link", { name: "Reps" }).first()).toBeVisible();
```

- [ ] **Step 7: Run focused tests and confirm failure**

Run:

```powershell
npm exec vitest run tests/sparkle-finder/routes.test.ts
npx playwright test tests/smoke/sparkle-finder-home.spec.ts --project=chromium
```

Expected before implementation: failures show the current A section is too dense and nav still exposes Library instead of Collection.

- [ ] **Step 8: Commit the failing contract tests**

```powershell
git add tests/sparkle-finder/routes.test.ts tests/smoke/sparkle-finder-home.spec.ts
git commit -m "test: lock mobile app preview alignment"
```

---

### Task 2: Update Navigation To The Mobile App Mental Model

**Files:**

- Modify: `components/layout/SparkleFinderNav.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Change nav icons and items**

In `components/layout/SparkleFinderNav.tsx`, change imports to:

```ts
import { Gem, Home, Search, UserRound, UsersRound } from "lucide-react";
```

Set the nav items to:

```ts
const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Find", href: "/#find-a-piece", icon: Search },
  { label: "Collection", href: "/#bling-vault", icon: Gem },
  { label: "Reps", href: "/reps", icon: UsersRound },
];
```

Keep the `Me` account item as the fifth mobile tab:

```ts
const appNavItems = [...navItems, { label: "Me", href: accountHref, icon: UserRound }];
```

- [ ] **Step 2: Keep account behavior unchanged**

Do not change:

```ts
const isSignedIn = isSparkleFinderSignedIn(accountState);
const accountLabel = accountState.status === "anonymous" ? "Sign In" : getSparkleFinderNavStatusLabel(accountState);
const accountHref = isSignedIn ? "/account" : "/auth/sign-in";
```

- [ ] **Step 3: Tighten bottom nav fit**

In `app/globals.css`, keep `.sparkle-finder-app-bottom-nav` at five columns and ensure labels fit:

```css
.sparkle-finder-app-bottom-nav a {
  display: grid;
  min-height: 3.45rem;
  min-width: 0;
  place-items: center;
  gap: 0.2rem;
  border-radius: 0.875rem;
  color: var(--sparkle-ink-muted);
  font-size: 0.64rem;
  font-weight: 900;
  line-height: 1;
  text-align: center;
}
```

- [ ] **Step 4: Run nav tests**

```powershell
npm exec vitest run tests/sparkle-finder/routes.test.ts
```

Expected: nav assertions pass; A/B/C structure may still fail.

- [ ] **Step 5: Commit**

```powershell
git add components/layout/SparkleFinderNav.tsx app/globals.css tests/sparkle-finder/routes.test.ts
git commit -m "feat: align app navigation with mobile preview"
```

---

### Task 3: Make A The True Simple Home Dashboard

**Files:**

- Modify: `components/home/SimpleFinderHome.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Remove profile/stat density from A**

In `components/home/SimpleFinderHome.tsx`, remove these imports if no longer used:

```ts
Gem, Heart, ShieldCheck, Sparkles, UserRound
RepBadge
SilverProfile
SVGProps
```

Keep the component props as:

```ts
type SimpleFinderHomeProps = {
  customer: CustomerAccount;
  model: HomepageBlingVaultModel;
};
```

- [ ] **Step 2: Render A as one simple phone-first dashboard**

Replace the current returned markup with:

```tsx
<section
  className="border-b border-[var(--sparkle-border-strong)] bg-[linear-gradient(180deg,rgba(251,247,255,0.98),rgba(245,237,255,0.76))]"
  data-smoke="simple-finder-home"
  id="home"
>
  <div className="sparkle-finder-app-canvas mx-auto grid max-w-[34rem] gap-3 px-5 py-5 sm:px-8 lg:max-w-[56rem] lg:px-10 lg:py-7">
    <article className="grid gap-4 rounded-[1.5rem] border border-[var(--sparkle-border)] bg-[rgba(255,255,255,0.94)] p-4 shadow-[var(--sparkle-shadow-sm)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--sparkle-coral)]">Home</p>
        <p className="truncate text-xs font-black text-[var(--sparkle-ink-muted)]">{customer.displayName}</p>
      </div>
      <div className="grid gap-2">
        <h1 className="sparkle-display text-4xl font-semibold leading-[1.04] text-[var(--sparkle-plum-deep)] sm:text-5xl">
          Find the pieces you love.
        </h1>
        <p className="text-base font-semibold leading-7 text-[var(--sparkle-ink-muted)]">
          Build your collection with Sparkle Finder.
        </p>
      </div>
      <div className="grid gap-2">
        <HomeAction href="#find-a-piece" icon={Search} label="Find a Piece" primary />
        <div className="grid grid-cols-2 gap-2">
          <HomeAction href="#bling-vault" icon={Gem} label="My Collection" />
          <HomeAction href="/library" icon={BookOpen} label="Browse Library" />
        </div>
      </div>
      <Link
        className="grid gap-1 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] p-3 text-left transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sparkle-rose)]"
        href="#find-a-piece"
      >
        <span className="text-sm font-black text-[var(--sparkle-plum-deep)]">Wishlist check</span>
        <span className="text-xs font-semibold leading-5 text-[var(--sparkle-ink-muted)]">
          {model.counts.wishlist > 0
            ? `${model.counts.wishlist} pieces ready for Sparkle Finder to watch.`
            : "Add pieces you want, then Sparkle Finder can help watch for them."}
        </span>
      </Link>
    </article>
  </div>
</section>
```

- [ ] **Step 3: Keep helpers minimal**

Keep `HomeAction`. Delete `MiniMetric`, `getInitials`, `TikTokHandleLink`, `TikTokIcon`, and `normalizeTikTokProfile` from this file after moving stats/profile out of A.

- [ ] **Step 4: Update `AuthenticatedHomePage` call**

In `components/home/AuthenticatedHomePage.tsx`, change:

```tsx
<SimpleFinderHome customer={customer} model={blingVaultModel} profile={profile} />
```

to:

```tsx
<SimpleFinderHome customer={customer} model={blingVaultModel} />
```

- [ ] **Step 5: Run focused tests**

```powershell
npm exec vitest run tests/sparkle-finder/routes.test.ts
```

Expected: A-light assertions pass. B stat assertions fail until Task 4.

- [ ] **Step 6: Commit**

```powershell
git add components/home/SimpleFinderHome.tsx components/home/AuthenticatedHomePage.tsx app/globals.css
git commit -m "feat: simplify signed-in app home"
```

---

### Task 4: Make B The Collection Layer With Stats And Profile Cue

**Files:**

- Modify: `components/home/HomepageBlingVault.tsx`
- Modify: `components/home/HeroPieceSpotlight.tsx`
- Modify: `components/home/WishlistRail.tsx`
- Modify: `components/home/BlingVaultMosaic.tsx`
- Modify: `components/home/AuthenticatedHomePage.tsx`

- [ ] **Step 1: Pass customer/profile into the collection layer**

In `components/home/HomepageBlingVault.tsx`, update props:

```ts
import { Gem, Heart, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { RepBadge } from "@/components/account/RepBadge";
import type { CustomerAccount, SilverProfile } from "@/lib/sparkle-finder/types";

type HomepageBlingVaultProps = {
  customer: CustomerAccount;
  model: HomepageBlingVaultModel;
  profile?: SilverProfile;
};
```

Update the function:

```ts
export function HomepageBlingVault({ customer, model, profile }: HomepageBlingVaultProps) {
```

- [ ] **Step 2: Add B collection status block above Hero Piece**

Inside `HomepageBlingVault`, after the section heading and before `HeroPieceSpotlight`, add:

```tsx
<div className="grid gap-3 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[rgba(255,255,255,0.92)] p-4 shadow-[var(--sparkle-shadow-sm)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
  <div className="min-w-0">
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold leading-tight text-[var(--sparkle-plum-deep)]">
        {customer.displayName}&apos;s Collection
      </h3>
      <RepBadge repIdentity={customer.repIdentity} />
    </div>
    <p className="mt-1 text-sm font-semibold text-[var(--sparkle-ink-muted)]">
      Owned pieces, wishlist pieces, rare finds, and pieces Sparkle Finder helped you find.
    </p>
  </div>
  <Link
    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border-strong)] bg-white px-4 text-sm font-black text-[var(--sparkle-plum)] transition hover:bg-[var(--sparkle-paper-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--sparkle-rose)]"
    href="/account"
  >
    <UserRound aria-hidden="true" className="size-4" />
    Me
  </Link>
  <div className="grid grid-cols-2 gap-2 lg:col-span-2 sm:grid-cols-5">
    <CollectionMetric icon={Gem} label="Owned" value={model.counts.owned} />
    <CollectionMetric icon={Heart} label="Wishlist" value={model.counts.wishlist} />
    <CollectionMetric icon={Sparkles} label="Diamonds" value={model.counts.diamonds} />
    <CollectionMetric icon={ShieldCheck} label="Unicorns" value={model.counts.unicorns} />
    <CollectionMetric className="col-span-2 sm:col-span-1" icon={Search} label="Found by Sparkle Finder" value={model.counts.finderFinds} />
  </div>
</div>
```

- [ ] **Step 3: Add `CollectionMetric` helper**

At the bottom of `HomepageBlingVault.tsx`, add:

```tsx
function CollectionMetric({
  className = "",
  icon: Icon,
  label,
  value,
}: {
  className?: string;
  icon: typeof Gem;
  label: string;
  value: number;
}) {
  return (
    <div className={`flex min-h-16 items-center gap-2 rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-[var(--sparkle-paper-soft)] px-3 ${className}`}>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-[var(--sparkle-coral)]" strokeWidth={1.7} />
      <div>
        <p className="text-base font-black leading-none text-[var(--sparkle-plum-deep)]">{value}</p>
        <p className="mt-1 text-xs font-bold leading-tight text-[var(--sparkle-ink-muted)]">{label}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `AuthenticatedHomePage` call**

Change:

```tsx
<HomepageBlingVault model={blingVaultModel} />
```

to:

```tsx
<HomepageBlingVault customer={customer} model={blingVaultModel} profile={profile} />
```

- [ ] **Step 5: Preserve B order**

Keep this order inside `HomepageBlingVault`:

```text
Heading
Collection stats/profile cue
HeroPieceSpotlight
WishlistRail
BlingVaultMosaic
```

- [ ] **Step 6: Run focused tests**

```powershell
npm exec vitest run tests/sparkle-finder/routes.test.ts
```

Expected: B stat assertions pass.

- [ ] **Step 7: Commit**

```powershell
git add components/home/HomepageBlingVault.tsx components/home/AuthenticatedHomePage.tsx
git commit -m "feat: move collection stats into collection layer"
```

---

### Task 5: Make C A Guided Find Flow, Not A Dense Command Panel

**Files:**

- Modify: `components/home/FindPiecePanel.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Keep simple choices first**

In `components/home/FindPiecePanel.tsx`, set the first option group to exactly:

```tsx
<div className="grid gap-2">
  <FindOption href="/library" icon={Search} label="I know the name" />
  <FindOption href="/library" icon={Sparkles} label="I know the collection" />
  <FindOption href="/silver#showcase-studio" icon={Camera} label="I have a photo or label" />
  <FindOption href="#homepage-nic-nac" icon={Heart} label="Check my Wishlist" />
  <FindOption href="#homepage-nic-nac" icon={Bot} label="Ask Nic-Nac for Help" />
</div>
```

- [ ] **Step 2: Move advanced links under a native disclosure**

Replace the always-visible advanced grid with:

```tsx
<details className="rounded-[var(--sparkle-radius-sm)] border border-[var(--sparkle-border)] bg-white p-3">
  <summary className="cursor-pointer text-sm font-black text-[var(--sparkle-plum)]">
    More ways to look
  </summary>
  <div className="mt-3 grid gap-2 sm:grid-cols-2">
    <ContextLink href="/library?label=diamond" icon={Sparkles} label="Diamonds & Unicorns" />
    <ContextLink href="/live-shows" icon={CalendarDays} label="Live Shows" />
    <ContextLink href="/rep-boards" icon={UsersRound} label="Rep Boards" />
    <ContextLink href="/reps" icon={UsersRound} label="Reps" />
    <ContextLink href="/favorites" icon={Heart} label="Favorite Reps" />
    <ContextLink href="/collectors" icon={UsersRound} label="Collectors" />
    <ContextLink href="/photo-setup" icon={Images} label="Photo Setup Guide" />
  </div>
</details>
```

- [ ] **Step 3: Keep Nic-Nac as helper, not page concept**

Keep:

```tsx
<FindThisForMe accountState={accountState} compact jewelryItemId={nicNacItemId} />
```

Do not reintroduce:

```text
Nic-Nac Home
Command Center
Ask Nic-Nac or tap a simple action.
```

- [ ] **Step 4: Improve compact panel layout**

Keep `FindPiecePanel` in a single-column app canvas on mobile and tablet:

```tsx
<div className="sparkle-finder-app-canvas mx-auto grid max-w-[34rem] gap-4 px-5 py-6 sm:px-8 lg:max-w-[56rem] lg:grid-cols-[minmax(0,0.86fr)_minmax(18rem,0.64fr)] lg:px-10">
```

- [ ] **Step 5: Run focused tests**

```powershell
npm exec vitest run tests/sparkle-finder/routes.test.ts
```

Expected: C capability assertions pass.

- [ ] **Step 6: Commit**

```powershell
git add components/home/FindPiecePanel.tsx app/globals.css
git commit -m "feat: simplify guided find flow"
```

---

### Task 6: Amethyst Polish And Mobile Visual QA Fixes

**Files:**

- Modify: `app/globals.css`
- Modify: `components/home/BlingVaultTile.tsx`
- Modify: `components/home/HeroPieceSpotlight.tsx`
- Modify: `components/home/WishlistRail.tsx`
- Modify: `components/home/BlingVaultMosaic.tsx`

- [ ] **Step 1: Keep Amethyst but avoid one-note purple**

In `app/globals.css`, retain warm white and paper surfaces:

```css
--sparkle-warm-bg: #fbf7ff;
--sparkle-paper: #ffffff;
--sparkle-paper-soft: #f7f0ff;
--sparkle-plum: #4b1f68;
--sparkle-rose: #9d4edd;
--sparkle-coral: #c77dff;
```

Do not convert every panel to dark plum. Use dark plum for nav and primary CTA only.

- [ ] **Step 2: Standardize app card radius**

Use `rounded-[var(--sparkle-radius-sm)]` for most cards. Use `rounded-[1.5rem]` only for the A phone-card wrapper because the preview used a phone-like card.

- [ ] **Step 3: Protect mobile text fit**

Check all new buttons use:

```tsx
className="inline-flex min-h-12 min-w-0 items-center ..."
```

and labels are inside:

```tsx
<span className="min-w-0">{label}</span>
```

where labels may be long.

- [ ] **Step 4: Preserve lazy-loading settings**

In `components/home/BlingVaultMosaic.tsx`, do not change:

```ts
const initialBatchSize = 8;
const mobileBatchSize = 8;
const desktopBatchSize = 12;
const automaticBatchLimit = 3;
```

- [ ] **Step 5: Run route tests**

```powershell
npm exec vitest run tests/sparkle-finder/routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/globals.css components/home/BlingVaultTile.tsx components/home/HeroPieceSpotlight.tsx components/home/WishlistRail.tsx components/home/BlingVaultMosaic.tsx
git commit -m "style: polish amethyst mobile app surfaces"
```

---

### Task 7: Full Smoke, Pressure Test, Deploy, And Record Memory

**Files:**

- Modify: `vault/session-log.md`
- Modify: `vault/decisions.md`
- Modify: `vault/open-items.md` only if a verified follow-up remains.

- [ ] **Step 1: Run lint**

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 2: Run focused route tests**

```powershell
npm exec vitest run tests/sparkle-finder/routes.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full tests**

```powershell
npm run test
```

Expected: PASS.

- [ ] **Step 4: Run build**

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 5: Start local app and smoke test**

Start or reuse a local app server:

```powershell
npm run dev -- -p 4310
```

Then run:

```powershell
npm run smoke:sparkle-finder
npx playwright test tests/smoke/sparkle-finder-home.spec.ts --project=chromium
```

Expected: PASS, with optional live API tests skipped unless configured.

- [ ] **Step 6: Capture visual pressure screenshots**

Use the authenticated Silver preview cookie and capture:

```text
390x844
430x932
768x1024
1440x900
```

Expected:

- A is the first screen and is not dense.
- B feels like collection, not a management panel.
- C feels like guided find, not a command center.
- Bottom nav fits labels.
- No footer appears on signed-in app surfaces.
- No text overlap.
- No blank image frames.
- No shop, marketplace, paid-link, buy/sell, or customer-to-customer trading language.

- [ ] **Step 7: Route availability pressure check**

Check these routes return usable pages or expected auth walls:

```text
/
/library
/library/jewel-rainbow-crown-ring
/live-shows
/rep-boards
/reps
/favorites
/collectors
/silver
/account
/photo-setup
/privacy-policy
/terms-and-conditions
```

- [ ] **Step 8: Update durable memory**

Append to `vault/session-log.md`:

```md
- Realigned the Sparkle Finder signed-in homepage with the July 3 A/B/C mobile app preview:
  - A: simple app home opens first.
  - B: collection layer now carries Hero Piece, stats, Wishlist, and Bling Vault.
  - C: Find a Piece is a guided flow with advanced capabilities contextualized.
  - Primary app nav is Home, Find, Collection, Reps, Me.
  - Sparkle Suites Amethyst skin remains the customer-facing visual direction.
  - Existing backend plumbing, Nic-Nac, collection saves, reps, library, wishlist, live shows, rep boards, favorites, collectors, auth, account, and legal routes were preserved.
```

Append to `vault/decisions.md`:

```md
## 2026-07-04 - Mobile App Preview Is The Signed-In UI Reference

Decision: The July 3 A/B/C mobile app preview is the active signed-in Sparkle Finder UI reference. A opens the app, B is the collection layer, and C is the guided find flow. The old May 29 locked homepage concept is not the target for this redesign pass.
```

- [ ] **Step 9: Commit final memory**

```powershell
git add vault/session-log.md vault/decisions.md vault/open-items.md
git commit -m "docs: record mobile app preview alignment"
```

- [ ] **Step 10: Push and deploy**

```powershell
git push
npx vercel --prod
npx vercel alias set <deployment-url> sparkle-finder-dev.vercel.app
```

Expected: deployment succeeds and `https://sparkle-finder-dev.vercel.app` serves the updated app.

- [ ] **Step 11: Live smoke**

Check:

```text
https://sparkle-finder-dev.vercel.app/
https://sparkle-finder-dev.vercel.app/reps
https://sparkle-finder-dev.vercel.app/library
https://sparkle-finder-dev.vercel.app/auth/sign-in
```

Expected: `200 OK` and no deployment error page.

---

## Final Verification Checklist

- [ ] The old May 29 concept is not used as the redesign target.
- [ ] A opens first and is simple.
- [ ] B contains collection stats, Hero Piece, Wishlist, and Bling Vault.
- [ ] C contains guided find choices and contextual advanced routes.
- [ ] Primary app nav is `Home`, `Find`, `Collection`, `Reps`, `Me`.
- [ ] Library remains reachable from A and C.
- [ ] Nic-Nac remains reachable and functional.
- [ ] Live shows, rep boards, reps, favorites, collectors, photo setup, missing-piece Studio, account, billing, auth, privacy, and terms remain reachable.
- [ ] No shop, marketplace, paid-link, buy/sell, or customer-to-customer trading behavior appears.
- [ ] `npm run lint` passes.
- [ ] `npm exec vitest run tests/sparkle-finder/routes.test.ts` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run smoke:sparkle-finder` passes.
- [ ] `npx playwright test tests/smoke/sparkle-finder-home.spec.ts --project=chromium` passes.
- [ ] Mobile/tablet/desktop screenshots are inspected.
- [ ] Changes are committed, pushed, deployed, and live-smoked.

## Execution Choice

Recommended execution path: **Subagent-Driven**, one implementation task at a time, with a reviewer after each task. If subagents are unavailable, use inline execution with the same task boundaries and verification checkpoints.
