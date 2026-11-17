# Forecast error assessment — 27 September 2026

The selected last-value baseline is not ready for operational publication. Its 2025 retrospective audit has 37.76% WAPE and ₱5.83 million monthly MAE. No acceptable business error tolerance has been established, and these results do not establish a reliable forecast horizon.

## What the frozen evidence shows

- **The forecast misses changing monthly revenue.** The December 2024 origin produces a constant ₱16,744,970.51 forecast for each month of 2025. March, April and November contribute 47.9% of total audit absolute error. March alone is overforecast by ₱14,132,675.41.
- **Short leads are also inaccurate.** Leads 1–3 have 83.52% development WAPE and 55.07% audit WAPE; audit leads 4–6 have 41.77%, and leads 7–12 have 31.20%. These are different target months, not controlled evidence that longer leads work better. The audit has only one origin and three observations in its shortest band.
- **The GOVERNMENT source label accounts for most of the largest revenue changes.** Its December 2024 to March 2025 decline is ₱13,926,770.45 against a total decline of ₱14,132,675.41. It also accounts for ₱7,313,039.54 of the ₱8,331,038.69 increase to November. A large May 2023 miss is similarly dominated by this label in original-source exports. These are accounting contributions, not proof of contract timing, procurement events or disease effects.
- **A lower percentage error does not mean smaller peso errors.** Development WAPE is 83.20% with MAE ₱3.09 million; audit WAPE is 37.76% with MAE ₱5.83 million. Mean absolute actual sales in the scored observations rise from ₱3.71 million to ₱15.45 million, increasing the WAPE denominator. Development folds overlap and have different target coverage, so the two stages are not interchangeable samples.
- **Provenance limits product-level interpretation.** Both 2024 and 2025 carry `ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE`. The product-label decompositions must not be treated as independently confirmed SKU demand. Recorded annual revenue changes from ₱50.26 million to ₱185.40 million; sales totals alone cannot distinguish business growth from changes in source preparation. The shared provenance label does not itself explain that change.

## Next experiments and decision gates

1. Reconcile the largest GOVERNMENT-labelled changes against available original invoice/order dates and source preparation records. Confirm the meaning of this raw label before treating it as an approved customer segment. Do not delete large observations merely because forecasts miss them.
2. Specify acceptable peso error and over/underforecast costs for the intended planning decision. Report MAE, WAPE, signed bias and errors by origin/lead together; small average bias can conceal offsetting large errors.
3. Pre-register a separate monthly rolling one-step evaluation, updating only from information available at each origin. Compare it with common-key baselines using development data. This is a new operational schedule, not a correction to the fixed-origin audit.
4. If approved source identities and event information become available, test recurring sales and large-order contributions separately, then reconcile predictions to the company total. Future event inputs must be known at forecast time. Do not infer such inputs from realized audit sales.
5. Any recipe informed by these findings needs later untouched accepted actuals for a new final audit. Keep the existing 2025 audit labelled retrospective and inspected. No replacement recipe is qualified by this diagnosis.

## Evidence and limits

See [full diagnostic tables](DIAGNOSIS.md), [machine-readable calculations](diagnostics.json) and [chart](error-diagnosis.png). Source composition was extracted read-only from pinned fact version 16 and reconciled to frozen monthly counts and eligible revenue. Input and run hashes were checked. Completeness remains user-attested, not independently verified. Raw area/product labels are not approved customer/SKU identities.

No model was retrained, reselected or activated; the existing run and release pointer were not changed. Prediction intervals remain unavailable because per-lead calibration support is insufficient.
