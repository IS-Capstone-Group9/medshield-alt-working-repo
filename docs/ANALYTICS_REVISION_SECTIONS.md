# Adviser revisions by section

Execute and verify each section against the displayed charts and analytics, not only documentation.

| Section | Scope | Status |
|---|---|---|
| 1 | Metric definitions, financial calculations, labels, units and reconciliation | Implemented; verification below |
| 2 | Sales comparison axes, continuous year coverage, nominal and percentage growth | Implemented; verification below |
| 3 | Transaction-driven product/category heat map and functional filters | Implemented; category coverage remains limited by source mappings |
| 4 | Government/private sector, customer channel and geography separation | Implemented; private ownership mapping unavailable |
| 5 | Actuals, historical forecast validation, error metrics and selectable horizon | Implemented as draft source-backed baseline validation |
| 6 | Lagged weather/disease regression and out-of-sample improvement | Implemented; weather coverage/mapping gates remain |
| 7 | Pareto-focused constrained planning pilot | Implemented as scenario; client objective and operational inputs remain unverified |
| 8 | End-to-end reconciliation, evidence pack and paper alignment | Evidence and regression checks complete; authenticated acceptance pending valid sign-in |

## Section 1 — Metric definitions

- Net sales revenue uses Net CP (`net_cost`), not acquisition cost (`total_trade_price`).
- Legacy `income` / `net_income` fields retain workbook gross profit. Operating expenses are unavailable; chart legends and table headings use Gross Profit.
- Aggregate gross margin is sum(gross profit) / sum(net sales). Zero revenue produces null/unavailable, not zero or infinity. Losses and unusual rates remain visible for review.
- Sales Diagnostics financial KPI cards use the same selected-year rows as the charts and refresh with the selection/data.
- The filtered sales summary shows weighted margin in overview and average modes, plus workbook-versus-derived gross-profit reconciliation and mismatched-row counts. Raw workbook amounts and source margin percentages are preserved for audit.
- Units sold mean fulfilled delivered quantities in source units. Mixed packs cannot be compared as equivalent units. Revenue-based seasonality is labeled as revenue, pending the quantity heat-map work in Section 3.
- The definitions disclosure is accessible directly on Sales Diagnostics; the sales ledger also explains these metrics.
- Descriptive documentation now correctly identifies net sales as the Pareto ranking basis.

### Verification

Python regression cases cover unequal transaction sizes, rejected records, year filtering, preserved workbook discrepancies, zero revenue, negative margins, unusual margins, and descriptive/snapshot consistency.

Browser regression cases execute the real embedded dashboard runtime with Chart.js and controlled data, checking rendered KPI values, chart datasets, labels, refreshed zero-revenue behavior, and filtered summary rendering. They do not require a live login service.

The existing authenticated bootstrap test requires a running app at localhost:3000; that server was unavailable during this change. A live end-to-end deployment check remains part of Section 8.

Completed checks: 16 Python tests, 2 isolated browser tests using the actual Chart.js runtime, TypeScript no-emit validation, and whitespace/diff checks. The browser screenshot was visually reviewed for the definitions disclosure, financial cards, and chart labels.

### Local data reconciliation finding

On September 12, 2026, the local processed sales summary contained 35,956 accepted rows. Of these, 13,469 differed by more than ₱0.01 between workbook gross profit and net sales less acquisition cost. The aggregate workbook-minus-derived difference was ₱172,449,135.25. This is a reconciliation exception, not verified profit. It is specific to the local processed population and must not be mixed with a different Gold candidate population. The sales-data page displays the exception; no source values were replaced or certified by this change.

No raw sales data, published warehouse facts, credentials, or model runs are modified by this section. Existing data-quality and mapping limitations remain; these changes standardize interpretation rather than certify the historical data.

## Section 2 — Sales comparisons and growth

