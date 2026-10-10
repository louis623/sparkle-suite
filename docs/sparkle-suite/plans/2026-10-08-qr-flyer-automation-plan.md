# Plan: automatic QR flyer for Workspace → Cards & QR

**Status: Louis answered the open questions (t1773u, 7:20 PM ET). Build 1 is approved to start. Builds 2–9 still wait for Louis's look at each step.**
First written Thu Oct 8, 2026, 7:00 PM ET. Updated 7:22 PM ET with Louis's answers (section 12) and the font license check (section 7).

**Sources used**
- Louis's messages t1763u–t1772u. The parent agent dates them Oct 8, 2026, 6:50–6:57 PM ET. They are quoted word for word in the Appendix and in "What Louis decided." I copied the quotes from the conversation text handed to me. I did not have a transcript tool, so I could not check each timestamp myself.
- Audit: `cloud-agent-artifacts/bc-3570a605-.../qr-flyer-audit/FINDINGS.md`. It covers branch `cursor/smoke-card-qr-flyer-1376` at commit `9d43b81`.
- Reference flyers: `/workspace/flyer-audit-refs/` and `past-flyers/INDEX.md`.
- Repo: `louis623/sparkle-suite`, PR #75. Through GitHub I confirmed the PR is open, still a draft, not merged, with head `9d43b81decbe5c009c103a356096aded09363347`. I read the theme list and artwork from a read-only checkout at that same commit.

**Rules for every step:** Smoke only. Live stays untouched. PR #75 is not merged. One build at a time. Nothing goes to reps until Louis signs off.

---

## 1. Goal, in plain English

A rep taps one button and gets a finished, good-looking QR flyer. It is a 1080 × 1920 portrait image sized for TikTok and Instagram stories.

- **It looks like the rep's site today.** The flyer always uses whatever theme (skin) the rep's site has on right now. The rep never picks a style.
- **We design each theme's flyer once, ahead of time.** The tool only drops in what belongs to that rep: the QR code, show name, tagline, website, and first name.
- **The artwork wraps around the QR.** It fills the whole flyer the way Kim's gnome flyer and Kelly's butterfly flyer do. It is never a picture strip across the top with a plain block underneath.
- **The preview is the real file.** What the rep sees on screen is the exact image they download.
- **The QR always scans.** It is checked by a machine before the file is handed over.
- **The rep picks the file type, JPG or PNG.** That is the only choice in this first version.

## 2. What Louis decided (word for word)

| # | Decision | Louis's exact words (message) |
|---|---|---|
| 1 | The preview failed. Both the flyer and business card previews must show what you'll actually get. | "The preview isn't a real flyer. The preview wasn't fine. The preview sucked. Just in the preview, the business card sucks too. Doesn't give you any idea of what your flyer or business card is going to look like." (t1763u) |
| 2 | Kelly's flyer is a guide for quality and content only. Don't copy it for anyone else. | "And as far as Kelly's flyer, yes, that's custom-made, and we shouldn't be making that one for anybody else. I'm just giving you an idea of what the flyers should look like and the information they should contain" (t1763u) |
| 3 | The flyer should be automatic, with very little work for the rep. | "Really, this should be fairly automatic, what we're building here, and the rep shouldn't have to do a whole lot." (t1763u) |
| 4 | Custom-theme reps keep the flyers we already hand-made. Switching to a shared theme gives a matching flyer, and the custom one is parked until they switch back. | "For custom themes, we've already built flyers for them, so those are good. What happens when Lindsey wants to switch to Halloween and she wants a Halloween QR code flyer to match? She should be able to build that out real quick and just shelve her custom one until she's done using the new Halloween one, when she can bring back her older one." (t1763u) |
| 5 | New custom flyers are still made by hand. | "I'm not worried about custom ones being made because we can make those by hand as we get new reps or as requested." (t1763u) |
| 6 | Each shared theme gets one universal flyer background, and the rep's info is laid on top. | "As far as the community shared sites, we need to make a universal flyer background that'll match it. It'll just overlay the information for the rep and their show and things like that." (t1763u) |
| 7 | Possibly a few small tweaks (closed: none in v1, section 12) | "Maybe they have a few options that they can tweak manually right then and there, which is kind of what I was thinking." (t1763u) and "Maybe we can add some custom choices down the road if they wanted to add something else to the flyer." (t1768u) |
| 8 | Themes with no artwork get a simpler theme-based flyer. Track them so each is upgraded when art arrives, or removed if it never does. No deadline. | "Themes with no artwork should just have a simpler one that's based off of that theme, and then we can upgrade it once there's artwork on that. Make a process for that, identifying that, or however you want to track it. Eventually, all of them will have artwork, or they will be removed if they don't get artwork. But I don't have a time frame on all of that, so" (t1763u) |
| 9 | Offer both JPG and PNG, and let the rep pick. | "Yeah, we can offer both JPEG and PNG. Maybe they should have the option to pick." (t1765u) |
| 10 | No style choice. Always match the current theme. Smoke test every theme first. | "Let's make this simple. It should always match their current site. Whatever theme they have currently picked, that's what it should match. Don't give them any choice on that. We'll just make sure that all these look good and smoke test them beforehand." (t1767u) |
| 11 | One designed flyer per theme, with the rep's details dropped in. | "We are just building out a flyer for every theme, and then it's just transposing the rep's QR code, their show name, and whatever information is individual for their show versus somebody else's." (t1768u) |
| 12 | No-art themes still look like their theme, not like white paper. | "Just make it look like their theme. If it doesn't have any artwork, it can still look like their theme. Their theme has colors and all that. It's not like it's a white piece of paper." (t1769u) |
| 13 | The art wraps around the QR, never a hero strip on top. Rework the art as needed. | "it shouldn't be like a hero section at the top and then anything behind. You see how the artwork kind of wraps around the QR code, so we might have to redo some of this. Take this artwork and modify it for this or something like that, but I don't want just a piece of the artwork at the top." (t1770u) |
| 14 | Later: an animated QR video. Now: the automatic still flyer. | "what if we did a QR video versus a flyer? … At the very least, maybe log it for later … For now, I just want to get an automation up for QR flyers, and we can improve on it later." (t1771u; the "…" marks are cuts, and the full text is in the Appendix) |
| 15 | Later: business cards with a front and back, where the rep checks the fields they want. | "the business card is going to be fairly similar, except it's going to have a front and back, so that'll be different. The rep should have choices. Maybe they go down and check every type of thing that they want on there, and then it adds it to the business card." (t1772u) |

