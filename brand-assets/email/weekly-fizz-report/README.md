# Weekly Fizz Report

Proposal HTML for a future Resend newsletter. These files live in Git so the design is not only in a mailbox.

Nothing in this folder is published, scheduled, or sent unless Louis says so. Do not create the Resend template, do not send a test to a real list, and do not deploy the app for this.

From intent: Sparkle Suite &lt;notifications@yoursparklesuite.com&gt;

The layout follows the October 6, 2026 warm-plum brand kit in `docs/sparkle-suite/brand/08-production-site-design-kit.md`. It is one 600px column on a blush page, in this order:

1. Warm plum header
2. Warm-paper reading
3. Espresso action band
4. White legal strip

## Files

| File | Use |
| --- | --- |
| `weekly-fizz-report.example.html` | EXAMPLE issue with three placeholder items. Not real news. |
| `weekly-fizz-report-slow-week.example.html` | Slow week. One honest line. No filler items. |
| `weekly-fizz-report.resend-template.html` | Resend shell. Triple-mustache variables only. |

Open an example file in a browser to review layout. The Unsubscribe href is the Resend variable `{{{RESEND_UNSUBSCRIBE_URL}}}` and is not a live link.

## Color roles

| Role | Hex | Where |
| --- | --- | --- |
| Blush | `#fbf5f2` | Outer page, and the soft divider between items |
| Warm plum | `#34252f` | Header band |
| Warm paper | `#fff6fa` | Light text on the plum header, the logo plate, and the reading section |
| Soft pink | `#ffd4ea` | Italic “Fizz”, the issue date, and the hairline above the espresso band |
| Ink | `#402924` | Headlines, summaries, and “What this means for you” |
| Muted | `#775d57` | The practical note under that label, and the legal strip |
| Accent pink | `#ee2c9b` | Source links only. Not a page wash. |
| Espresso | `#36221d` | Action band under the reading |
| Cream | `#f6e7da` | Text on the espresso band |
| CTA | `#ff4cae` → `#d81b87` | Pill button. Label `#fff6fb`. Solid `#ee2c9b` and Outlook VML when the gradient is unavailable. |
| White | `#ffffff` | Legal strip |

Do not use retired pinks `#b91a70` or `#c21878`. Say **themes**, never “skins”.

## Sections

- **Header.** Plum `#34252f`. Title “The Weekly Fizz Report” in `#fff6fa`, with *Fizz* in italic `#ffd4ea`. Issue date in `#ffd4ea`.
- **Reading.** Warm paper `#fff6fa`. Up to five items: headline, summary, “What this means for you”, source link. A 16px blush divider sits between items.
- **Espresso.** `#36221d`, cream line, then the gradient CTA.
- **Legal.** White strip. Independence line (not affiliated with Bomb Party), `2126 St. Martin's Drive West, Jacksonville, FL 32246`, and Unsubscribe.

A slow week is one honest line in `WEEK_NOTE`. Leave `ITEMS_HTML` empty. Never pad.

## Logo

Use `https://www.yoursparklesuite.com/brand/sparkle-suite-logo-transparent.png`.

That URL returned HTTP 200 (`image/png`) on October 7, 2026. The file is 1100×280. The email shows it at 260×66.

The wordmark is dark plum on a transparent background, and there is no approved white or knockout logo. On the plum header the lockup sits on a warm-paper `#fff6fa` plate so the wordmark and the gray “workspace” line stay readable.

If that path 404s, switch the `img` src to `https://www.yoursparklesuite.com/email-signatures/sparkle-suite-logo.png`. Do not draw a new logo for this email.

## Resend variables

All seven are triple-mustache so Resend does not escape them.

| Variable | Pass |
| --- | --- |
| `PREHEADER` | Plain text. Hidden preview line. |
| `ISSUE_DATE` | Plain text. Shown in the plum header. |
| `WEEK_NOTE` | Plain text. The opener, or the one slow-week sentence. |
| `ITEMS_HTML` | HTML fragment, max five items. Empty on a slow week. |
| `CTA_LABEL` | Plain text. Keep it short so the Outlook button stays near 280px wide. |
| `CTA_URL` | Absolute `https` URL only. |
| `RESEND_UNSUBSCRIBE_URL` | Resend’s unsubscribe URL. |

`ITEMS_HTML` is the only variable that should contain HTML. The others must be plain text.

On a normal week, `ITEMS_HTML` is one or more of these blocks (five at most). Copy the inline styles from the EXAMPLE file if you change them. Omit the blush divider on the last item.

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td bgcolor="#fff6fa" style="background:#fff6fa;padding:16px 32px 24px;">
      <p style="margin:0 0 8px;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:22px;line-height:28px;font-weight:600;color:#402924;">Headline</p>
      <p style="margin:0 0 12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#402924;">Summary.</p>
      <p style="margin:0 0 4px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:700;color:#402924;">What this means for you</p>
      <p style="margin:0 0 12px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#775d57;">One practical note.</p>
      <a href="https://example.com/source" style="font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;font-weight:600;color:#ee2c9b;text-decoration:underline;">Source</a>
    </td>
  </tr>
  <tr>
    <td height="16" bgcolor="#fbf5f2" style="height:16px;background:#fbf5f2;font-size:0;line-height:16px;">&nbsp;</td>
  </tr>
</table>
```