- The revenue chart uses a chronological monthly timeline covering every year between the selected endpoints. Selecting 2023 and 2025 includes 2024. Single-year and all-year selections remain supported.
- Net sales revenue uses the left peso axis; workbook gross profit uses the right peso axis. Tick increments are calculated independently from each measure's range. Negative values remain visible, missing months remain gaps, and lines are not artificially smoothed.
- Annual comparison and margin charts keep intervening missing years as unavailable bars. Missing annual values are excluded from totals with a visible note.
- YoY growth compares a calendar year with that exact prior calendar year, never with the previous available array row. Missing prior-year evidence does not produce a growth claim.
- The growth chart combines YoY percentage bars and peso-change points/line. Both measures use only months observed in both years. The comparison table shows the prior/current amounts and exact month coverage.
- Baseline change is target minus baseline in pesos and percent, not a sum of annual percentages. The selected baseline is honored in comparison mode; single-year mode uses the prior year; all-year mode uses the earliest displayed year.
- Percentage growth is unavailable for a zero or negative baseline, while the nominal peso movement remains available. Missing months are never filled as zero. Twelve observed months do not certify source completeness.
- The CSV export uses the displayed table, so scope, labels, amounts and coverage agree with the screen.
- The descriptive Python YoY output now includes `revenue_yoy_change_pesos` and `quantity_yoy_change_units`; the existing revenue growth field remains a fraction and is unavailable for non-positive baselines.

### Section 2 verification

Browser cases execute the real embedded runtime and Chart.js with controlled data. They cover 2023–2025 continuity, independent scales, 100% versus 50% consecutive growth, 200% baseline growth, CSV content, missing 2024, single-year filtering, partial Jan/March matching, zero baseline, and negative gross profit. Section 1 browser regressions also remain included.

Python tests check nominal exported changes, exact prior-calendar-year matching and non-positive baselines. TypeScript and diff checks supplement these behavioral tests. Validation is local and isolated; deployment and authenticated application verification remain in Section 8.

## Section 3 — Product quantity heat map

Primary implementation responsibility: frontend/runtime, with analytics and API work performed sequentially in the same task. No schema or authentication policy changes. The gateway route retains `requireAuth`.

The fixed peso heat map and unsupported May/November disease-surge narrative have been replaced by the product-quantity heat map and an observed-peak summary. `GET /api/sales/heatmap` reads `GET /sales/heatmap`, which groups accepted observed transactions from the allocated product-level sales layer by raw product, month and sales area. It does not use the revenue snapshot's top-15 product list.

### Behavior and acceptance

1. Latest year appears first; all intervening months/years remain visible within the selected scope. Topbar single-year and comparison ranges apply. All-years uses this source's available years.
2. Category selects the eligible product list and updates the selected product where necessary. Product, area and measure selections recalculate cells, colors, legend, tooltips, coverage, peak summary, supporting trend and CSV scope together.
3. Each view contains one raw product identity. Category totals are deliberately not offered because compatible base units and approved SKU/category mappings are unavailable. Proposed categories are explicitly labeled; unclassified products remain selectable. Raw aliases are not merged automatically.
4. Units sold are delivered quantities in source units. Explicit zeros display as zero; missing observations remain gray/unavailable. Rejected records, invalid dates/negative quantities, flagged duplicates and estimated allocations/dates are excluded and counted.
5. Optional within-year index = monthly quantity / that year's monthly average. It requires all 12 months to have observed records and a positive mean. This is relative intensity, not proof of recurring seasonality. The supporting chart retains actual quantities with gaps.
6. The local product layer must match the current sales-status checksum. An outdated/missing layer returns an error rather than stale or demo quantities. Refresh after uploads reloads the heat map; rebuilding the allocated layer is required if the checksum changes.
7. Filtered export contains product/category, area, period, source quantity, selected measure/value, record count and source filename. Cells are keyboard focusable with readable values and tooltips. Controls wrap and the year/month table scrolls inside its card.

### Source audit on September 12, 2026

- 42,165 source rows; 35,545 included observed rows.
- Excluded: 4,825 rejected/unclassified-quality rows, 1,730 estimated rows, 63 flagged duplicates, 2 invalid date/quantity rows.
- 4,483 distinct raw products: 4,481 unclassified and 2 with proposed wound-care mappings. These are not 4,483 approved canonical SKUs.
- No inferred analgesic/antipyretic/anesthetic classifications were introduced. An approved product master and compatible units are still needed for clinically meaningful category aggregation.

### Verification

Python tests cover product/month grain, explicit zeros versus missing months, exclusions, duplicate handling, quantity reconciliation, proposed mapping labels, unmerged aliases and endpoint failure behavior. Browser tests execute the real runtime and Chart.js, change category/product, area, index and year selections, inspect cell/trend values, verify CSV contents, and check unavailable-service clearing. Sections 1 and 2 browser tests remain in the regression run. Both TypeScript projects are checked with no emit. Local source loading and exclusion totals were verified directly; no raw data or published warehouse tables were changed.

