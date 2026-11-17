# Disease intensity vs units of disease-linked medicines, 12 November 2026

One pre-registered test under decision 016 (DOH-derived DII approved for analysis). Offline and read-only. Design, keyword
links and pass rule are in the `run.py` docstring, fixed before running (hash in `results.json`). DII snapshot:
`dii_snapshot.json` (release `5df98130b9ec13ef`; dengue, typhoid, leptospirosis, cholera; 7 territories; 2018–2025).

## Result: not testable on current data

| Disease | Territory-months with linked units | Required | Outcome |
|---|---|---|---|
| Dengue (IV fluids, paracetamol) | 4 of 652 | 60 | Insufficient |
| Typhoid (generic antibiotics) | 0 of 546 | 60 | Insufficient |
| Leptospirosis (doxycycline, penicillin, ampicillin, ceftriaxone) | 0 of 467 | 60 | Insufficient |
| Cholera (ORS, IV fluids) | 0 of 96 | 60 | Insufficient |

No association could be estimated, so none is claimed in either direction.

## Why

1. **Medicines are recorded by brand.** Only a few labels carry a generic name the keywords can match (dengue 22 labels,
   typhoid 7, leptospirosis 6, cholera 19, across all channels), totalling about ₱0.05–0.52M per disease out of ₱638M.
2. **Those sales go to channels with no location.** Of the dengue-linked ₱520,045, ₱399,294 went to GOVERNMENT and
   ₱90,835 to HOSPITAL; only ₱27,237 went to a mapped territory. Leptospirosis-linked sales were all GOVERNMENT.

## What would make the test possible

- **Generic names for brand labels** (the top-100 generic worksheet), so brands such as ceftriaxone or co-amoxiclav
  products count toward their disease.
- **Delivery locations for Government and Hospital orders**, which carry most disease-linked sales.

With both, the same registered design can run once as a new registration. Expanding the keywords now, after seeing these
counts, would not be a fair test. DII stays approved for analysis only; no forecast or dashboard change follows.