On the Halloween and Classic ivory buttons: Louis said "I dropped them" (t1765u). The code at `9d43b81` still has all three style buttons, "Match my site," "Halloween," and "Classic ivory," in `lib/workspace/card-qr/design.ts` (`CARD_QR_TEMPLATES`). The PR #75 description also says the flyer templates "stay." Build 1 removes them.

## 3. What the rep sees, step by step

1. **Open the tool.** Workspace → Tools → QR codes, QR flyers, business cards → the **QR flyer** section.
2. **See the real flyer right away.** The section shows a scaled-down copy of the exact file the server just made from the theme the site has on right now. A short line under it names the theme, for example "Matches your site theme: Halloween Pumpkin and Cat." There is no style picker.
3. **Pick the file type.** Two buttons: **JPG** (best for texting and posting from a phone) and **PNG** (full quality). JPG is the default. Kelly's flyer is posted as a JPG today.
4. **Tap Download.** The rep gets that same file, either `<show-name>-qr-flyer.jpg` or `.png`.
5. **If the QR fails its check, there is no download.** The rep sees a plain message: "We couldn't make a flyer that scans right. We've been notified." The failure is logged so we can fix it.
6. **Reps on their own custom theme** see their hand-made flyer in the same spot, with the same download buttons. If theirs isn't finished yet, they see a clear "Your flyer is being built" state instead, with no placeholder flyer (see section 8).
7. **Reps who switch themes** don't do anything. The next time they open the tool, the flyer already matches the new theme.

The rep types nothing. Everything comes from their account and site settings.

## 4. The theme inventory (all 19 themes in code at `9d43b81`)

The theme list (`AMETHYST_APPEARANCE_PRESET_IDS` in `lib/amethyst/appearance-presets.ts`) has **19** themes. The audit said 20. This count comes from the code itself. "Shared" means the theme is marked `visibility: 'community'`. "Art" means pictures exist in `public/amethyst/skins/<folder>/`.

### Shared themes (any rep can pick these): 14 live and 1 retired

