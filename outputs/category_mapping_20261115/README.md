# Therapeutic category mapping (candidate), 15 November 2026

Maps the top 200 product families (68.7% of itemized net sales) to therapeutic categories. Classified by the analyst
(AI-assisted) from brand name, strength and dosage form in the recorded labels. **Not verified against the FDA registry
or the client's catalog.** Low-confidence guesses are left unclassified and never used in tests.

| File | What it is |
|---|---|
| `category_mapping_v0_top200.csv` | v0, used by the registered category disease test (SHA-256 in `mapping_sha256.txt`). Unchanged |
| `category_mapping_v0_1_top200.csv` | v0.1, current candidate (SHA-256 in `mapping_v0_1_sha256.txt`) |
| `build_mapping.py`, `build_mapping_v0_1.py` | Builders; v0.1 reads v0 and applies the changes below |

## Changes in v0.1

| Family | v0 | v0.1 | Evidence |
|---|---|---|---|
| JUBI R (₱4.6M) | Unclassified | Antiviral: remdesivir 100 mg | JUBI-R is Jubilant's remdesivir brand; all sales in 2021–2022. Philippine registration not confirmed |
| CORBAL (₱2.6M) | Unclassified | Critical care: hydrocortisone injection, probable | 100 mg and 250 mg strengths fit; the brand name was not found in a registry |
| DROXISUR | Antibacterial (cefadroxil) | Critical care: hydrocortisone injection, probable | A registry aggregator lists "Droxisur 100" as hydrocortisone injection. This corrects a v0 error |

Two columns were added:

- `atc_group`: the WHO ATC group for the category (for example J01 antibacterials, J07 and J06 vaccines and immune
  sera). It is assigned per category, not per product.
- `demand_basis`: a plain reading of why institutions buy the category (public health programmes, childbirth, surgery,
  treatment of infection, long-term maintenance). It is a reading aid, not a tested driver.

## Shares of all itemized sales (v0.1)

| Group | Share |
|---|---|
| Programme and hospital products | 28.4% |
| Infection-related categories (antibacterials 16.9%) | 21.3% |
| Supplies | 8.5% |
| Chronic-disease categories | 4.6% |
| Unclassified (24 families) | 4.4% |
| Non-medical | 1.6% |
| Outside the top 200 | 31.3% |

## Limits

- 87 of 200 classifications are medium confidence (name pattern plus strength). The DROXISUR correction shows these can
  be wrong; each should be confirmed by the client or the FDA registry before any operational use.
- "Antibacterial" covers injections and oral forms; many labels do not state the form.
- Non-medical goods (rice, raincoats, tents, appliances) are recorded without a purpose.
