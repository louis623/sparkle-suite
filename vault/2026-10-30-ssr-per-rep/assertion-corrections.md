# Six assertion corrections authorized by Louis

All six cases pass after the corrections. No application or compiled page code changed: hashes of every changed application/compiled file remained identical across this correction. See `assertion-corrections.json` for the exact case names and results.

| Case | Before | Now | Why the rendered page was already correct |
| --- | --- | --- | --- |
| Custom-domain home | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing the `data-ssr-review-label` attribute. | The string occurred in an inlined CSS selector; there was no review-label element. The SSR marker, custom-domain canonical, `/trade` and `/join` links, and empty rendering slug checks already passed. |
| Custom-domain Dance Floor | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing that attribute. | The same shared CSS selector was present, with no label element. Its SSR marker, canonical, links and rendering-identity checks already passed. |
| Custom-domain Join | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing that attribute. | The same CSS-only occurrence caused the failure. Its SSR marker, canonical, links and rendering-identity checks already passed; the separate Join-visibility denial case also passed. |
| MHF home, `sparkle_rise` | Looked for the contiguous substring `WITH LINDSEY` anywhere in the serialized hero HTML. | Selects the `p.mhf-hero-with` content, removes HTML comments only, and requires its entire text to equal `WITH LINDSEY`. | React serialized the visible text as `WITH <!-- -->LINDSEY`. The complete hero-tree comparison against frozen legacy already passed before this assertion. |
| MHF home, `still` | Looked for the same contiguous substring in the serialized hero HTML. | Requires the exact paragraph text after removing comments only. | The same React comment separated the two correct text nodes. The complete frozen-vs-SSR hero-tree comparison already passed. |
| MHF home, `none` | Looked for the same contiguous substring in the serialized hero HTML. | Requires the exact paragraph text after removing comments only. | The same non-visible comment caused the failure; the complete legacy hero-tree comparison already passed. |

The corrections preserve the intended element/text requirements. The MHF check is now confined to the correct paragraph and requires exact text, rather than accepting a match anywhere in the hero. No other assertion was removed or relaxed in this correction.

The corrected focused run passed 466 cases. Its only three failures are the same pre-existing Pantry byte assertions captured at base `968f7425`; all six cases above passed.

Two later visual-harness setup issues were corrected without page-code edits: raw template assets needed the URL rooting already performed by the real public response, and the mock inventory refresh needed to retain the same fixture card rendered initially. These were fixture prerequisites, not changes to the customer pages.
