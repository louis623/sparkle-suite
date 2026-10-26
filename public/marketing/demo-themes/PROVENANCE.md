# Demo-theme posters

Refreshed October 25, 2026 from the existing 23 customer theme scenes, using the public Live demo's current Fizz Festival name, headline, subtitle, and announcement. Read-only source: `https://www.yoursparklesuite.com/api/public/landing-demo/preview`. No account settings were changed. This replaces old screenshots containing the former name and Smoke-only ticker text, and supplies missing seasonal phone posters.

The existing marketing document renderer supplies the layout and approved art. Desktop: 1200×850; phone: 390×640; WebP quality 85, effort 6. No new art generation or crop redesign.

Reproduce with `scripts/qa/render-theme-poster-documents.ts` (asset origin, output directory, public display-data origin), followed by `scripts/qa/capture-theme-posters.cjs` (asset origin, poster output directory, rendered-document directory). The capture script uses disposable Chrome contexts and browser-local response interception only.
