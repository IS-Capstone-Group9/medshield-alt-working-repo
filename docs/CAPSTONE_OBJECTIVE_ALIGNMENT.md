# Capstone Objective Alignment Assessment

## Overall Assessment

The system is **partially aligned**, but not yet fully defensible against the capstone objectives. The dashboard structure supports descriptive, predictive, and prescriptive analytics, but several advanced methods are currently scenarios, planned models, or blocked by missing data.

| Objective | Current Alignment | Main Gap |
|---|---|---|
| 1. Sales Diagnostic, 2021–2025, YoY, STL | **Mostly aligned** | Sales, monthly trends, YoY, and seasonality exist. However, the active pipeline uses a seasonal-index/seasonal-naive baseline; STL is not clearly connected to the published dashboard output. |
| 2. Product and Area Prioritization, 80/20, ABC, XGBoost | **Partially aligned** | ABC/Pareto and territory summaries exist. XGBoost urgency/classification remains blocked because the product master and target label are not approved. |
| 3. Prophet forecast with DII and RSI | **Weak/partial** | Forecast outputs and current-year rolling estimates exist, but DOH data is missing, PAGASA data is unavailable/unverified, weather coverage is partial, and Prophet is listed as planned in the model registry. |
| 4. EOQ, ROP, LP, MCDA, wastage ≤5% | **Scenario-only** | EOQ, ROP, MCDA, and procurement screens exist, but they use assumed inventory, costs, lead times, and disease values. Linear programming and expiry reduction cannot be validated without real inventory and expiry data. |
| 5. Five modules, upload validation, PAGASA alerts, collaborative filtering | **Structurally aligned** | The modules and CSV validation exist. Official live PAGASA Signal-2 alerts and validated collaborative filtering are not yet supported by the available data. |

The repository itself documents these limitations. The model registry labels Prophet as `planned`, MCDA and EOQ/ROP as `scenario`, and DOH/PAGASA sources as unverified in [services/analytics_service/app.py:407](../services/analytics_service/app.py:407). The computation pipeline also explicitly blocks missing DOH/PAGASA data, partial weather modeling, and XGBoost urgency in [run_model_computation_start.py:342](../services/analytics_service/jobs/run_model_computation_start.py:342).

## Critical Risks

- The paper says the system uses **STL, Prophet, XGBoost, DII, RSI, and linear programming**, but the current governed outputs do not consistently prove that those methods are actually being used.
- Some older evaluation artifacts claim successful advanced-model execution, while the newer computation summary says those components are blocked. This creates a reproducibility and defense risk.
- The current forecast pipeline generates a seasonal-naive forecast using the next year’s monthly values in [run_model_computation_start.py:249](../services/analytics_service/jobs/run_model_computation_start.py:249), rather than clearly publishing a validated Prophet forecast specifically for **December 2026 onward**.
- EOQ/ROP outputs are explicitly assumption-based. The API uses assumed ordering cost, holding percentage, and lead time in [services/analytics_service/app.py:619](../services/analytics_service/app.py:619).
- The system cannot honestly claim that expiry-driven wastage is at or below 5% because actual expiry dates, stock age, on-hand inventory, and wastage outcomes are not available. This limitation is documented in [docs/BUSINESS_DEFINITIONS.md:39](BUSINESS_DEFINITIONS.md:39).
- The paper should avoid calling workbook `net_income` true company net income unless operating expenses are available. The repository recommends gross-margin/profit terminology in [docs/DESCRIPTIVE_PREDICTIVE_PRESCRIPTIVE_GUIDE.md:321](DESCRIPTIVE_PREDICTIVE_PRESCRIPTIVE_GUIDE.md:321).

## How To Ensure Alignment

1. Create an objective-to-evidence matrix containing the objective, module, API endpoint, dataset, model version, output table, validation metric, and screenshot/paper reference.
2. Make each model output carry `model_code`, `model_version`, input dataset, training period, forecast period, status, metrics, and limitations.
3. Either implement and publish the actual STL, Prophet, DII/RSI, XGBoost, LP, and collaborative-filtering workflows, or revise the paper so unsupported methods are explicitly described as planned/scenario methods.
4. Load and validate the required 2021–2025 medical sales, DOH, PAGASA/weather, territory, product, and client-account datasets.
5. Add inventory fields for on-hand stock, expiry date, stock age, lead time, ordering cost, holding cost, budget, and capacity before claiming real EOQ/ROP/LP optimization.
6. Validate the forecasting layer using temporal holdouts and report MAE, RMSE, WAPE/sMAPE, and bias. Do not rely on high-level claims in older result files alone.
7. Add automated acceptance tests proving:
   - 2021–2025 territory totals reconcile.
   - Completed years contain January–December data.
   - Current-year reports stop at the current month.
   - Future months are forecast-only.
   - Territory, province, customer type, and channel are not mixed.
   - All-years totals equal the sum of approved yearly data.
   - Forecasts specifically include December 2026 onward.
   - Scenario outputs cannot be displayed as validated procurement decisions.
8. Update Chapter 4 and Chapter 5 evidence. The repository’s evidence checklist is still largely marked pending in [docs/CHAPTER_4_5_EVIDENCE_PLAN.md:9](CHAPTER_4_5_EVIDENCE_PLAN.md:9).

## Bottom Line

The system is a credible DSS prototype and is well aligned with the descriptive-analysis objective, but the capstone paper currently overstates predictive and prescriptive readiness. The safest path is to complete the missing data/model validation or revise the methodology wording so the paper accurately distinguishes **validated analytics**, **challenger models**, and **scenario-based recommendations**.