| # | Theme (id, code) | Art? | Art on disk (pixel size) | Fonts (heading / body) |
|---|---|---|---|---|
| 1 | Chasing Unicorns / Amethyst (`amethyst`, AM-01) | **Art** | `am01-unicorn/hero-poster.webp` 1310×704, `opening-poster.webp`, motion video | Italiana / Inter |
| 2 | Halloween Pumpkin and Cat (`halloween_pumpkin_cat`, HPC-01) | **Art** | `hero-desktop.webp` 1672×941, `hero-mobile.webp` 1254×1254, motion video | Georgia / Arial |
| 3 | Halloween Pumpkin and Witch (`halloween_pumpkin_witch`, HPW-01) | **Art** | `hero-desktop.webp` 1672×941, `hero-mobile.webp` 836×471, `witch.webp` cut-out 1659×948, `bats.webp` 1774×887 | Playfair Display / DM Sans |
| 4 | The Golden Leaves of Autumn (`gilded_autumn`, GA-01) | **Art** | `hero-poster.webp` 1204×764, motion video | Playfair Display / DM Sans |
| 5 | Midnight Rose (`midnight_rose`, RG-02) | **Art** | `hero-poster.webp` 1280×720, loop video | Playfair Display / DM Sans |
| 6 | Pearl Rose (`pearl_rose`, RG-03) | **Art** | `hero-poster.webp` 1280×720, loop video | Playfair Display / DM Sans |
| 7 | Rose Champagne (`rose_champagne`, RG-04) | **Art** | `hero-poster.webp` 1280×720, loop video | Playfair Display / DM Sans |
| 8 | Sparkle Suite/Morganite (`sparkle_suite_morganite`, SS-01), also the default theme | No art | None | Playfair Display / DM Sans |
| 9 | Moonstone (`moonstone`, MS-01) | No art | None | Playfair Display / DM Sans |
| 10 | Emerald Garden (`emerald_garden`, EG-01) | No art | None | Great Vibes or Cormorant Garamond / Lato |
| 11 | Rose Gold (`rose_gold`, RG-01) | No art | None | Playfair Display / DM Sans |
| 12 | Garnet (`garnet`, GN-01) | No art | None | Boska / Switzer |
| 13 | Amber (`amber`, AB-01) | No art | None | Melodrama / Nunito |
| 14 | Velvet (`velvet`, VE-01) | No art | None | Bitter / Archivo |
| — | Rose Quartz (`rose_quartz`, RQ-01). Retired (`selectable: false`), hidden from pickers, but saved sites keep it | No art | None | Sharpie / Ranade |

### Private custom themes (one rep each): these get hand-made flyers

| Theme (id, code) | Owner | Art? | Hand-made flyer on file? |
|---|---|---|---|
| Neon Butterfly (`neon_butterfly`, NB-01) | Kelly (Sparkly Butterflies) | Art: `kelly-studio-mobile.webp` 900×1600 and three neon signs | **Yes.** 1080×1920 PNG and JPG in repo `artifacts/social/kelly-sparkly-butterflies-qr-flyer/` |
| Gnome Forest (`gnome_garden`, GG-01) | Kim (Go For The Bling), per the audit. The code only says "Private custom skin" | Art: `storybook-original.webp` 768×1365, forest, gnome and lantern cut-outs | **Yes, but not in Git.** 1080×1920 JPG from the Sep 4 email. The repo folder was never committed, so the only copy is on the box: `flyer-audit-refs/past-flyers/kim-goforthebling-gnome-storybook-v3.jpg` |
| Alpine Opal (`alpine_opal`, AO-01) | Lindsey (Mile High Fizz) | No art | **Partly.** The Feb 17 Mile High Fizz flyer is **1080×1350 (4:5)**, not 1080×1920, and the aurora picture is not Alpine Opal art (answered in section 12). Per the audit, Lindsey's site is on Halloween Pumpkin and Witch today |
| Black Diamond (`black_diamond`, BD-01) | Brittany | No art | **Not found.** It is in a Google Drive folder we can't reach (answered in section 12) |

**What this means for the work:**
- **7 shared themes have art** and need a designed flyer background (a "flyer plate"). Almost all of that art is wide and short (landscape, about 1280×720 to 1672×941). Cutting a 1080×1920 portrait out of a 720-pixel-tall picture leaves a slice only about 405 pixels wide, so the result would be blurry and mostly empty. So, as Louis said in t1770u, each plate has to be **rebuilt as a tall layout** around a center window for the QR. That means extending the scene and moving the characters (the cat, the witch, the unicorn, the trees) to wrap the QR, not cropping.
- **7 shared themes have no art** and get the simpler theme design (section 5B). Rose Quartz is retired, so it gets a simple flyer only if a site still uses it. A read-only database check during the build will answer that.
- **Kelly's and Kim's** custom flyers already exist. **Lindsey's and Brittany's** are handled per section 12 (Brittany shows "being built"; Lindsey is confirmed at Build 8).
- **Heather:** no theme in the code is tied to her by name. The past-flyer search found only her Bling Kitchen branding board, not a QR flyer (answered in section 12).

## 5. How each theme's flyer design is made and stored

Every theme gets **one theme flyer design record** (a theme flyer spec). It is a small data entry in the repo, for example `lib/workspace/card-qr/flyer-themes.ts`, plus its image files. The record holds:

