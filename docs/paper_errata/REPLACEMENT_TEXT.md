# Suggested replacement passages for Chapters 1–3

The following is the preserved **25 October preparation snapshot**. For current
2017–September 2026 source scope, confirmed-label limits and executed-versus-planned
methods, use the [29 October working alignment companion](../chapters/MedShield_Chapters_1_3_Alignment_20261029.md).
Neither document establishes adviser-approved amendments or a revised full PDF.

Working text prepared 25 October 2026. These passages have not been inserted into or approved as amendments to the baseline manuscript. Apply with the [errata sheet](ERRATA_SHEET.md), preserving original objectives and reporting deviations until actual amendments are accepted.

## Chapter 1 — scope and evidence limits (E01–E04)

The study's historical reporting scope is 2017–2025. A separately identified descriptive extension contains records through September 2026 and is not part of the original study evaluation period. Each analytical result identifies its source, target, temporal coverage and evidence status. Recorded net sales and gross profit are financial measures; they do not by themselves establish medicine-unit demand, physical deliveries, stock availability or procurement requirements. Product reporting labels and proposed buyer/geographic assignments remain distinct from verified canonical SKUs, units and delivery territories.

The implemented financial reporting, retrospective forecasting research and entered-input planning scenarios are evaluated within their supported scope. Original commitments involving medicine-demand forecasts, external disease/weather integration, stock urgency and operational inventory outcomes remain subject to their stated data and validation requirements. Research output does not establish measured stockout or expiry reduction.

## Chapter 2 — method-selection distinction (E05)

The literature review discusses methods relevant to the proposed decision-support workflow. Their inclusion does not imply that every method has been implemented or validated. The methodology and results identify the selected task, supported target, evaluation procedure and actual evidence for each implemented method, while conditional methods and unresolved original commitments are disclosed separately.

## Chapter 3 — architecture and ingestion (E06–E07)

MedShield uses a Next.js/React dashboard connected to an Express/TypeScript gateway. The gateway obtains analytical values from version-bound Databricks Gold contracts. Supabase provides application authentication, linked roles and audit persistence rather than dashboard analytical measures. Python analytical preparation and model evaluation execute offline. Sales ingestion follows the controlled Databricks pipeline, with source provenance, quality checks and candidate review retained before release. Required analytical-source failures produce an unavailable state rather than substituted demonstration values.

## Chapter 3 — missing historical observations (E08)

Missing historical observations are retained as unavailable and distinguished from recorded zero values. Reported observed totals exclude unknown amounts. The current implementation does not reconstruct missing Overview observations using an approved historical imputation model. STL decomposition of eligible contiguous financial history is a separate analytical operation and does not establish a gap-filling method.

### Conditional addition if historical imputation is subsequently evaluated

A historical reconstruction procedure will compare linear interpolation and seasonal interpolation on eligible internal gaps. Evaluation will mask recorded months and contiguous blocks resembling actual missingness, then compare reconstructed values with the withheld observations using MAE and signed bias. The protocol will specify gap lengths, selection/evaluation partitions and acceptable errors before final testing. Retrospective use of observations after a gap will be disclosed and will not be presented as origin-time forecast performance. Leading gaps require a separately evaluated backcasting procedure; trailing gaps require a forecasting procedure. Estimated values will retain method and evidence labels in charts, tables and exports, separately from recorded totals.

This paragraph describes a proposed protocol only. Remove its conditional heading and use completed-result wording only after actual evaluation and review. A generic imputation statement is insufficient evidence that reconstruction has been performed.

## Chapter 3 — STL and forecast evaluation (E10, E12–E13)

The implemented STL analysis decomposes eligible monthly company net-sales PHP observations into trend, seasonal and residual components. Source identity and actual component coverage accompany the results. This diagnostic decomposition is distinct from the originally proposed daily territorial/product analysis. Full-series decomposition is not supplied as an origin-safe forecast feature; any learned preprocessing used in forecasting must be fitted within each training window.

Forecast evaluation identifies the target, unit, data window, forecast origin, calendar lead and comparison baselines. MAE, RMSE, MAPE and WAPE are reported according to their separate definitions; WAPE does not replace the original MAPE criterion. Retrospective results already used in model inspection do not constitute untouched future validation. Disease/weather context is distinguished from a validated external-regressor model, and provider/mapping eligibility and issue-time availability must be established before operational claims.

## Chapter 3 — classifications and planning (E09, E11, E14–E15)

Buyer ownership sector and customer channel are treated as separate dimensions. Observed financial ABC bands are computed deterministically from eligible sales contributions and do not validate a learned XGBoost classifier. Any held-out-product, future-period or urgency experiment requires its own target, features and validation evidence. Stockout urgency cannot be inferred solely from financial contribution.

The active allocation feature evaluates entered planning assumptions using a bounded greedy procedure. It does not claim global linear-programming optimality or authorize procurement execution. Operational EOQ, reorder point, safety-stock, expiry and alert outcomes require supported quantity demand, verified inventory/supplier/lead-time inputs and method-specific evaluation. Unfulfilled original methods remain explicit limitations rather than being treated as completed by these scenarios.