The app and API were not running on localhost ports 3000/5000/5001 during verification. Authenticated live-app verification remains pending; isolated browser tests do not claim that deployment is running.


## Section 4 — Ownership, channels and geography

Primary responsibility: BI/runtime implementation, with sequential API and analytical validation. No database or authentication changes. The new `/api/sales/sectors` gateway route retains `requireAuth` and proxies `/sales/sectors` in the analytics service.

- Replaced mixed territory/institution revenue charts and fixed Government/Hospital cluster profiles with transaction-backed buyer clusters: Government, Private and Unknown ownership. Customer channel and geography are independent distribution dimensions.
- Government uses an approved mapping or the explicit Government source label; the latter is labeled unreviewed. Hospital, Pharma and province names never imply private ownership. The empty `datasources/templates/buyer_sector_mapping.csv` accepts approved area-wide ownership/channel/territory mappings only where the entire source group is homogeneous. Mixed groups require buyer-level source records before mapping; no approvals were invented.
- Both charts and the profile table use the selected cluster, topbar year scope, product and distribution dimension. Share denominators are within that exact scope. Hospital and Pharma remain distinct channels. Unknown geography/channel remain visible, never reassigned.
- All-products mode provides revenue only. A single raw product enables revenue-share and delivered-quantity-share comparisons on the same transaction population. Incompatible product packs are not summed as demand. Zero quantity totals and nonpositive revenue totals have unavailable shares; negative revenue groups disable composition percentages while preserving the nominal values in the table.
- The loader shares Section 3 checksum freshness validation. It excludes rejected/unclassified quality, flagged duplicates, estimated allocations/dates, invalid dates, nonfinite financial/quantity values, negative quantities, and missing/contract products. Missing service data clears charts and tables rather than substituting examples. Upload refresh reloads both analytical views.
- Removed the unsupported static allocation-policy claim and mixed cluster display. The existing geographic MCDA control remains in a separately labeled disclosure: ownership is not established, so it is not a private-sector ranking. The previous mixed radar and weather/demand overlay are no longer presented on this ownership page; validated external-driver regression remains Section 6.
- Visual review found an existing premature Sales Diagnostics closing tag that leaked growth/heat-map cards into other pages. Corrected the page boundary and added a browser assertion for navigation isolation.

### Section 4 source audit and verification

Local checksum `2738afaf114d9480928e37b6c2b53dc0cac9ba2f10dc74a98b2549e3345d235c`: 42,165 input records, 35,545 included. Of these, 7,544 are source-labeled Government, 28,001 have unknown ownership, and zero are approved Private. These counts describe this accepted observed population, not market shares or a verified government revenue percentage. Private-sector conclusions remain blocked by source classification; the application correctly shows an empty state.

Passed 26 Python tests across sector, heat map, metric definitions, pipeline and financial reconciliation; seven browser cases across Sections 1–4 using the actual embedded runtime and Chart.js. Sector tests establish unequal revenue/quantity shares (75%/25% versus 10%/90%), independent channel grouping, year/product filtering, unknown ownership, unavailable quantity aggregation and service-failure clearing. Both TypeScript projects passed no-emit checking. The Section 4 fixture screenshot was visually reviewed. Authenticated live application/deployment verification remains pending Section 8; fixture data is not production evidence.


## Section 5 — Actuals and forecast validation

Primary responsibility: frontend/runtime delivery, with sequential analytical-method and API implementation. No database, authentication or model-publication changes. `/api/sales/forecast-validation` retains `requireAuth`; the Python `/sales/forecast-validation` endpoint uses the checksum-verified observed transaction population from Section 4.

### Changes and analytical contract

