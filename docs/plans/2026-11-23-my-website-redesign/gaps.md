# Gaps: what's missing, ranked by value to reps

Only things actually found in the code at `b8fd4646`. Ranked by how much they'd help a rep day to day.

1. **No real theme preview before saving.** The theme is a plain dropdown of names and codes. To see a theme, a rep has to pick it, save (which publishes it to customers), then open the preview. A sample-content preview route (`/skin-preview/...`) already exists for 17 themes, but this page doesn't link it, and it never shows the rep's own name, headline or shows.
2. **No visual theme picker on this page.** No thumbnails, colors or fonts, and no grouping (seasonal vs everyday). There are 19+ themes in one list. A nicer card picker already exists, but only in new-rep Required Setup.
3. **Save is easy to miss and easy to lose.** It's only at the top and isn't sticky, so on a phone it's a long scroll away. There's no "you have unsaved changes" warning on refresh or close, and no Discard/undo. Errors appear at the bottom while the top just says "Changes need attention."
4. **The editor order doesn't match the website.** The editor goes discount → profile → ticker → theme → media → about → socials, while the homepage goes header → hero → shows → what-is → about → signup → footer. Reps can't find "the thing under my headline."
5. **No "where does this show?" cues.** No field says which page or part of the site it changes. "Show name", "Display name", "Site tagline" and "Hero subtitle" are all guesswork.
6. **No "View my site" or site address on the page.** There's no live link, copy-link button or custom-domain display. The only preview is the in-Workspace panel showing the *saved* site.
7. **No setup progress or checklist.** Nothing tells a rep what's missing: store link not set, no portrait, no About story, no socials, empty ticker. The data to compute this is all in the draft already.
8. **No path to the related settings for other parts of the site.** Upcoming shows (Calendar tab), Join page roster and recruiting link (Team Management), and the Dance Floor all show on the customer site but aren't linked from here.
9. **Field-level validation is missing.** Store link and recruiting link errors only come back from the server after Save, with no field highlight or focus. Email has no email type/autocomplete. Save is disabled instead of explaining what's wrong.
10. **"Hero motion" does nothing on standard layouts.** The theme overrides it. It should be removed, or made real and previewable.
11. **Section show/hide switches are hidden under "Announcement messages"** even though they control Dance Floor, Live Lineup and Join Team. They belong in a clear "Pages & sections" group (and on each section's own card).
12. **No share/SEO preview.** There's no control or preview for the link card customers see when the site is shared on Facebook/text (title, description, image).
13. **Team name is edited in two places** (here and Team Management) with separate saves.
14. **Hidden custom-layout trigger.** Mile High Fizz's layout switches on when Email, Show name or Team name match certain text, so editing a text field could change a layout with no warning. This is an engineering cleanup and doesn't need to be visible to reps.
15. **No phone layout help for media.** Video slots are text boxes with no thumbnail or "where it shows" image. The 24–48h queue status is a sentence, not a status chip.

Smaller polish items: three names for the page (Customer-facing site setup / Site Settings / Site setup); internal theme codes shown to reps; a legacy "Make existing links plain text" button that's always there; a load error with no Retry button.
