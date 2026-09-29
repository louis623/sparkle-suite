# Live Lineup status copy and signals — September 29, 2026

Presentation-only draft: https://github.com/louis623/sparkle-suite/pull/49 (`cursor/live-lineup-status-copy-0977`). Not deployed. Chrome Web Store was not touched. Extension version stays 2.0.6. The assigned Live Lineup code was not regenerated. Parser, lease, publish, and read behavior were not changed. Smart customer cards were not touched.

Approved status phrase, used in both the extension popup and the Workspace Live Lineup card: **Connected + Updating**.

## User-visible strings

Popup status title:

- `Checking connection…` → `Connecting`
- `Paused` → `Off`
- `Connection needs attention` → `Needs attention`
- `Waiting for Party Orders` → `Connecting`, `Reconnecting`, `Needs attention`, or `Connected + Updating`, depending on the existing signal
- `Applying party selection` → `Connected + Updating` after a prior ready connection, otherwise `Connecting`
- `Connected` → `Connected + Updating`

New popup detail, only when a prior connection has no parser reason and the ready window has lapsed: `Sparkle Suite is reconnecting.` Existing error and reason sentences are unchanged.

Workspace Live Lineup status:

- `Checking connection` → `Connecting` (neutral)
- `Connected` → `Connected + Updating` (green), including when the local freshness window lapses
- `Waiting for an update` → `Connected + Updating` (green) while the source is momentarily not ready; `Reconnecting` (amber) when the heartbeat is late
- `Not connected` during an automatic Workspace retry → `Reconnecting` (amber)
- `Not connected` when the publisher is offline → `Needs attention` (red)

Setup guide:

- `Confirm the green Connected light` → `Confirm the green Connected + Updating light`
- `The extension shows a green Connected light and the expected parties.` → `The extension shows a green Connected + Updating light and the expected parties.`

The Workspace snapshot has no extension on/off switch. `Off` is the popup label when that switch is off. A publisher that is offline shows `Needs attention` in the Workspace.

## Smoke check

Reload the unpacked Smoke 2.0.6 folder after updating `popup.js`, `popup.css`, and the status placeholder in the existing Smoke `popup.html`. Do not replace that Smoke `popup.html` wholesale, or the Smoke banner and endpoint isolation are lost. Do not load the repo `chrome-extension` folder in place of the Smoke package. Workspace copy appears only after a later Smoke deploy of this change. Production and the Chrome Web Store stay as they are.
