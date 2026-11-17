# Product-family draft, 11 November 2026

**Status: DRAFT for human review. Not applied to Gold, models or the dashboard.** Offline and read-only; original itemized
sales (contracts excluded, `e87cae21…ff10`, ₱638,015,351.53). Accountable Data Analyst; catalog owner review required.

## Method

Rule-based text normalisation of each recorded label (`build.py` docstring): drop bracketed maker or pack notes, cut at the
first strength, size or gauge token, drop dosage-form words. No drug dictionary is used, so **a brand is not linked to its
generic** (for example, AMBLOSYL is not linked to amlodipine), and different products sharing a first word may be merged wrongly.

## Result

- 5,623 labels form 3,515 draft families; 1,002 families hold more than one label. The top 100 families carry 55% of net.
- Examples: BUPIRIGHT (ampule, vial, 5MG/ML), SHARJVAX (1500 IU and 3000 IU), LACTAMOX (tablet and suspension).

### Share of A-class items that had no sales the previous year

| Year | Label A items, % new | Family A items, % new |
|---|---|---|
| 2019 | 130, 31% | 113, 26% |
| 2020 | 136, 34% | 124, 27% |
| 2021 | 103, 50% | 91, 36% |
| 2022 | 145, 35% | 130, 35% |
| 2023 | 302, 62% | 190, 37% |
| 2024 | 109, 37% | 88, 25% |
| 2025 | 134, 46% | 112, 40% |
| 2026 (Jan–Sep) | 131, 93% | 101, 62% |

Grouping lowers churn in every year except 2022, where it is unchanged, but 25–62% of A families are still new each year.
Real portfolio change or remaining naming variation is not yet separated.

## Automated first pass (`review.py`)

Top 150 families cover 63.0% of net. 126 have no flag (LIKELY_OK); 24 need a decision. Rule-based flags; nothing is approved.
Suggested decisions for the reviewer:

| Families | Suggestion |
|---|---|
| HAIXONE + HAIXONE WITH DILUENT; EPIX + EPIX BY | Merge (same product, naming variant) |
| HYCLENS (wound spray, gargle, skin cleanser in one family) | Split by product line; merge HYCLENS WOUND SPRAY and SKIN CLEANSER into those lines |
| PPE SET, PPE COVER ALL SET, PPE LAB, PPE COLORED | Decide one PPE family or keep separate by type |
| IV CANNULA (40 labels), SYRINGE (54), GLOVES (37) | Keep as supply families for planning; split by size only if stock is managed by size |
| BENERVA PLUS vs BENERVA FORTE | Keep separate (different formulations) |
| SANOMAX FA, XED | Same product with inconsistent category in the master; correct the category |
| FACE MASK, ALCOHOL ETHYL, MICROPORE, CENDALEX | Likely fine; confirm |

**Candidate v1 applied (`apply_v1.py`, on Adrian's instruction to accept the suggestions):** 3,507 families; 43 labels
reassigned (2 merges; HYCLENS split into GARGLE, SKIN CLEANSER, WOUND CARE and OB WASH). PPE, supply families and BENERVA
lines kept as drafted. SANOMAX FA and XED are logged as catalog category corrections; the accepted master is not edited.
Output: `family_mapping_v1_candidate.csv`, still a candidate and not applied to Gold or models.

## Validation of candidate v1 (11 November 2026)

1. **Random-grouping check (`../family_rerun_20261111/null_check.py`, pre-registered): passed.** ABC–XYZ A-X value kept is
   81.9% for the mapping, against 60.2% mean (95th percentile 77.4%) for 200 random size-matched groupings, and 59.4% (95th
   percentile 73.4%) when shuffled within category. Only 3.5% and 2.5% of random groupings reach it. Labels alone score 51.8%.
   About 8 points of the gain come from group size; about 22 points come from grouping real products.
2. **Spot-check sheet (`spot_check_50.csv`): needs a human verdict.** 25 top-value and 25 random multi-label families with
   blank `reviewer_verdict`. An informal read (not validation) finds about 47 of 50 to be one product line. Doubtful:
   ANIN 50 vs ANIN 50 PLUS (combination product), DEXTROSE PLAIN (labels describe 0.9% sodium chloride; likely a source
   naming issue) and LACTAMOX (tablets and suspensions merged).
3. **Generic worksheet (`generic_worksheet_top100.csv`): needs the catalog owner.** The product master has no generic
   names, so the top 100 medicine families (51.5% of net) have a blank `generic_name` for FDA Philippines-backed entry. No
   generic name was guessed.

## Candidate v1.1 and 2025 family ABC–XYZ (`apply_v1_1.py`)

v1.1 moves 4 labels that are a different formulation into their own family: TRIVASC MR, ANIN PLUS, AMBRODAY SR, GLUCRON MR
(3,508 families). Adult/pediatric size variants (25 families) stay together under the brand-line definition. DEXTROSE PLAIN
is logged as a source naming question.

`family_abc_xyz_2025.csv` classes 728 families with positive 2025 net:

| Class | Families | Share of 2025 net |
|---|---|---|
| AX steady, high value | 8 | 3.4% |
| AY variable, high value | 13 | 3.8% |
| AZ erratic, high value | 91 | 72.8% |
| BX / BY / BZ | 4 / 15 / 158 | 0.5% / 1.5% / 13.0% |
| CY / CZ | 2 / 437 | 0.1% / 5.0% |

Most value sits in erratic high-value families (AZ), consistent with large orders driving sales. Tight reorder rules
suit only the 8 AX families (for example ENHAMOX, HYCLENS WOUND CARE, EMZART); AZ families need order-based planning and
manual review. Handling notes in the file are suggestions to review, not stock rules.

## AI-assisted spot-check verdicts (`ai_verdicts.py`)

Adrian could not give verdicts and asked for help, so Claude recorded verdicts in `claude_verdict` (`reviewer_verdict`
stays blank). **This is not independent validation**: the same agent built the mapping, and verdicts check label
consistency under definition A, not brand identity against FDA Philippines records.

- 48 judged, 2 unknown (MUSHROOM, ACRYLIC OR).
- v1: 46/48 correct (95.8%); ANIN and TRIVASC were partly wrong (combination and modified-release versions merged).
- v1.1 fixes both: 48/48 on this sample.
- Missed merges are not measured (for example AMBUBAG vs AMBU BAG stay separate).

Definition A (brand line) is used, as recommended; Adrian did not choose otherwise.

**Open definition:** is a family a brand product line (all strengths and forms) or a generic plus dosage form? v1 is the
former. Planning in units probably needs the latter.

`family_review_top150.csv` has empty `reviewer_decision` and `reviewer_note` columns to fill in.

## Review

`family_draft.csv` lists every label under its draft family, sorted by family net (largest first), with
`review_status = DRAFT_NEEDS_REVIEW`. Reviewing the top roughly 150 families covers most value. For each family: confirm,
split (different products) or merge (brand of the same generic). After approval, rerun ABC–XYZ, TSB and safety stock on families.
