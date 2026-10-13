# 2026-10-13 Card info stack closeout

- Branch `cursor/card-qr-vertical-stack-7d75`. Fix commit `90cbc61159326c477bf08b94a019df92da7680b8`. PR https://github.com/louis623/sparkle-suite/pull/91 into `codex/nic-nac-trade-hardening`. Not merged. Not deployed. No database change.
- Root cause: `renderBizcardBack` drew the text line and the social handle on one row when `w1 + w2 + 24` fit the info column. Short TikTok handles sat to the right of the text line. Longer handles already used their own line, and wider theme fonts paired fewer handles, so the demo card looked uneven.
- Preview, PNG download, and print PDF all use that renderer through `renderCardQrCardFiles`. The tool page shows those PNGs. Front title and `with {name}` were already stacked. QR stays in the left column.
- Each info field now starts on its own line. A long handle with no break character wraps to a second line of that row. 88 card tests passed.
- Next action: review PR 91. Do not deploy until Louis asks.
