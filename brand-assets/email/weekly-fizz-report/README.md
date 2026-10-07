# Weekly Fizz Report

Proposal HTML for a future Resend newsletter. These files live in Git so the design is not only in a mailbox.

Nothing in this folder is published, scheduled, or sent unless Louis says so. Do not create the Resend template, do not send a test to a real list, and do not deploy the app for this.

From intent: Sparkle Suite &lt;notifications@yoursparklesuite.com&gt;

## Files

| File | Use |
| --- | --- |
| `weekly-fizz-report.example.html` | EXAMPLE issue with three placeholder items. Not real news. |
| `weekly-fizz-report-slow-week.example.html` | Slow week. One honest line. No filler items. |
| `weekly-fizz-report.resend-template.html` | Resend shell. Triple-mustache variables only. |

Open an example file in a browser to review layout. The Unsubscribe href is the Resend variable `{{{RESEND_UNSUBSCRIBE_URL}}}` and is not a live link.

## Brand locks

- Outer cream `#fbf5f2`, white card, 600px max, one column
- Pink 4px accent bar `#ee2c9b`
- Ink `#402924`, secondary text `#775d57`
- Headings: Playfair Display, then Georgia
- Body: DM Sans, then Arial
- CTA pill: gradient `#ff4cae` → `#d81b87`, solid `#ee2c9b`, button text `#fff6fb`, Outlook VML fallback on the solid pink
- Do not use retired pinks `#b91a70` or `#c21878`
- Say **themes**, never “skins”
- Up to five items. Each item is a headline, a summary, “What this means for you”, and a source link
- A slow week is one honest line in `WEEK_NOTE`. Leave `ITEMS_HTML` empty. Never pad

Footer, on every file:

- Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.
- 2126 St. Martin's Drive West, Jacksonville, FL 32246
- Unsubscribe → `{{{RESEND_UNSUBSCRIBE_URL}}}`

## Logo

Use `https://www.yoursparklesuite.com/brand/sparkle-suite-logo-transparent.png`.

That URL returned HTTP 200 (`image/png`) on October 7, 2026. The file in the repo is 1100×280; the email shows it at 280×71.

If that path 404s, switch the `img` src to `https://www.yoursparklesuite.com/email-signatures/sparkle-suite-logo.png`.

## Resend variables

All seven are triple-mustache so Resend does not escape them.

| Variable | Pass |
| --- | --- |
| `PREHEADER` | Plain text. Hidden preview line. |
| `ISSUE_DATE` | Plain text. Shown under the title. |
| `WEEK_NOTE` | Plain text. The opener, or the one slow-week sentence. |
| `ITEMS_HTML` | HTML fragment, max five items. Empty on a slow week. |
| `CTA_LABEL` | Plain text. Keep it short so the Outlook button stays near 280px wide. |
| `CTA_URL` | Absolute `https` URL only. |
| `RESEND_UNSUBSCRIBE_URL` | Resend’s unsubscribe URL. |

`ITEMS_HTML` is the only variable that should contain HTML. The others must be plain text.

On a normal week, `ITEMS_HTML` is one or more of these blocks (five at most). Copy the inline styles from the EXAMPLE file if you change them.

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
  <tr>
    <td style="padding:0 0 20px;border-bottom:1px solid #f6ede8;">
      <p style="margin:0 0 8px;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:22px;line-height:28px;font-weight:600;color:#402924;">Headline</p>
      <p style="margin:0 0 12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#402924;">Summary.</p>
      <p style="margin:0 0 4px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:700;color:#402924;">What this means for you</p>
      <p style="margin:0 0 12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#775d57;">One practical note.</p>
      <a href="https://example.com/source" style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:#d81b87;text-decoration:underline;">Source</a>
    </td>
  </tr>
</table>
```

Omit the bottom border on the last item, matching the EXAMPLE file.