- Removed the fixed 2025 revenue multipliers used as a 2026 forecast, arbitrary percentage bands, hardcoded 8.2%/14.8% MAPE and peso-error cards, and unsupported Prophet/PAGASA validation and 44% improvement claims. Existing research exports are not silently promoted: one older forecast-run export has a 2000–2047 training range and 2048 predictions, so it is unsuitable as current dashboard evidence.
- The chart now overlays up to 24 calendar months of actual sales, retrospective holdout predictions, future baseline forecasts, and available empirical error bands. Lines retain missing-month gaps; actuals never extend into the future. The detailed monthly ledger and CSV include evidence type, forecast origin, actual/prediction/bounds and source checksum.
- Government, Private and Unknown ownership remain separate. Revenue can cover all products within one cluster. Quantity requires one raw product, in delivered source units. Source ownership/product limitations remain visible; no approved Private data is invented.
- Models are explicit draft benchmarks: seasonal naive repeats the same month in the prior year and requires 24 observed training months; last observed value requires two observed training months. Sparse/missing seasonal inputs yield unavailable predictions rather than an arbitrary fallback. These are not approved canonical-SKU demand forecasts or an automatically selected champion.
- Horizon choices are next 3, 6 or 12 calendar months after the latest observed closed month. The origin advances when fresh closed-month observations arrive, not merely when the wall clock advances. Current and future-month source rows are excluded in Manila time. The topbar descriptive year range does not truncate training history. A visible age statement explains when this is a stale-origin outlook rather than a current-month forecast.
- The historical holdout has the same calendar length as the selected horizon. Its training cutoff precedes every holdout month. Historical predictions are recomputed retrospectively, not presented as forecasts actually archived at that time. Missing actuals are excluded from scoring. No annual completeness claim is inferred from observed records.
- MAE = mean absolute prediction error; RMSE = square root of mean squared prediction error; WAPE = 100 × sum absolute errors / sum absolute actual values; bias = mean(prediction − actual), so positive means overprediction. Zero WAPE denominator returns unavailable. Selected-model cards report their scorable months; the benchmark table compares both models on the identical intersection of scorable holdout months.
- Bands use the empirical 90th percentile of absolute errors for each forecast lead. Prior errors come from rolling origins whose targets fall within the applicable training cutoff. At least 12 prior errors at that lead are required. Historical bands never use holdout observations. Future bands can use all observed history. These are descriptive error ranges, not calibrated 90% confidence intervals; holdout coverage and sample count are displayed. Quantity lower bounds are clipped at zero.
- Forecast controls reload source evidence for cluster/product/measure changes, guard against stale asynchronous responses, and recompute model/horizon views from that response. Upload refresh requests new evidence. Errors clear old charts, metrics, ledger and export. The listener and globals are removed with the dashboard lifecycle.
- Forecast-page navigation copy matches the implemented baseline models. The unsupported external-series overlay is replaced by a Section 6 pending state; the forecast page no longer presents a separate revenue-intensity chart as forecast evidence.

