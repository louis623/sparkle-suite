# AM-01 · Chasing Unicorns Smoke review

Approved visual update to existing Community preset `amethyst` / AM-01. Its
palette (#5C0EFF, #FF1AC2, #E8DFF5), Italiana/Inter fonts, cards, template data,
customer actions and saved identity remain compatible. Morganite remains the
default. No migration or account reassignment is required.

The approved full-body unicorn plays its ten-second entrance once, holds its
final pose, and offers Play again. Sound #4, Moonlit Magic, is muxed into the
same video timeline. Every fresh load starts muted. Play with sound restarts
the quiet fade from the entrance; Mute sound leaves the motion running. Pause
and offscreen/hidden-page handling pause both motion and sound. Reduced motion
and a rep's saved motion-off preference show the final poster without loading
the video; visitors may explicitly request Play. Media failure also restores
that matching poster. Ambient ribbons and stars pause with the scene.

## Source and assets

- Implementation starts from GitHub active branch tip
  `f9eec1e90f24b230bac20e6f4b1d1e6399e5f79a` in a disposable clean clone.
- Preserves Cursor's seven landing-page files already served on Smoke from
  descendant commit `076777052b8388fe421b07af29ad59008d52a8a3`.
- User confirmed Grokbot and Cursor stopped Smoke work before release.
- Only Suite Smoke project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ` is a release
  target; no Live alias or deployment is authorized by this review.
- Approved movie is H.264 1310×704, 24 fps, 10.041667 seconds with AAC audio.
  The chosen-sound delivery preserves the approved silent video's H.264 packet
  stream hash: `136f46b988a0108351e05769bc13f654339632c5ccac313cf25d02950d3d0138`.
- Both posters are extracted from the approved sequence. No new generation,
  paid provider request or Higgsfield credit spend is part of this release.

## Repeatable review

1. Open `https://sparkle-suite-smoke.vercel.app/login` and sign in with a
   dedicated synthetic Smoke account. Do not use a personal Live account.
2. Open `/nic-nac?section=site-settings`, select Amethyst / AM-01, and save.
3. Reload Site Settings to confirm the choice persisted. Open the account's
   customer-site link from the workspace. Hero copy, actions and trade tip
   remain in the hero, with the large unicorn to the right.
4. On refresh, check muted entrance, final hold, Play again, Play with sound,
   Mute sound and Pause animation. Check phone and intermediate widths.
5. Follow Dance Floor and Join Team links. Existing data, actions and Amethyst
   colors must remain; these pages do not load the unicorn movie.
6. Reset the synthetic account by choosing its previous preset and saving.
   Refresh restarts the hero; no provider calls or customer side effects are
   needed for replay. Louis's Smoke settings are left for him to choose.

The noindex `/skin-preview/amethyst/homepage` sample route also provides Home,
Dance Floor, Join and Preferences navigation. It is clearly labeled sample
content, uses fixtures only, blocks network writes/uploads/form submissions,
and narrows media loading to this skin's hosted assets. This is an appearance
preview available in the catalog, not an authentication or reviewer bypass.
Existing Smoke environment guards remain required: staging Supabase only,
provider credentials absent, sending/billing flags off and scheduled jobs off.

## Verification before Smoke release

- Skin settings, visibility, identity, preview restrictions, chosen-sound
  controls and lifecycle tests passed; existing animated skins passed.
- Amethyst Homepage/Trade/Join: 100 tests and local link checks passed.
- Typecheck and full Next.js build passed with verified staging configuration.
- Browser: desktop and 390-pixel phone preview rendered actual customer
  components without horizontal overflow. Copy/actions/tip stayed inside the
  hero; final hold/replay, opt-in audio, mute and pause were verified.
- Actual speaker output requires Louis's listening check; decoded audio is
  present and the browser sound control switches the media to unmuted.

Final source SHA, Smoke deployment ID and signed-in selection verification
belong in the Core Memory ship receipt after deployment.
