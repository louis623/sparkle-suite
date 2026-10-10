# Flyer font licenses

Build 1 bundles only SIL Open Font License 1.1 fonts. Each family lives in `lib/workspace/card-qr/fonts/<family>/` with that family's `OFL.txt` beside the font file. Files were fetched from `github.com/google/fonts` (`ofl/<family>/`).

| Family | File | License | Source |
| --- | --- | --- | --- |
| Playfair Display | `PlayfairDisplay[wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/playfairdisplay |
| DM Sans | `DMSans[opsz,wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/dmsans |
| Italiana | `Italiana-Regular.ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/italiana |
| Inter | `Inter[opsz,wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/inter |
| Great Vibes | `GreatVibes-Regular.ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/greatvibes |
| Cormorant Garamond | `CormorantGaramond[wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/cormorantgaramond |
| Lato | `Lato-Regular.ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/lato |
| Nunito | `Nunito[wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/nunito |
| Bitter | `Bitter[wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/bitter |
| Archivo | `Archivo[wdth,wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/archivo |
| Gelasio | `Gelasio[wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/gelasio |
| Arimo | `Arimo[wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/arimo |
| Noto Sans | `NotoSans[wdth,wght].ttf` | OFL 1.1 | https://github.com/google/fonts/tree/main/ofl/notosans |

Gelasio stands in for Georgia and Arimo stands in for Arial (Halloween Pumpkin and Cat). Those Microsoft faces are not bundled. Noto Sans is the fallback for characters the theme font does not have.

## Fontshare fonts are not included

Boska, Switzer, Melodrama, Sharpie, and Ranade are Fontshare faces. Their ITF Free Font License v2.0 (17 Aug 2026) forbids putting the files in a repository or on public servers, and forbids serving them through a SaaS or design tool where third parties generate content. This repo is public, and the flyer generator does that. Those files are not in the repo and are not served.

Themes that name those faces use OFL look-alikes, recorded in `FLYER_FONT_SUBSTITUTES` for Louis to judge at Build 4:

| Theme font | Flyer stand-in |
| --- | --- |
| Boska | Cormorant Garamond |
| Switzer | Inter |
| Melodrama | Playfair Display |
| Sharpie | Great Vibes |
| Ranade | DM Sans |

Customer sites that load the same Fontshare fonts in the browser are outside this build.
