# Mac Live Lineup Help — September 15, 2026

## Outcome

Help & Resources now includes a dedicated Live Shows workflow, **Use Live
Lineup on a Mac**. It confirms that a MacBook or Mac desktop can run the
Sparkle Suite Live Queue extension through Google Chrome, gives the plain
English Chrome and extension setup path, and clearly distinguishes computers
from iPhone/iPad use in the visible guide checklist.

## Safety and support guidance

- Safari remains suitable for normal browsing, but the Live Queue extension
  runs in Chrome on a computer.
- Reps use the same Chrome profile for Sparkle Suite, Bomb Party Party Orders,
  and the extension.
- Private connection keys must remain out of chat.
- iPhone and iPad do not run the Chrome extension.

## Verification

- Focused Help Resources test: 21 passing.
- Production build ran after the branch-safety guard passed.

## Scope

Only `lib/services/help-resources.ts` and its focused test were changed for the
application. Existing unrelated dirty workspace files and the protected local
extension overlay remain excluded.
