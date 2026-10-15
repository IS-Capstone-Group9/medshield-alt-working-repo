# Learner practice cases

All numerical inputs below are synthetic training fixtures. They are not MedShield observations, warehouse substitutes or approval records. Choose a case matching the learner's assigned role. Record the first response before giving feedback. Assessor calculations live separately in [assessor notes](assessor-notes.md).

## A. Frame a decision before choosing a model

Lesson basis: Chapter 1 slides 27–33; Chapter 2 problem-framing and success-criteria sections.

A manager says: “Build an AI dashboard to reduce medicine wastage.” You have historical source-label sales revenue, incomplete product/unit mappings, and no verified stock, expiry, supplier or stockout records. Write a decision brief: intended user/decision, observed symptom vs proposed cause, objective, constraints, usable current evidence, additional inputs and observable success criteria. Distinguish technical delivery from a measured reduction in wastage. Name the next responsible worker.

## B. Metric eligibility and missing observations

Lesson basis: Chapter 3 data-quality/contract sections; Chapter 4 descriptive investigation; project business definitions.

Three rows have `(net sales, eligible gross margin)` values `(₱100, ₱20)`, `(₱300, ₱30)`, `(₱50, unavailable)`. Calculate the total eligible gross margin, its revenue denominator and the margin percentage. Explain the third row's treatment and the result when the eligible denominator is zero.

For a separate YoY task, Year A has Jan = ₱100, Feb = observed ₱0, Mar = unknown. Year B has Jan = ₱120, Feb = ₱30, Mar = ₱50. Calculate comparable observed-month YoY and state coverage. Explain why filling the unknown month with zero changes the meaning.

## C. Data grain and join safety

Lesson basis: Chapter 3 data design and integration.

Sales has two rows for one territory/month, revenues ₱100 and ₱200. Weather has two rows for the same territory/month from different providers. A helper joins them only on territory/month and sums joined sales. What output does the naive join produce? Specify both grains, a join contract and a validation that preserves revenue while keeping provider identity. Buyer-sector labels have no approved territorial mapping: explain their treatment in a weather join.

## D. Localization, association and claim wording

Lesson basis: Chapter 4 diagnostic investigation; Chapter 5 slide 5.

Two segment revenues move from A = ₱100, B = ₱200 to A = ₱140, B = ₱180. Reconcile the total change and each contribution. Rainfall also rises. Write one supported finding, a possible explanatory hypothesis, an alternative explanation, and the evidence needed for a causal or operational recommendation. A colleague says “rain caused demand to increase, so order more medicine.” Assess that claim.

## E. Classifier evaluation at review capacity

Lesson basis: Chapter 5 slides 24–40, 47–48, 57, 60–64.

In a reviewed binary classification fixture, TP = 8, FP = 12, FN = 2, TN = 78. Calculate accuracy, precision, recall and F1. Twenty labels enter a human review queue. Explain the limitations of accuracy for this use. The output probabilities have not been calibrated, and a class label has no approved SKU/unit mapping. State what the metrics support and what remains unverified. Describe how thresholds or queue capacity should be selected without using the final test set repeatedly.

## F. Forecast origin, leakage and target mismatch

Lesson basis: Chapter 5 slides 17, 24–26, 44–48, 52, 58 and 61; project forecast definitions.

A synthetic series has origin December of Year A. A planner in October of Year B requests six displayed months, November of Year B through April of Year C. The candidate was evaluated only at leads 1–6. Determine the required actual leads and whether that evaluation supports the requested window. Specify a suitable validation design and baselines. A feature contains realized rainfall for each future target month, and preprocessing used the complete series. Identify problems and corrections.

A separate revenue model has low historical PHP error. Can this prove medical SKU quantity accuracy or authorize replenishment? Explain required evidence and inputs.

## G. Helper window semantics and missing data

Lesson basis: Chapter 4 slides 80–90; Chapter 5 slide 18.

Quarterly values for three years are `[100,120,80,112]`, `[108,128,88,120]`, `[116,136,96,128]`. Compute the three annual means and the first three trailing four-observation means. Define what period each result represents. One quarter is unknown: describe a defensible calculation contract and state how training a forecast with a centered/full-history smoother could leak future data.

## H. Evidence and unavailable-source behavior

Lesson basis: Chapters 1–3 evidence, governance and deployment; project architecture/decisions.

Databricks is unavailable. A helper proposes copying these synthetic fixtures into dashboard cards so the demonstration stays populated. A planning output also uses entered stock and demand assumptions. Explain the required application state, what the assumptions mean, and whether the output proves measured operational benefit or authorizes purchasing. Route any implementation issue to an owner.

## I. Categorical diagnostic checks

Lesson basis: Chapter 4 slides 63–79; Chapter 5 slides 65–67 recap.

Observed counts are `[[30,10],[10,30]]` for two buyer cohorts and two outcomes. Compute expected counts under independence, Pearson chi-square, degrees of freedom, Pearson cell residuals and Cramér's V. Explain what each quantity answers. State checks needed for independent observations, small expected counts and exploratory multiple comparisons. Can an association explain causation or validate a new buyer mapping?
