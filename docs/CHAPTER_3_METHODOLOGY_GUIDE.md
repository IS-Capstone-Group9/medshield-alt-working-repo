# Chapter 3 Methodology Guide

## Purpose

Use this document when revising Chapter 3. It gives the simple methodology wording for the current MedShield system.

## Recommended Methodology Position

MedShield uses a combined CRISP-DM and SEMMA methodology.

- CRISP-DM is the overall project lifecycle.
- SEMMA is the data mining and modeling workflow inside the analytics phase.
- The system is a historical decision-support system, not a live prediction, live alerting, or automated procurement system.

## Simple Chapter 3 Wording

The study followed a combined CRISP-DM and SEMMA methodology to guide the development of the MedShield Business Analytics Decision Support System. CRISP-DM was used as the overall lifecycle because the project required business understanding, data understanding, data preparation, modeling, evaluation, and deployment. SEMMA was applied within the analytics phase to organize the data mining steps: sampling, exploration, modification, modeling, and assessment.

The system uses historical data only. The current Databricks candidate contracts cover 2017-2025 sales, 2018-2026 DOH surveillance with 2026 partial, and 2017-2024 PAGASA station observations. NASA POWER observations based on latitude and longitude are separately labeled provider-derived proxies. Exact included periods, exclusions, and join-readiness must be reported for each analysis. The system supports historical analysis, forecast comparison, product prioritization, and scenario planning; it does not claim live disease surveillance, official live PAGASA alerts, or automatic procurement decisions.

## CRISP-DM Application

| CRISP-DM phase | MedShield application | Expected evidence |
|---|---|---|
| Business Understanding | Define the decision problem: demand planning, product prioritization, territory analysis, and inventory planning support. | Approved business definitions, Chapter 1 scope, system objectives. |
| Data Understanding | Review sales, DOH, PAGASA, and weather API data coverage, quality, and limitations. | Data profile, 2025 completeness review, source period table. |
| Data Preparation | Clean sales rows, standardize fields, classify products and areas, allocate contract-name rows, and prepare external signal files. | Cleaned sales dataset, product master, area mapping, external data templates. |
| Modeling | Run descriptive analytics; compare company monthly net-sales benchmarks, ETS, Prophet and the separately registered exploratory SARIMA/ridge suite; retain lagged external regression and allocation scenarios as separate scopes. | Model outputs, metrics, charts, run metadata and approval status. |
| Evaluation | Check reconciliation and compare MAE, RMSE, WAPE and bias on identical observed origin/target pairs. No champion is automatically published. | QA checklist, evaluation table, limitations section. |
| Deployment | Publish validated outputs through the API/dashboard and document the workflow. | Dashboard screenshots, API examples, Chapter 4 evidence. |

## SEMMA Application

| SEMMA phase | MedShield application | Expected evidence |
|---|---|---|
| Sample | Select usable historical sales, DOH, PAGASA, and weather API records. | Data source table and coverage notes. |
| Explore | Profile missing dates, rejected rows, product aliases, territory values, and trend patterns. | Data readiness profile and exploratory charts. |
| Modify | Clean, transform, map, aggregate, and engineer features. | Analytical marts, mapping files, feature tables. |
| Model | Apply provenance-aware source quantity profiles and Pareto shortlisting; compare sales-only revenue models; keep paired external regression and integer-pack scenarios separate from accepted SKU-demand forecasts. | Model output tables, candidate evidence and dashboard charts. |
| Assess | Compare paired development and retrospective-audit errors and data coverage; validate assumptions and record publication gates before approving any model. | Forecast metrics, model comparison, limitations. |

## RRL Notes

Use these sources in Chapter 2 or Chapter 3 when explaining the methodology and data sources:

Use `docs/RRL_DISEASE_WEATHER_PHARMA_DEMAND_GUIDE.md` for the literature-backed argument connecting disease, weather, and pharmaceutical demand forecasting.

| Topic | Source | How to use it |
|---|---|---|
| CRISP-DM | Chapman et al., CRISP-DM 1.0, and IBM SPSS Modeler CRISP-DM documentation | Supports the six-phase project lifecycle used in the capstone. |
| SEMMA | SAS SEMMA / Enterprise Miner references and Azevedo & Santos comparison of KDD, SEMMA, and CRISP-DM | Supports the sample, explore, modify, model, assess modeling workflow. |
| Historical weather proxy | NASA POWER API documentation | Supports describing NASA POWER as an API for historical analysis-ready weather data. |
| Historical weather proxy | NASA POWER Daily API documentation | Supports describing NASA POWER as provider-derived historical weather data by coordinates. |
| Decision support | Decision-support system and analytics literature from the paper RRL | Use to justify dashboard, forecast comparison, and scenario recommendations. |

## Claims To Use

- The system supports decision-making using historical sales and external context data.
- Weather API data is a provider-derived weather proxy, not official PAGASA data.
- DOH data supports historical disease signal analysis, not live alerting.
- The gateway exposes transparent baseline evidence; the separate offline comparison evaluates benchmarks, ETS, Prophet and exploratory SARIMA/ridge on common calendar leads 1–12. A 3/6/12-month display length is distinct from the actual lead from the accepted origin. No approved champion is served.
- Scenario outputs require human review before action.

## Claims To Avoid

- Do not say the system predicts disease outbreaks.
- Do not say the system provides official PAGASA alerts.
- Lagged observational regression measures conditional association; these results do not establish weather or disease causality.
- Do not call `net_income` company net income.
- Do not present EOQ, ROP, or allocation as real procurement optimization without inventory, lead time, and cost-policy data.

## Chapter 3 Checklist

