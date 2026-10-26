# Customer theme fonts

Google Fonts copies are the existing, unmodified WOFF2 faces, served under the
included SIL Open Font License notices in `licenses/`. Regenerate their manifest
and fallback metrics with `node scripts/prepare-homepage-fonts.mjs`.

The selected Latin faces are embedded in the initial homepage stylesheet so
their final metrics arrive with the text. Other language subsets remain local
files and load only when needed. Approved family choices are unchanged.

Proprietary Fontshare files are not redistributed here. Their manifest entries
retain the existing official CDN delivery. Fontshare's current FFL v2.0 has a
SaaS/font-selector restriction; the existing product picker needs a separate
rights review. Source: https://www.fontshare.com/licenses/itf-ffl (read October 25,
2026). This change does not assert a license grant for that existing workflow.
