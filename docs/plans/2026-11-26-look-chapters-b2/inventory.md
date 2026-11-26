# Look pop-up · what's inside today (must all survive)

Source: PR #235 branch `cursor/socials-phone-preview-583b` @ 99d08540.
- Dialog shell: `app/nic-nac/components/DashboardPlaceholder.tsx` (`<dialog ref={lookRef} … aria-labelledby="site-look-title">`, ~line 10574)
- Body: `settingsBody(['top-bar','hero'])` → `app/nic-nac/components/SiteSettingsBody.tsx` lines ~367–650
- Show-announcements switch: `PublicSiteVisibility.tsx` (`part="announcements"`)
- "Shows on your site" copy: `site-settings-layout.ts` `SHOWS_ON`
- Before shots (Smoke, reviewer "Britt Test Rep", Nov 26): `shots/current-1366.png`, `shots/current-375.png`

## Shell
| # | Control | Behavior |
|---|---|---|
| 1 | Plum band: kicker "Look", title "Look", subtitle "Theme, top bar, and hero" | — |
| 2 | Close (×) | closes dialog, fires `onLookClose` |
| 3 | Footer status line | autosave phase text (saving / "All changes saved" with ✓) |
| 4 | Undo | shows only after a save (`undoReady && saved`), calls `onUndo` |
| 5 | Finished | `form method="dialog"` closes |

## Theme
| 6 | "On your site now" row: theme thumbnail + theme name (e.g. Sparkle Suite/Morganite) | read-only |
| 7 | Change theme button | opens the separate **Choose your theme** dialog (ThemeStudio: filters All/Holiday/Gems/Bomb/General/Yours, season groups, try-on preview of Home / Dance Floor / Join, owned private skins, tap = applies right away, Undo, retry on error). Not redesigned here; every concept keeps a "Change theme / See all themes" entry into it. |

## Top bar (section "Your name, store link, and announcements")
| 8 | Business name | text, autocomplete organization · Shows on: "The name at the top of every page" |
| 9 | Your first name | text, autocomplete given-name · Shows on: "Your name in the hero, About, and Join" |
| 10 | Bomb Party rep store link | url input, placeholder `https://bombparty.com/...`, hint "This powers the Shop buttons…", **validates on blur** with inline error (`shopLinkFieldError`) · Shows on: "Every Shop button on your site" |
| 11 | Announcement ticker messages | textarea, **one announcement per line**, no maxLength in UI · helper "Use one announcement per line. Add emojis, then highlight only the words you want to link." · Shows on: "The scrolling announcements at the top of your site" |
| 12 | Add an emoji | 8 buttons today: ✨ 💎 🎥 🛍️ 🎉 📣 ⏰ 💖 · **inserts at the cursor / replaces the selection** in the ticker, then refocuses and puts the caret after the emoji |
| 13 | Link selected words | rep highlights words in the ticker → hint shows `Ready to link: "…"` (else "Highlight the exact words in your announcement first.") · URL field "Paste the destination link" · button disabled until words + URL · writes `[words](https://url)` · error line on bad URL / no selection |
| 14 | Make existing links plain text | only when old links exist; with explainer line ("This fixes an older ticker link…") |
| 15 | Show announcements switch | On/Off, `tickerVisible` · "Show your scrolling announcement messages." · Shows on: "The announcements bar at the top of your site" |

## Hero (section "The headline customers see first")
| 16 | Big headline | text, **maxLength 180** · "This is the large heading customers see first on your homepage." · Shows on: "The big headline on your homepage" |
| 17 | Line under the headline | text, **maxLength 240** · Shows on: "The line under your headline" |
| 18 | Socials in the hero | read-only: "Showing in the hero: Instagram, TikTok…" or "No social buttons are set to show in the hero yet." (set in Socials and Contact Info) · Shows on: "Hero buttons" |
| 19 | Hero motion — 3 modes by `heroMotionMode` | `choices`: Sparkle rise / Soft glow / Still + note "Hero visuals stay curated by your site appearance…" · `switch`: Hero animation On/Off (remembers last motion, defaults Sparkle rise) · `theme`: read-only "Your theme sets the hero animation." · Shows on: "Your hero animation" |

## Cross-cutting
- Autosave on every change (draft → save bar), Undo, field announcements via aria-live.
- Every field has a "Shows on your site: …" line (`data-shows-on`).
- `data-site-field` / `data-site-control` hooks are used by tests and the Nic-Nac assistant (`update-site-setting` tool: heroTitle ≤180, heroSubtitle ≤240, heroAnimationType still|sparkle_rise|soft_glow) — keep the same field names.
- No migration needed for any concept: the emoji library is a front-end list; ticker stays plain text with `[words](url)` links.
