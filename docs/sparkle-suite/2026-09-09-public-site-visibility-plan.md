# Customer-site visibility controls

## Approved behavior

Place four accessible on/off switches together in Site Settings under “Show on
your website”: Announcements, Join Team, Dance Floor, and Live Lineup. Explain
that hiding a section preserves its content, configuration, and Workspace tools.
Use the existing Site Settings save workflow and show saved values after reload.
Join Team retains its existing early-access entitlement restriction.

## Implementation

1. Preserve current announcement and Join Team preferences. Add per-rep
   `dance_floor_visible` and `live_lineup_visible` preferences defaulting to true
   for both existing and future accounts. Validate incoming values as booleans.
2. Replace the existing checkbox area with one reusable, keyboard-accessible
   switch group, explicit On/Off text, and individual explanatory descriptions.
3. Propagate all four preferences through the customer template data, keeping
   tenant theme transformations and custom-domain/slug link rewriting intact.
4. Separate the announcement ticker from Dance Floor highlights. Hide Dance
   Floor navigation, footer and hero links when disabled. Hide public lineup
   strips, open buttons and dialogs on every customer page when disabled.
5. Keep feature data and authenticated Workspace operations active. Public
   visibility is not an authorization or privacy control: existing direct Dance
   Floor links may remain accessible. The switch description must not imply
   that it unpublishes data or disables trades. Join Team keeps its existing
   page-access behavior.
6. Apply behavior consistently to the standard renderer and Brittany, Heather,
   and Mile High Fizz variants, including Join Team and Pantry navigation.

## Verification

- Save/reload each false value independently; turn it back on and verify the
  same content returns. Check defaults and partial updates.
- Reject non-boolean payloads without saving other fields.
- Exercise ticker combinations (announcement only, Dance Floor only, both,
  neither), lineup hidden on homepage/Trade/Join, and permitted/locked Join Team.
- Check desktop and mobile switch layout, keyboard focus, screen-reader labels,
  and hidden-link absence with safe synthetic customer data.
- Run focused service/template tests, relevant lint and production build.

## Release isolation

The checkout contains explicitly unreleased Live Lineup work overlapping the
Workspace editor, customer renderers, and template pipeline. Preserve it exactly.
Record this task's patch separately from that existing diff. Release only a
verified source snapshot containing the approved visibility patch and already
released application source; never deploy the combined working directory.
Apply only this task's additive migration, not pending Lineup migrations.
Commit/push the authorized change and manually deploy the verified branch tip
under the repository's provenance rules. Verify both Suite aliases and the
affected live paths using safe reviewer data before claiming the switches live.
If an isolated release cannot satisfy those rules, document the concrete blocker
and keep the implementation unreleased pending resolution.
