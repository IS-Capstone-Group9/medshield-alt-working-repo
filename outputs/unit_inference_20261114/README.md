# Unit and pack-size inference from prices, 14 November 2026

Implements `outputs/paper_draft_20261112/unit_inference_plan.md`, phases 1–3 and 5–7. Phase 4 (external price reference)
was not run because generic names are not yet available, so the highest possible grade was B. Offline and read-only.
Rules were fixed in each script's docstring before running; hashes are in the results files.

## v1: failed, method defect

`run.py` set the base price within each family-year. When a pack level was the only one sold in a year, it became that
year's base, so every factor came out as 1 and nothing was converted. All checks failed with identical before/after values.

## v2: the one allowed retry, failed (final)

`run_v2.py` sets the base per family across all years; nothing else changed.

It found plausible pack sizes, for example LACTAMOX ₱310 per piece vs ₱2,800–3,000 (box of 10) and MAXIFER ₱490 vs
₱2,450 (box of 5). The registered validation still failed:

| Check | Before → after | Rule | Result |
|---|---|---|---|
| V1 price per piece consistency (7 multi-level grade-B families, 26 family-years) | CV 0.212 → 0.217 | ≥ 50% lower | Fail |
| V2 monthly demand smoothness | CV 2.96 → 3.34 | Lower | Fail |
| V3 label text agreement | 0 of 6 labels | ≥ 90% | Fail |
| P7 lead-1 forecast, grade-B families | Pieces 156.1% vs raw 117.1% WAPE (pesos 132.8%) | ≥ 10% lower | Fail |

Grade B covers 34 of the top 100 families but only 15.2% of net sales.

## What this means

Price levels alone do not reliably reveal pack sizes in this data. A higher price level may be a box, but it may also be
a different strength or form under the same family, or a buyer-specific price. Converting by the inferred factor made
demand rougher, not smoother, so the inferred units are not used anywhere.

## Useful output

`client_confirmation_sheet.csv`: 63 labels in 15 families with our candidate pieces-per-unit, as a yes/no sheet. If the
client confirms them, those families get verified units. This replaces the open question "what does one unit mean?" with
a short check. `unit_mapping_candidate_v2.csv` keeps every label's candidate factor and grade, marked not applied.
