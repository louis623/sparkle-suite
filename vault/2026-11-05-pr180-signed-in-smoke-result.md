# PR180 signed-in Smoke pass — stopped at turn 8

Application commit: eae0d0aeb8556931890110ba77695aa155f031da.
Smoke deployment: dpl_Huh3F3xJkSeE4pVXDgQ7LRYtGibp.
Stable alias: https://sparkle-suite-smoke.vercel.app
Provenance URL: https://sparkle-suite-smoke-ezxs8vva3-louis-2849s-projects.vercel.app

Louis authorized reuse of exact existing Chrome tab788310669/cookies, one reload, no magic link, one fresh conversation, max4loads/14turns/stop first failure. Reload preserved signed-in Louis Chapman/Fizz Festival; Smoke database and runtime rep identity confirmed louis@neonrabbit.net /56c59f36-0e37-4e8e-a664-a1b293699c11. Fresh conversation b2429879-a313-411b-8607-bbe75ed3f857. No new profile/tab/incognito.

| Guard | Result in exercised cases | Evidence |
| --- | --- | --- |
| G1 label-only cannot be main | PASS | Turns1,3 labels stored label_details/label_or_packaging; separate jewelry requested; neither label selected or saved. |
| G2 explicit photo/no fallback | FAIL | Turn8 new blocked blurry photo1f57f87f-d464-4ac1-b8e4-e3bf75fed0b6; reply silently previews older photo64c9f208-72af-490a-9d7a-6e1a8b4e1a0e already rejected for cross-item reuse. |
| G3 actual preview/separate submitted confirmation | PASS for exercised cases | Turn2 actual boxed jewelry3c4c0bef-0700-4eca-9ad0-6a5a8bc69338 stored jewelry_front, visible assistant image + question, persisted data-main-photo-preview. Turn3 yes+label upload only re-asks, no save. Turn4 attachment-free yes saves exact A photo. Turn5 rejects prior yes for new piece. |
| G4 original-byte cross-item reuse | PASS | Turns6–7 explicitly reupload A for B, preview then yes; reply “This photo is already on ER97114. I won't use it as the main photo for ER97115. Please send a new jewelry photo.” B created_listing_ids stays empty. Original SHA256 matches A:3fb5f3355d1211f6e240e27142d883aa1289dba48f3dbb60970f921c6370c39a. Same-item variant subcase not exercised. |
| G5 correct-piece binding | PASS for exercised boundary/save | Turn5 starts separate session13af1840-150a-4a0c-b8d6-d8aa58c90fc8, does not inherit A photo/yes, asks B photo. Explicit subsequent B uploads bound to ER97115; A stays confirmed ER97114 and its saved URL unchanged. No wrong-piece save; stale older B-bound duplicate preview is G2 failure above. |
| G6 blur/cut-off rejection/coaching | FAIL in blur reply; cut-off not exercised | Turn8 blurry row quality blocked with blur_risk, but assistant asks “Is this the right main photo for ER97115?” on the older duplicate instead of blur-retake coaching. Stop immediately; no confirmation or further upload. |

Turn sequence:1labelA;2boxedA preview;3yes+label reupload;4separate yes savesA;5startB requesting previous photo/yes refused;6exactA bytes reuploaded forB preview;7yes cross-item bytes refused;8blurredB upload causes stale older preview. All16 user/assistant records complete,8rep turns. No Couldn't-send error.

First failure evidence: assistant message5e9bed03-25f0-43c1-a77d-e7d47bb39f09 (2026-11-05 16:21:59.863249+00), preview part photoId64c9f208-72af-490a-9d7a-6e1a8b4e1a0e, itemNumberER97115. B metadata previewUserMessageIdTul7MqoWW2ZlP62y and same older previewPhotoId. New photo1f57f87f-d464-4ac1-b8e4-e3bf75fed0b6 created16:22:01.757698+00, qualityblocked/blur_risk. Screenshot .local/pr180-smoke-fix/current-first-failure.jpg shows blurred user upload and older clear A assistant preview together. Initial repaired preview screenshot current-main-preview.jpg.

Code reading explains fallback: lib/nic-nac/workflows/trade-board-intake-controller.ts:473 returns no main-photo problem when ANY accepted current-piece photo exists, before blur coaching; lib/nic-nac/workflows/trade-board-intake-context.ts:761–764 filters blocked photos then picks last remaining accepted photo with at(-1). Older duplicate remains eligible for preview despite earlier save refusal. No new fix made.

PieceA ER97114: session08ecf28e-85df-4d1d-9868-7aa5bedc36b8, listing04054cf8-eeae-49c1-8fc5-9298da34b948, design4b4cb2a6-7ea5-4013-963b-6ec9fd37ce83.
Main-photo URL (session savedMainPhotoUrl, listing listing_photo_url and design canonical_photo_url all agree):
https://pukemqiwlyqmyytxkdmo.supabase.co/storage/v1/object/public/jewelry-photos/56c59f36-0e37-4e8e-a664-a1b293699c11/designs/4b4cb2a6-7ea5-4013-963b-6ec9fd37ce83/ER97114-source.jpg
PieceB ER97115: no saved main-photo URL; no listing created.
No label was ever accepted as main photo.

This continuation counts:0deploys/0alias moves/0env changes/1of4page loads (existing tab reload)/0magic links/1fresh conversation/8of14rep turns/0test runs. Earlier repair counts remain1Smoke deploy,1alias move and named-file19individual case executions over2executed invocations plus1blocked startup; no new deployment/test today in this continuation. Earlier failed login page load belongs to prior stopped attempt, not this newly authorized reuse pass.
Alias left on eae0d0ae. No merge, Live, PR141, manual DB changes, cleanup, rerun or extra chat. Smoke NOT passed/Live-ready. Record in actual Open Brain separately; no secrets included.