- **Plate:** the 1080×1920 background image with no words on it. Shared themes with art keep it in `public/amethyst/skins/<folder>/flyer/plate.webp`.
- **Status:** `art`, `simple` (no art yet), `custom` (hand-made per rep), or `retired`.
- **Panel style** around the info: glass (frosted, like Kelly's), parchment (like Kim's), or paper. Picked from the theme's own surface note. For example, Gnome is "parchment cards," Neon Butterfly is "plum glass," and Pumpkin and Cat is "warm black cards."
- **Colors** from the theme's swatches: text color, the scan-pill color, the QR frame gradient, and glow and sparkle colors.
- **Fonts:** the theme's heading font for the show name and its body font for everything else, as real font files (section 7).
- **Placed extras (optional):** cut-outs already in the repo, such as the gnome and lantern for Gnome Forest, the witch and bats for HPW, or Kelly's signs. Each one sits at a fixed spot outside the info area.
- **Approval:** who approved it and when (Louis), and whether it passed the Smoke test.

### A. Themes with art: the "flyer plate"

1. Start from that theme's existing art.
2. Rebuild it as a portrait scene at 1080×1920 or larger. The art runs around all four sides of a calm center window where the QR card sits. The characters frame the QR: for example, the cat and pumpkin below it, the witch and bats flying across the top corners, the unicorn beside it. Louis wants modified art here, not a crop.
3. Leave the center window quiet enough that text stays readable. The panel (glass or parchment) adds more contrast on top of that.
4. Keep the top 250 pixels and the bottom 385 pixels as art only (section 6).
5. **Proof for Louis:** the plate with Dude's Fizzfest info on top, at full size. Once Louis approves it, the plate is committed to the PR #75 branch.

The plate is made once per theme. Reps never touch it. The tool only lays text and the QR over it.

### B. Themes without art: the "simple" design

It is still clearly that theme (t1769u: "It's not like it's a white piece of paper"):

- A full-bleed **background built from the theme's colors**: a deep gradient using its ground and primary swatches, a soft glow behind the QR in its accent color, and light texture and sparkle in its accent. Example: Garnet would be a blush shell ground with deep red glow, Velvet an orchid wash with violet depth, Moonstone charcoal-violet with silver.
- The theme's own **panel style** from its surface note, its **heading font** for the show name, and its **colors** for the pill and QR frame.
- Same fixed layout and the same QR rules as the art themes.
- It is drawn by the same code from the design record, so there is no image file to keep.

### C. Custom themes: hand-made files

There is no generated design. The record points to that rep's approved hand-made file(s), stored in Git under `artifacts/social/<rep>-qr-flyer/`, the folder already used for Kelly. That folder also keeps the build source and the QR check results, as the existing `artifacts/social/QR-FLYER-INDEX.md` requires.

### Safety net

An automated test (unit test) fails the build if any theme in the theme list has no design record. A new theme then cannot reach reps without a flyer.

## 6. The fixed info layout and safe zones

Canvas: **1080 × 1920**. The same slots apply to every theme. Only the plate, colors, fonts, and panel style change.

**Keep-out areas (from the locked rule):**
- **Top 0–250 px:** art only. TikTok and Instagram put the profile and caption there.
- **Bottom 1535–1920 px (the bottom 385):** art only. This is the stricter of the 250–385 range, used everywhere.
- **Sides:** text and the QR stay between x = 72 and x = 1008. Each line is measured before drawing and is shrunk or wrapped if it would cross that line. The audit found the social line running off the right edge, and this prevents that.

**Info slots, top to bottom.** These pixel numbers are starting values. Build 3 will fine-tune them on the real proofs.