The separation of training and holdout data follows the forecast-accuracy guidance in [Forecasting: Principles and Practice](https://otexts.com/fpp3/accuracy.html). The error-band sample threshold and draft eligibility gates above are explicit local implementation choices, not claims of statistical coverage or model approval.

### Local evidence and verification

On September 12, 2026, the default source-labeled Government revenue scope has 7,544 accepted observed records across 81 observed months, ending December 2025. It is eight closed months behind August 2026. The 12-month retrospective holdout has nine common scorable months. Seasonal-naive MAE is approximately ₱2,695,359.26 and WAPE is 85.05% on those nine months. Its next-12-month view has 11 available forecasts because a prior-year month is absent. These are draft partial-population diagnostics, not an accuracy endorsement or a complete 2025 holdout.

Passed 34 Python tests across Sections 1–5, including frozen-origin/no-leakage checks, missing calendar months, shared comparison populations, product/sector isolation, current/future exclusion, sparse training, zero denominators, non-January year rollover and endpoint failure handling. Seven prior-section browser cases passed; both new forecast browser cases passed after the mobile correction (nine cases total). The forecast cases consume deterministic output from the actual Python builder and inspect Chart.js actuals/backtests/bands, 3/6/12 horizons, metric/model changes, scope events, CSV content, empty/error clearing and 390px layout. Both TypeScript projects passed no-emit checks; affected-file diff checks passed. Desktop and mobile fixture screenshots were visually reviewed.

The dashboard and API ports were not listening during verification. Authenticated live-app/deployment verification remains in Section 8. Existing advanced-model research artifacts and published warehouse model tables were not modified or certified. Current forecasts require refreshed sales history; validated external-driver models remain Section 6.


## Section 6 — Lagged external regression

Implemented source-backed regression under Forecast Modeling, replacing the Section 6 placeholder. The authenticated `/api/sales/external-regression` gateway proxies the Python service. No authentication policies, raw workbooks or published model tables were changed.

### Source preparation and eligibility

- The local DOH onset workbook is present, contrary to older publication notes. `python -m services.analytics_service.jobs.prepare_regression_sources` generates the local `data/medshield/processed/regression_external_monthly.json`. It reads actual onset dates for Dengue, Leptospirosis, Cholera and Typhoid Fever, and aggregates exact approved province labels by disease/month. ILI is a link, and weekly-only records are not converted into guessed monthly totals. Final counts lack historical release/revision timestamps.
- Source audit: 699,240 rows inspected; 637,006 outside exact target provinces; 1,151 monthly disease/province totals; no duplicate municipality/date keys detected. Missing months remain unobserved. Ambiguous duplicate keys exclude their entire month. Source and area-mapping checksums invalidate stale prepared data.
- Corrected the Section 4 geographic join: transactions use `geographic`, while the former consumer expected `territory`. Province assignment now uses the approved area mapping, independently of buyer ownership. Unknown ownership is retained; unreviewed Lower Cavite is not assigned to Cavite.
- NASA POWER daily data covers 2025. Only complete nonduplicated months with valid rainfall are aggregated; it remains a weather proxy. This source is too short for the regression gate.
- PAGASA station files are present but lack approved station-to-sales-territory mappings. The empty `regression_station_mapping.csv` supports one approved station per approved territory. Its explicit `lower_bound_zero` trace policy treats documented trace values below 0.1 mm as zero for a lower-bound sum; missing sentinels and incomplete months are excluded. No station mappings or trace-policy approvals were invented.

### Model and visual contract

- Filters: buyer ownership, territory, product, financial revenue versus single-product delivered quantity, disease/rainfall/combined model, disease, weather provider, and independent disease/rainfall lags of 1/2/3/6/8/12 months. Eight-month lag pairs March with November by calendar month, never by row position. Scope changes reload evidence and clear prior results while loading.
- Baseline OLS: intercept, time trend, annual sine/cosine and previous-month target. Augmented OLS adds earlier case counts per 100 and/or rainfall per 100 mm. Each model uses identical aligned observations. Scaling is computed from training data only. Constant or rank-deficient predictors block estimation.
- Require at least 36 matched initial training months and 6 observed months in the final 12-calendar-month holdout. One-month rolling evaluation refits using only earlier target observations. Coefficients shown are from the initial pre-holdout fit. No zero imputation, lag search, automatic champion promotion or significance/causality claim.
- The coefficient bar chart and paired predicted-versus-actual scatter replace the mismatched external line-chart concept. MAE, RMSE, WAPE, bias, holdout dates, sample counts, source readiness, and observation/residual details share the selected scope. Export includes both models, target/external months, training end, scope and checksum. Raw negative linear predictions are preserved for scoring.
- Real default Quezon/Unknown ownership revenue result: 95 observed sales months, 59 aligned months, 47 initial training months and 12 paired 2025 holdout months. Dengue at a one-month lag raises MAE from approximately ₱118,915.72 to ₱130,885.37 (10.07% worse). This is not evidence that dengue causes lower revenue. Product quantity views can be blocked by sparse history; aggregated revenue is explicitly not unit demand.
- Predictive association does not establish causation, and final retrospectively revised onset counts do not prove real-time forecast improvement. See [FPP3: correlation and causation](https://otexts.com/fpp3/causality.html) and [regression forecasting information availability](https://otexts.com/fpp3/forecasting-regression.html). Weather models remain not estimable until mapping/coverage requirements are met.

### Verification

43 Python tests passed across Sections 1–6. New tests cover known coefficients, independent eight/three-month lags, future-target leakage, paired observations, absent months, constant predictors, duplicate external keys, weather month completeness and API failures. Regression browser tests consume actual Python outputs, inspect chart coordinates/coefficients, exercise scope/lag events, validate CSV, clear blocked/error states and check 390px layout. A separate local-data browser check renders the prepared DOH/sales result; desktop and mobile views are inspected. Both TypeScript projects passed no-emit checks. No app/API was listening on ports 3000/5000/5001; authenticated live deployment remains Section 8.


## Section 7 — Focused allocation scenario

Replaced the fixed stock/seasonal recommendation screen with a source-backed shortlist and integer-pack allocation scenario. The legacy React model/scenario portal is no longer appended to Prescriptive Planning; its reusable components and unrelated model endpoints are retained. The new gateway GET `/api/sales/planning-shortlist` and POST `/api/sales/planning-solve` retain `requireAuth`. Solves are read-only calculations: no purchases, inventory writes or model publication occur.

### Scope and objective

- Rank raw product identities by accepted observed net sales over the latest 12 calendar months in the selected buyer cluster and territory. Select ceil(20% of positive-revenue identities), capped at five. Nonpositive products are excluded and counted. Show the actual shortlist revenue share, not an assumed 80%. Unknown ownership remains explicit.
- Local default Quezon/Unknown ownership scope: January–December 2025, 85 positive-revenue identities, five selected, 41.96% of positive-product revenue. These are raw identities, not approved canonical SKUs.
- Demand for the chosen 1/3/6/12-month horizon, usable stock, protected stock, units per pack, supplier price per pack and maximum supplier packs are required scenario inputs. Blank values remain unknown. Historical quantity and observed-month coverage are reference evidence, never relabeled as a forecast. Changing horizon resets the scenario acknowledgment.
- Objective: maximize the equally weighted sum of product fulfilled-demand fractions, then minimize cost at the best service level. This avoids adding incompatible product quantities. Client approval of that objective remains outstanding; the UI and exports say scenario only.
- Integer variables are purchase packs and fulfilled units. Constraints enforce budget, supplier limits, protected stock, demand upper bounds and the chosen minimum fulfillment percentage per product. Costs are represented in integer centavos; all inputs are validated as finite and bounded. Pack remainder stock stays visible.
- SciPy `milp` performs the two solves, requiring optimal status and independently checking returned integer allocations against bounds and linear constraints. Explicit conflicts show when minimum service exceeds budget or supplier limits. Unsolved/time-limited cases publish no allocation. See [SciPy MILP API](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.milp.html). SciPy is now included in the analytics service requirements.
- The output chart compares fulfilled/unmet percentages by product. The table shows packs, purchased units, fulfilled/unmet units, ending stock, spend and binding constraints. Budget spend and remainder reconcile with the rows. CSV includes scenario status, every input, horizon, scope, source checksum and outputs.
- Any edited input invalidates the displayed result and export. Async request counters prevent older shortlist/solve responses from replacing newer input state. Source checksum, scope and exact shortlist membership are rechecked on solve. Refresh after upload reloads the shortlist. Listeners/globals are cleaned up on dashboard teardown.

### Verification and remaining inputs

50 Python tests passed across Sections 1–7, including an exhaustive enumeration check against the solver's service-then-cost optimum, integer pack reconciliation, protected stock, zero budget, surplus stock, infeasible minimum service, supplier caps, invalid/stale inputs and the Flask solve route. The 13-case browser suite completed with `test-results/.last-run.json` reporting passed and no failures; the focused planning case also passed directly. It executes the actual Python solver with controlled inputs and checks displayed charts, CSV assumptions, edit invalidation, error clearing and 390px layout. Desktop/mobile screenshots were reviewed. Both TypeScript projects passed no-emit checks and affected-file diff checks passed.

No authenticated app/API was listening during verification. Section 8 must verify the live authenticated flow and prepare paper evidence. Actual inventory/reservations, current demand forecasts, supplier quotes, lead times, MOQ/pack policy, expiry/capacity constraints, canonical SKU mappings and the client-approved objective are still required before operational recommendations. This pilot does not infer EOQ, clinical priorities, disease uplifts or procurement approval.

## Section 8 — Integration evidence and paper alignment

See [the acceptance evidence record](SECTION_8_ACCEPTANCE_EVIDENCE.md). Added a reproducible local evidence generator with source hashes and product/month quantity reconciliation. Updated obsolete authenticated test expectations and the Chapter 3 methodology to match implemented charts. Extended the planning gateway timeout to cover both bounded solver stages. Verified 50 Python tests, 13 isolated browser tests, one live anonymous-access test and both TypeScript projects.

Local frontend/gateway/analytics/product services were started. A sandbox network restriction initially blocked Supabase; the approved connectivity check returned HTTP 200 and the gateway was restarted with network access. The demo login then returned invalid credentials. Authenticated acceptance remains open pending a valid provisioned account; no auth bypass or account migration was performed. Live uploads and operational model approval are not claimed.
