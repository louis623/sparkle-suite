# Pumpkin and Witch Onyx update

Louis approved option B, four extra animated stars, and release to Live. Existing community skin ID `halloween_pumpkin_witch` and listing code HPW-01 remain selectable; no rep's stored selection is changed.

Source 6087e620d72eee1812f89635583f0a4ecb580537 passed a guarded build, focused skin/template/contrast tests, local desktop/tablet/mobile visual review, and Smoke candidate dpl_5kB2ARZiaXUpBEFEGEF3Djo5zqjU. The synthetic Smoke rep's available-skin endpoint contained the Witch; save/reload succeeded and its previous Cat selection was restored. The canonical Smoke alias stayed on its existing deployment and its scheduler stayed disabled.

The initial Live deployment dpl_8YrxEhezDicgGWdmgTCJqm22L2Qo was verified on both Suite domains. A final live visual check identified the Dance Floor's oversized desktop headline and supporting text grazing the artwork. The accompanying CSS-only follow-up constrains both to the dark central lane, bumps stylesheet cache versions, and passed 50 focused tests. It is part of this same authorized release. The final deployment receipt and live verification are recorded in Core Memory at ships/2026-09-28-witch-onyx-live.md after completion.

See docs/sparkle-suite/operations/2026-09-28-witch-onyx-release.md for scope, provenance, aliases, and repeatable safe review steps. Persistent Windows checkouts and extension files were not used or changed. No credential or customer data is in the notes.