| Slot | Approx. y range | What goes there | Rules |
|---|---|---|---|
| Show name | 270–480 | Business (show) name, big, in the theme's heading font | Shrinks to fit, from about 110 px down to 64 px, in 1–2 lines. Never cut off |
| Tagline | 490–570 | The tagline already saved on the site | Body font, 34–40 px, up to 2 lines. If there is no tagline, the slot closes up |
| Scan pill | 595–655 | **SCAN TO SHOP** in a theme-colored pill (like Kelly's) | Fixed wording |
| QR card | 670–1230 | White pad with the QR inside a theme-colored frame (section 7) | About 560 px square including the quiet zone |
| Save-for-later | 1255–1400 | "Screenshot this flyer and open it in Photos. Then press and hold the QR code." | All three reference flyers have this |
| Website + sign-off | 1415–1525 | The website in CAPITALS (for example `SPARKLYBUTTERFLIES.COM`), then "Shop with {first name} anytime" in smaller italic | Kim's only note on her flyer was "We should put website on there" (from the audit). **No custom domain means no website line (locked, t1773u).** The slot closes up and the QR carries the address |

**Left off on purpose (per the audit):** email, raw social links, the "Facebook VIP" label, and the stray "Sparkle Suite" line. None of the reference flyers print an email, and the raw links ran off the page.

## 7. Technical rules

### QR (the code itself)
- **Dark on white, always.** Near-black squares (modules) on a pure white pad, on every theme, dark ones included. Today dark themes flip the code to light-on-dark, and a decoder told not to invert could not read it (audit).
- **High error correction (level H)**, so it still scans if a corner is smudged or covered.
- **A wide quiet zone** of at least 4 squares of white around the code. The theme's color frame sits outside that white margin, never inside it.
- **Size:** about 560 px including the quiet zone, the same as today.
- **QR address:** the site address the server builds from the rep's account (custom domain if they have one, otherwise their Suite link). It never comes from the browser.
- **Decode check before the file is returned:** the server reads the QR back out of the finished PNG **and** the JPG with an off-the-shelf QR reader (QR decoder library), with inversion turned **off**. If the result is not exactly the rep's current site address, there is no download, and the rep sees the message from section 3. This is the same check Kelly's build script already does. Hand-made custom flyers get the same check (section 8).

### The theme comes from the server
Today the browser tells the server which theme to use, and if it doesn't, the server silently falls back to Morganite. That may be how Louis got the pink sheet on Oct 7 (audit). In the new version the server reads the theme from the rep's saved site settings itself. If the theme is unknown, it shows an error. It never silently uses Morganite.

### Embedded fonts (fixing the empty boxes)
- The letters turned into empty boxes (tofu) on Smoke because the drawing asked for "Georgia," which the Smoke server doesn't have. Fix: **every font is a file bundled with the app, and text is drawn from that file, never by font name.**
- Font files are needed for: Playfair Display, DM Sans, Italiana, Inter, Great Vibes, Cormorant Garamond, Lato, Boska, Switzer, Melodrama, Nunito, Bitter, Archivo, and, only if Rose Quartz is still in use, Sharpie and Ranade.
- **Georgia and Arial** (Pumpkin and Cat) are Microsoft fonts we can't bundle. Use free look-alikes with the same letter widths: Gelasio for Georgia and Arimo for Arial. The difference is very hard to see.
- **License check (done Oct 8, about 7:15 PM ET):**
  - **Google fonts are OK to bundle.** Playfair Display, DM Sans, Italiana, Inter, Great Vibes, Cormorant Garamond, Lato, Nunito, Bitter, Archivo, Gelasio, Arimo, and Noto are all under the SIL Open Font License 1.1, which allows bundling and embedding. Arimo was re-released under OFL in April 2026 (google/fonts commit `3feb9f2`). Each bundled font ships with its `OFL.txt` next to it.
  - **Fontshare fonts can NOT be bundled.** Boska, Switzer, Melodrama, Sharpie, and Ranade come under the ITF Free Font License (FFL) **v2.0, dated 17 Aug 2026**. I read the `License/FFL.txt` inside the Boska download. Section 02 forbids making the font files available through "publicly accessible servers" or a "repository," and the `sparkle-suite` repo is **public**. It also forbids serving the font through "any … SaaS platform, design tool, template editor or similar service" that lets "third-party users … generate their own content." That describes a rep flyer generator. Subsetting and format conversion are also forbidden.
  - **So:** Garnet, Amber, Velvet, and Rose Quartz get the closest OFL look-alike for their flyer text, recorded in each theme's design record. Louis eyeballs them at Build 4.
  - **Flag for Louis, outside the flyer:** the customer sites load these same Fontshare fonts in reps' browsers today. Under the new v2.0 wording that may also be a problem. It is not touched by this build. It's logged for a separate decision.
- **Unusual characters:** show names can contain apostrophes, accents, "&," or emoji. A bundled backup font (Noto) covers characters the theme font lacks. Before the file is returned, a check confirms every character in the text has a glyph. If one doesn't, that character is left out instead of drawn as a box.
- **Test:** the render test runs on a machine with **no system fonts installed**. That reproduces the Smoke problem, so a missing font fails the test instead of slipping through.

### Preview equals the real export
- The preview on the page **is the server's file**, scaled down by the browser. There is no separate HTML sketch anymore.
- The server draws the image once. PNG and JPG are both encoded from those same pixels (JPG at quality 94, matching Kelly's), and both pass the decode check.
- The preview shows the format the rep picked. The Download button hands over those exact same bytes. Each file is fingerprinted (a hash), and the Smoke test confirms the fingerprints match.
- The preview is shown big enough to read. On a phone it fills the width of the section, unlike today's 220-pixel thumbnail.
- The same "preview = real file" rule carries over to business cards when that round starts, since Louis also flagged the card preview (t1763u).

## 8. Park and restore for custom flyers

How it works (no extra buttons, because of t1767u "Don't give them any choice on that"):

- **Lindsey's case:** while her site is on her custom theme, the tool shows and downloads her hand-made flyer. When she switches her site to Halloween Pumpkin and Witch, the tool shows the HPW flyer with her details. Her custom flyer is **parked**: kept, not shown, never deleted. A small note says "Your custom flyer is parked. It comes back when your site is back on Alpine Opal." When she switches her site back, her custom flyer comes back automatically.
- **No database change is needed.** Which flyer to show depends only on which theme the site has on right now.
- **QR safety:** a hand-made flyer's QR is decoded when we file it, and again at every download, against the rep's **current** site address. If her address changed (for example, she got a custom domain), the download is blocked, she sees "Your custom flyer needs an update," and it goes on Louis's list to redo by hand.
- **A custom-theme rep with no hand-made flyer yet** sees a clear "Your flyer is being built" (in progress) state, with **no placeholder flyer and no download** (locked, t1773u). That rep is listed on the tracker (section 9).
- **Where custom flyers come from (locked, t1773u):** they are made by hand in the rep meeting and handed over with the site. We use the existing example flyers. No new ones are being supplied.

## 9. How the no-art themes are tracked

Louis asked for a process (t1763u). Here it is:

1. **Tracked in the code.** Each theme's design record has `status: art | simple | custom | retired`. That record decides what gets drawn, so the tracker can't drift from what reps actually see.
2. **One tracker page in Git**, `docs/sparkle-suite/card-qr/flyer-art-tracker.md`, listing every theme with its status, the date it went simple, art requested (yes/no), upgraded date, or retired date. It also lists custom reps without a hand-made flyer, and custom flyers that failed the QR check.
3. **An automatic flag when art shows up.** A repo test warns when a `simple` theme gains a hero image under `public/amethyst/skins/`. That means "art exists now, make the flyer plate." It also fails if a theme has no record at all.
4. **Upgrading:** make the plate (section 5A), get Louis's proof approval, switch the status to `art`, and Smoke test that theme.
5. **Removing:** if Louis decides a theme will never get art, it is retired the same way Rose Quartz already is (`selectable: false`, hidden from pickers, saved sites keep working). Its status becomes `retired`.
6. **No deadline**, per Louis ("I don't have a time frame on all of that"). The tracker is reviewed whenever new art lands or Louis asks.

Starting list for the tracker: **simple** = Morganite, Moonstone, Emerald Garden, Rose Gold, Garnet, Amber, Velvet, and Rose Quartz only if still in use. **Custom flyer status:** Kelly is on file. Kim is on file but must be committed to Git. Brittany (Black Diamond) has no file we can reach, so she shows "being built." Lindsey (Alpine Opal) has only the 4:5 Mile High Fizz file (see the note in section 12).

## 10. Smoke test checklist (every theme, before reps see anything)

All of this runs on **Suite Smoke** (`sparkle-suite-smoke.vercel.app`, Smoke database `pukemqiwlyqmyytxkdmo`) with the Dude's Fizzfest test account and, where needed, a second test account. Theme switches happen on Smoke data only.

**For each of the 14 shared themes (plus Rose Quartz if in use):**
- [ ] Switch the test site to the theme. The flyer section changes with no picker shown.
- [ ] The preview loads, and its fingerprint matches the downloaded file (JPG and PNG each).
- [ ] Both files are exactly 1080 × 1920.
- [ ] No empty boxes. Every word draws in the theme's font.
- [ ] The QR decodes, with inversion off, to the exact site address in **both** files.
- [ ] A real phone scans it: (a) pointing the camera at a screen; (b) screenshot, open in Photos, press and hold, on iPhone and Android.
- [ ] Safe-zone overlay: a script lays the 250 px top and 385 px bottom bands plus the side margins over the image. Only art may sit inside them.
- [ ] Contrast: small text is at least 4.5:1 against the pixels actually behind it.
- [ ] It looks like the theme: side by side with that theme's site homepage.
- [ ] Art themes: the art wraps around the QR, with no top-strip hero and no blurry upscaling.
- [ ] Simple themes: clearly the theme's colors and fonts, not plain paper.

**Hard cases, run on at least one light and one dark theme:**
- [ ] A long show name (40+ characters), and one with an apostrophe, accent, "&," and emoji.
- [ ] A long tagline, and no tagline.
- [ ] With a custom domain, and with no custom domain (no website line, per section 12).
- [ ] A forced bad QR, to confirm the download is refused with the friendly message.

**Custom flyers:**
- [ ] On the custom theme, the hand-made flyer is shown and downloads in JPG and PNG.
- [ ] After switching to a shared theme, that theme's flyer shows, plus the "parked" note.
- [ ] After switching back, the custom flyer returns.
- [ ] Changing the test site's address blocks the custom download with "needs an update."

**Sign-off:**
- [ ] A contact sheet with every theme's flyer, rendered with Dude's info, is sent to Louis for approval in chat.
- [ ] Live stays untouched: no deploy to the live `sparkle-suite` project, no live database change, and PR #75 still unmerged.

## 11. Build order (small, one at a time, each on Smoke and shown to Louis)

Each build goes on the PR #75 branch (`cursor/smoke-card-qr-flyer-1376`), is deployed to Suite Smoke only, and waits for Louis's look before the next one starts.

| Build | What it does | What Louis sees |
|---|---|---|
| **0** | This plan | Approve or change it |
| **1. Letters and QR you can trust** | Bundled **OFL** fonts only (license check done, section 7). Text drawn from font files. QR dark on white with level H, a wide quiet zone, and the decode check. The server reads the theme itself, with no Morganite fallback. Remove the Match my site / Halloween / Classic ivory buttons | A Dude's flyer on Smoke with real words and a QR that scans. The old plain layout is still in place for now |
| **2. Preview = real file, plus JPG/PNG** | The preview is the server image. JPG/PNG picker. One render feeds both formats, with fingerprint matching | The on-screen flyer is exactly what downloads |
| **3. The fixed layout** | Show name, tagline, scan pill, QR card, save-for-later, website and sign-off, in the safe zones, with measure-and-fit text. Email and raw socials dropped. Uses the simple design so the layout can be judged by itself | The real info layout on 2 themes (one light, one dark) |
| **4. Simple designs plus the tracker** | Design records for all themes. Simple designs for the 7 no-art shared themes. Tracker page. The "every theme has a record" test | 7 simple flyers on a contact sheet |
| **5. First art plate: Halloween Pumpkin and Cat** | Rebuild the cat art as a portrait plate wrapped around the QR. It goes first because Dude's is on it and Halloween is Oct 31 | One full proof, then the Smoke flyer. This sets the bar for the rest |
| **6. Second art plate: Halloween Pumpkin and Witch** | Same process, using the witch and bats cut-outs | Proof, then Smoke |
| **7. Remaining art plates** | Chasing Unicorns, Golden Leaves of Autumn, Midnight Rose, Pearl Rose, Rose Champagne. Each proof is approved one by one. They can go to Smoke together once all are approved | Proofs, then Smoke |
| **8. Custom flyers: park and restore** | Hook up Kelly's and Kim's hand-made files (Kim's committed to Git first). Parked note. QR check on custom files. Lindsey and Brittany per section 12 | The switch-away and switch-back test on a test account |
| **9. Full Smoke pass** | Run all of section 10 and make the contact sheet | Final sign-off |
| **Live** | **Not part of this plan.** Only when Louis says go | — |

## 12. Louis's answers (t1773u, Oct 8, 7:20 PM ET). Open questions closed

> **Louis, t1773u (Oct 8, 2026, 7:20 PM ET), word for word:**
>
> "Don't know what those tweaks would be right now, so for now, there should be none. We can add them as we play with this and figure it out. Reps without a custom domain: we could just leave it off, and it could just be the QR code flyer. Tagline and show title. I'm a little bit tied up right now, so please do without the other ones. Just use the examples you have, and we'll eventually work to get them all in one spot. As far as all the custom flyers. There should definitely be something to signify that the flyer is being built or is in progress, not just hope and pray that something shows up eventually. I don't want to put something there that's not really going to be the flyer, and that's for while the flyer is being built. Now, custom flyer: that's all going to be addressed in the meeting with the rep, and they get it when we hand over their Sparkle Suite website with their custom theme. I'm not worried about that when we build a new custom flyer."
>
> The list below is Suite's summary of these answers (not a quote).

Locked answers (parent agent's summary, not Louis's words):

1. **Tweaks in version one:** none. The only rep choice is JPG or PNG. *(Closes Q1.)*
2. **No custom domain:** leave the website line off. *(Closes Q2. See section 6.)*
3. **Words:** the flyer uses the **show title** and the **tagline**, not the ticker. *(Closes Q3.)* The rest of the proposed set ("SCAN TO SHOP," the screenshot instructions, website when there's a custom domain, "Shop with {first name} anytime") was not separately confirmed in the summary. Louis sees it at Build 3.
4. **Custom flyers:** use the existing example flyers, and no new ones will be supplied. A custom-theme rep without a flyer sees a clear "being built / in progress" state with no placeholder. Going forward, custom flyers are made by hand in the rep meeting and handed over with the site. *(Closes Q4.)*
   - Still to confirm at Build 8: whether Lindsey's existing 1080×1350 Mile High Fizz flyer is served as her Alpine Opal custom flyer, or she shows "being built" until a 1080×1920 one is made in her meeting. Heather has no custom theme in code, so nothing changes for her.

## 13. Later ideas (logged, not in this build)

1. **Animated QR video** (t1771u). A short vertical clip where the theme's hero animation keeps moving (cat blink, falling leaves, witch fly-in) while the QR stays perfectly still and scannable in every frame. A screenshot of any frame still works. Several themes already have motion videos (`hero-motion.mp4`, `hero-loop.mp4`) to build from. It needs its own decode check on sampled frames.
2. **Business cards, front and back** (t1772u). Same approach as the flyer, plus a checklist of fields ("check every type of thing that they want on there"), with a preview that is the real print file. The card preview was also called out in t1763u.
3. **Optional rep add-ons and tweaks** (t1768u: "custom choices down the road"; none in v1 per t1773u). Examples: a short @handle, a discount code, a "Text GNOME to…" line like Kim's.
4. **Art for the no-art themes**, from the tracker in section 9.
5. **More sizes** (for example, 4:5 feed posts). Only if Louis asks. 1080×1920 is the locked size.

---

## Appendix: Louis's messages, word for word (t1763u–t1772u; t1773u is in section 12)

Copied exactly from the conversation text handed to me, in order. The parent agent dates them Oct 8, 2026, 6:50–6:57 PM ET.

**t1763u**
> Actually, I'm just taking notes as I read through all this information. On your first response back to me, what went wrong? The preview isn't a real flyer. The preview wasn't fine. The preview sucked. Just in the preview, the business card sucks too. Doesn't give you any idea of what your flyer or business card is going to look like.
>
> And as far as Kelly's flyer, yes, that's custom-made, and we shouldn't be making that one for anybody else. I'm just giving you an idea of what the flyers should look like and the information they should contain, so you can realize what customization we need to do. Really, this should be fairly automatic, what we're building here, and the rep shouldn't have to do a whole lot.
>
> For custom themes, we've already built flyers for them, so those are good. What happens when Lindsey wants to switch to Halloween and she wants a Halloween QR code flyer to match? She should be able to build that out real quick and just shelve her custom one until she's done using the new Halloween one, when she can bring back her older one.
>
> I'm not worried about custom ones being made because we can make those by hand as we get new reps or as requested. As far as the community shared sites, we need to make a universal flyer background that'll match it. It'll just overlay the information for the rep and their show and things like that. Maybe they have a few options that they can tweak manually right then and there, which is kind of what I was thinking. Themes with no artwork should just have a simpler one that's based off of that theme, and then we can upgrade it once there's artwork on that. Make a process for that, identifying that, or however you want to track it. Eventually, all of them will have artwork, or they will be removed if they don't get artwork. But I don't have a time frame on all of that, so

**t1764u**
> Hold up, before you do anything, I'm still answering your questions.

**t1765u**
> When it comes to number 5, your Halloween and classic ivory buttons, I dropped them, so I don't even know what you're trying to refer to there. It's not clicking for me. Yeah, we can offer both JPEG and PNG. Maybe they should have the option to pick.

**t1766u**
> Well, this is that style choice. I'm still not tracking on number 5. I have no idea what you're talking about. I think I know what you're talking about: is that to pick a theme, or is that what the style choices are? I don't understand what choices they have. When you say "called Halloween," that makes no sense. If it's Halloween, they would pick black cat or the witch one, and then it would build it based off of that, right? I'm not even sure why we have style choices at this point, so you're going to have to explain that to me more.

**t1767u**
> Let's make this simple. It should always match their current site. Whatever theme they have currently picked, that's what it should match. Don't give them any choice on that. We'll just make sure that all these look good and smoke test them beforehand.

**t1768u**
> And I'm like, this should be fairly simple. We are just building out a flyer for every theme, and then it's just transposing the rep's QR code, their show name, and whatever information is individual for their show versus somebody else's. Isn't that the best way to do this? Maybe we can add some custom choices down the road if they wanted to add something else to the flyer.

**t1769u**
> Just make it look like their theme. If it doesn't have any artwork, it can still look like their theme. Their theme has colors and all that. It's not like it's a white piece of paper.

**t1770u**
> One other thing, just in case this is the way it was going to go, it shouldn't be like a hero section at the top and then anything behind. You see how the artwork kind of wraps around the QR code, so we might have to redo some of this. Take this artwork and modify it for this or something like that, but I don't want just a piece of the artwork at the top. I think you've seen that in examples.

**t1771u**
> And I had an idea. Maybe we can experiment with it later, but what if we did a QR video versus a flyer? They use these videos in their TikTok feeds and other feeds. If somebody were just to screenshot it, the QR code would still be there, but if the animation still lived on, like it does in the hero section, that could be kind of cool.
>
> Not that we need to do that right now, but I just had that idea. At the very least, maybe log it for later if it's something that might be doable and could add that extra flair. For now, I just want to get an automation up for QR flyers, and we can improve on it later.

**t1772u**
> That's all I got. Unless you need any further information from me to start getting this fixed, I'd say let's build a really good plan now that you know my ideas and preferences.
>
> To be honest, the business card is going to be fairly similar, except it's going to have a front and back, so that'll be different. The rep should have choices. Maybe they go down and check every type of thing that they want on there, and then it adds it to the business card. Getting ahead of ourselves, but I just wanted to fill you full of information so you may proceed.