1. State that CRISP-DM is the overall methodology.
2. State that SEMMA is used inside the analytics/modeling phase.
3. List all data sources with exact year coverage.
4. Explain the sales cleaning and contract-name row allocation.
5. Explain product/SKU alias mapping and area classification.
6. Explain 2025 data limitations.
7. Explain descriptive, predictive, and scenario analytics separately.
8. Explain common time-ordered forecast pairs, overlapping development folds, origin-local preprocessing, the inspected 2025 retrospective audit, paired metrics and the distinction between scenarios and approved operational recommendations.
9. State that final outputs are historical decision-support outputs.

## Predictive methods and paper results

Use [the predictive explanation](logic/PREDICTIVE_ANALYTICS_EXPLAINER.md) for the
executed model families, target/unit, evaluation protocol, formulas and defensible
interpretation. The [recomputed scorecard](../outputs/predictive_explanation_20261010/SCORECARD.md)
supports the predictive results table. [Current state](CURRENT_STATE.md) owns
current numerical results and acceptance status. Distinguish the 2017–2025 current
user-confirmed study scope from the retained 2020–2025 modeling window. Adrian
explicitly confirmed the expanded 2017–2025 study on 20 October 2026. Include
2017–2020 in the study, disclose partial coverage, and align the working
Chapters 1–3 dates while preserving archived source PDFs. 2026 actuals are
pending client confirmation; do not include them as observed study data. The
scope update does not retrospectively retrain or validate a saved model.

## Sector diagnostic method — implemented 19 October 2026

Within the current 2017–2025 study, compare January–December 2025 with the
same calendar dates in 2024. Pin dataset, Delta version, policy and mapping
identities. Select eligible signed net sales, retaining negative adjustments;
match company months with eligible evidence on both sides before grouping
Government, Private, Internal and Unknown. Do not silently remove Internal or
unknown groups. Earlier study years retain their actual observed coverage.

For group `g`, contribution is `Δg = sales(g, 2025) − sales(g, 2024)`; its signed
share is `100 × Δg / ΔAll`, unavailable if `ΔAll = 0`. Reconcile all sector and
month/product/raw-area/source-evidence partitions to the same total before
ranking. Shares may exceed 100% when other groups offset the increase. A missing
company month is excluded from both periods. Group absence within a matched
company period is an accounting zero; it does not establish zero real activity.
The observed trend preserves absent sector periods as unavailable.

Compute gross margin as `100 × eligible gross profit / matching eligible net
sales`, with a nonpositive or missing denominator unavailable. Report the basis
and changing eligibility rather than comparing rates as whole-sector profit.
Keep proposed ownership, approved geography and product-identity/unit review
separate. Drill down sector → month → product reporting group → raw area label,
retaining original versus adjusted financial evidence. Generic labels do not
establish individual accounts. Contributions localize change; contracts, price,
inventory, disease/weather and causal explanations require independently linked
evidence. The available study sources do not establish the underlying cause.

Use the [checked findings](../outputs/sector_diagnostic_20261019/FINDINGS.md),
[reproducible verification](../outputs/sector_diagnostic_20261019/README.md) and
[updated working Chapters 4–5](chapters/MedShield_Chapter_4_5_Revised_20261016.md)
for the implementation, results and bounded conclusion. The supplied Chapters
1–3 PDF is preserved; final complete-paper assembly remains a separate step.

## External context and cross-check method — 20 October 2026

The [external/source/formula audit](../outputs/analytics_external_audit_20261020/README.md) supplies a predeclared Private–Quezon revenue pilot with Dengue and PAGASA rainfall each from one month earlier. Aggregate eligible sales to one unique buyer/product/approved-territory/month key before aligning each unique provider/signal/month key. Reject duplicate signal keys; never multiply sales through a multi-signal transaction join. Preserve missing versus zero, peso/case/mm units, original/adjusted source counts and pending mappings. Count co-observed months separately from approved joins. Revenue remains a financial target.

The supplied sources support historical candidate context, not an admissible external model: station/territory mappings are unapproved, official 2025 weather is absent and DOH reporting/revision timestamps are missing. Do not claim that onset-month lagging proves real-time availability. After these dependencies are resolved, freeze the sales-only versus augmented temporal comparison on identical cases, fit transformations on training only and reserve genuinely unseen evidence. Already inspected 2025 results are a retrospective audit. A retrospective sensitivity study must remain explicitly separate from operational forecast validation.

Cross-check financial sums, contributions and matching margin denominators with a separate Decimal calculation; recompute MAE, RMSE, WAPE and mean prediction-minus-actual bias from stored pairs. Verify full common evaluation keys and consistent actuals; reject contradictory calibration evidence. Test positive-sales ABC at 80%/95% cutoffs with crossing items retained. Reconstruct observed STL as trend+seasonal+residual. Check planning packs/cents, stock protection and budget feasibility against a hand-calculated example. The current gateway planning method is bounded greedy allocation, with no global-optimality claim. Keep source approval, technical verification and academic acceptance distinct.

## Historical implemented revision methods (September 12, 2026) — retained note

Use [the Section 8 evidence record](SECTION_8_ACCEPTANCE_EVIDENCE.md) and its reproducible JSON for the implemented methods. Heatmaps and forecast quantities use one raw product at a time and exclude estimated rows. Government, Private and Unknown ownership remain separate. Regression uses earlier signal months and reports retrospective evaluation limitations. The historical offline planning solver uses equal-product fulfillment and cost objectives. The current gateway instead uses a bounded greedy scenario with integer packs, budget, stock protection and supplier caps; it does not certify a global optimum. Client acceptance of that objective remains pending.
