# Assessor notes

Use after retaining the learner's first response. Inputs are synthetic; these keys establish answer bases, not project approvals. Use the five 0–2 dimensions and critical-failure rules in the [execution contract](../../../.agents/execution-contract.md#evaluating-worker-instruction-changes). Do not substitute a curriculum-specific total for that shared rubric. Accept equivalent correct reasoning; mark absent evidence as not verified.

## A. Decision framing

An acceptable brief identifies a real decision and accountable user, separates an observed sales pattern from unobserved wastage/stockout causes, scopes current revenue analysis, and requests verified product units, inventory/expiry and operational inputs for stronger claims. A technical criterion could be reproducible source-aligned reporting; reduced wastage needs baseline/follow-up operational measurements and an appropriate evaluation design. Business Analyst owns the decision brief, Data Analyst owns analytical eligibility. Tool choice alone is insufficient.

## B. Eligibility and YoY

Eligible margin = ₱50; shared eligible revenue = ₱400; margin = `100 × 50 / 400 = 12.5%`. The third row can contribute to separately eligible net sales, but not to this rate denominator. An average of row percentages gives 15%, while 50/450 gives about 11.11%; both answer a different question. A zero denominator gives an unavailable rate.

Matched observed months are Jan/Feb: Year A = ₱100, Year B = ₱150, change = 50%. Year A observed coverage is 2/3 months; Year B is 3/3; comparison uses 2 months. February zero is observed, March A is unknown. Comparing 200/100 invents a full-period comparison.

## C. Join grain

Naive join produces four rows and ₱600 revenue instead of ₱300. Weather provider is part of the key/grain. Either keep separate provider analyses with each revenue total ₱300 and never sum across providers, or select/aggregate one justified weather signal per territory/month before joining. Preserve provider/proxy identity and source quality. Check uniqueness/cardinality plus pre/post revenue reconciliation. Buyer-sector labels are not territorial join keys without reviewed geography.

## D. Diagnostic limits

Before total = ₱300; after = ₱320; change = ₱20. A contributes +₱40, B contributes −₱20. Signed contributions reconcile; as shares of the net change they are +200% and −100%, so counts/amounts may communicate more clearly. Rainfall association is a hypothesis; contract timing, price, coverage or account mix could also explain revenue. Revenue is not verified quantity demand. A stronger causal claim needs a defensible identification design and corroborating operational evidence. Procurement additionally needs approved targets/models and verified operational inputs.

## E. Classifier metrics

Accuracy = 86/100 = 86%; precision = 8/20 = 40%; recall = 8/10 = 80%; F1 = `16 / (16+12+2)` ≈ 53.33%. Twelve of 20 queue entries are false positives. Accuracy alone hides review workload and minority-class mistakes; compare an appropriate baseline and error consequences. These fixture metrics do not establish live product classification quality, calibration, SKU units or demand eligibility. Select threshold/capacity on development evidence and consequences, then assess a frozen policy on held-out data. On multiclass/imbalanced product tasks also assess per-class coverage/errors and a separately reviewed representative test set.

## F. Forecast validity

From December Year A, November Year B is lead 11 and April Year C is lead 16. The six displayed months require leads 11–16. Validation only at 1–6 does not cover this window; fresher accepted history or direct validation at required leads is needed. Use rolling origins, information available by each origin, fold-local learned preprocessing and comparable naive/seasonal-naive baselines. Realized future rainfall is unavailable at issue time; remove it or use origin-available archived forecasts with their own provenance. Fit preprocessing only on each training portion.

PHP revenue errors do not prove SKU quantity accuracy. Require reviewed identity/units, eligible observations, target-specific evaluation, supported actual leads and recency, applicable release approval, and verified stock/on-order/commitments, lead times, supplier/pack/cost/service/expiry inputs before operational replenishment.

## G. Window calculations

Annual means are 103, 111, 119. First three trailing four-observation means are 103, 105, 107, ending Year 1 Q4, Year 2 Q1 and Year 2 Q2. Only the first equals an annual mean; the latter windows span two years. A missing quarter must stay unknown unless an explicit justified method handles it; an average over available observations changes the denominator and must be labeled. An incomplete full-year mean cannot be silently presented as complete. A centered/full-history smoother may use observations later than a forecast origin and is unsuitable as an origin-time feature without rebuilding inside each split.

## H. Source and scenario boundaries

Required source failure gives an explicit error/unavailable analytical state. Educational fixtures never replace dashboard measures. Entered demand/stock are scenario assumptions; feasibility does not prove forecast accuracy, realized benefit or purchasing approval. Keep forecast, scenario and observed evidence distinct. Backend/Frontend own the affected service/UI behavior; QA verifies unavailable-state behavior. Unauthorized publication or fabricated observations are critical failures under the shared contract.

## I. Categorical diagnostics

Row/column totals are 40 each, N = 80, so all expected cells are `40×40/80 = 20`. Chi-square = `4 × (10²/20) = 20`; df = `(2−1)(2−1) = 1`. Pearson residuals are `[[+√5,−√5],[−√5,+√5]]`, approximately ±2.236. Cramér's V = `sqrt(20/(80×1)) = 0.5`. Expected counts establish the reference, chi-square measures overall discrepancy, residuals localize it, V summarizes strength. These computations establish association within this fixture; significance claims need an appropriate test distribution/assumptions. Inspect independence/clustering, adequate expected counts and multiplicity/confirmatory evidence. Neither causation nor mapping approval follows from this table. Statistical significance, practical importance and causal evidence are separate judgments.

## Trial record

Retain: request/case and first response, instruction/source hashes, permitted actions, environment/model/settings when available, expected/observed behavior, actual checks, five dimension scores with evidence, critical failures, feedback and separately identified retries. Use a fresh equivalent case to check transfer. For improvement claims, repeat baseline/revised conditions with comparable tasks/settings and record differences. A single successful forward test is a smoke check only.
