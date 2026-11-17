# Bundled application fonts

Inter and League Spartan are bundled to keep production and Docker builds
independent of the Google Fonts CSS/download service. `app/layout.tsx` loads
these variable TrueType fonts with `next/font/local`, preserving the existing
CSS variable names and font families. Both files contain normal styles and
weights 100–900. Their SIL Open Font License notices are included alongside them.

Downloaded on 31 October 2026 from the official Google Fonts repository:

| File | Source | SHA-256 |
|---|---|---|
| `Inter-variable.ttf` | [Google Fonts Inter](https://github.com/google/fonts/blob/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf) | `29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031` |
| `LeagueSpartan-variable.ttf` | [Google Fonts League Spartan](https://github.com/google/fonts/blob/main/ofl/leaguespartan/LeagueSpartan%5Bwght%5D.ttf) | `2dbb6290b39ab7c48a40b18f74ca59ef48a69a015c3ea0542703f0c6ce51d617` |

Use the matching `Inter-OFL.txt` and `LeagueSpartan-OFL.txt` when distributing
these assets. No font request is required during the application build.
