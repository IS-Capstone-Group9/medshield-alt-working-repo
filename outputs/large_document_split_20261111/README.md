# D3 large-document split study, 11 November 2026

Accountable Data Analyst; single agent. Offline and read-only; no source, model, runtime or approval changed. Original
itemized sales (contracts excluded, `e87cae21…ff10`, ₱638,015,351.53), window 2020-01 to 2026-09, 81 months. All months
were inspected by earlier studies, so this is **retrospective**, not future accuracy. The study design, win rule and
cutoff are fixed in the `run.py` docstring (registration SHA-256 `bcfb4b03e93c…`, full hash in `results.json`).

## Split at ₱500,000 per document

231 large documents carry 44.6% of net. Removing them lowers the coefficient of variation from 0.84 to 0.60.

## Result

| Lead | Total, mean_6 (reference) | Base only, best simple | Total via split, best | Win rule |
|---|---|---|---|---|
| 1 | 49.7% WAPE, −10.8% bias | 37.1–38.4% (median_6 / mean_3 / mean_6) | 50.8% (mean_3 base), −14.0% bias | Not met |
| 3 | 53.7%, −15.5% | 37.9% (mean_3) | 54.1%, −18.1% | Not met |
| 6 | 63.2%, −21.6% | 45.9% (mean_3) | 63.6%, −23.5% | Not met |

- **The base is clearly more predictable**: about 38% WAPE at lead 1, against 49.7% for the total.
- **Splitting does not improve the total.** Every challenger is worse than or equal to the reference (+0.6% to +16.8%
  relative WAPE), with bias beyond ±5%, so none passes. Large orders are the unpredictable part (lead-1 WAPE 71.9% on
  their own) and adding their trailing average back gives back the gain.
- Seasonal naive is the worst base method at every lead.

## What it means for decisions

1. Use the base forecast (mean_3 or mean_6) for routine replenishment and safety stock, which cover the regular flow.
2. Treat large orders as a separate pipeline: known tenders and orders with dates, not a statistical forecast.
3. Improving the total needs a dated order and tender archive, not another model. mean_6 stays the selected reference.

No model selection, activation or procurement basis follows from this study.
