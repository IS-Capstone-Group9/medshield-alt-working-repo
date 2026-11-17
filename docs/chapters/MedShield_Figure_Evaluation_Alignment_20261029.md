# Figure and evaluation alignment — 29 October 2026

This working companion supplies replacement figures and an evidence column for
Table 3.5. It accompanies the [Chapters 1–3 passages](MedShield_Chapters_1_3_Alignment_20261029.md).
The original [149-page manuscript](../../references/CapstonePaper_1.pdf) remains
unchanged. Page references below are PDF pages, not final institutional pagination.
These materials are prepared for integration; they do not record adviser or
client acceptance and do not change objective completion scores.

## Replacement figures and captions

Use the SVG files as editable masters and the PNG files as insertion previews.
Keep the figure numbers when replacing their original figures; update the final
list of figures only after complete manuscript assembly and pagination.

| Original location | Replacement and proposed caption | Integration instruction |
| --- | --- | --- |
| Figure 1.1, PDF p. 14 | [Editable conceptual flow](../../outputs/figure_evaluation_alignment_20261029/figure-1-1-conceptual.svg). **Figure 1.1. Evidence flow for MedShield decision support.** Controlled source assessment feeds scoped descriptive, diagnostic, research and scenario outputs; operational use requires separate approval and verified business inputs. | Pair with passage P03. Keep unavailable contract product allocation and unresolved combined-total overlap visible in the accompanying text. |
| Figure 3.1, PDF p. 71 | [Editable lifecycle](../../outputs/figure_evaluation_alignment_20261029/figure-3-1-lifecycle.svg). **Figure 3.1. Analytical lifecycle and acceptance gates.** Offline preparation, frozen evaluation and saved-candidate review are distinguished from conditional operational release and prospective monitoring. | Pair with P07–P10. CRISP-DM and SEMMA remain methodological references; monthly automatic retraining is not described as deployed. |
| Figure 3.10, PDF p. 88 | [Editable runtime boundaries](../../outputs/figure_evaluation_alignment_20261029/figure-3-10-runtime.svg). **Figure 3.10. Implemented analytical and application boundaries.** Databricks supplies analytical contracts through the gateway; Supabase supplies identity and audit services, and Python prepares evidence offline. | Pair with P06. Replace the centralized PostgreSQL analytical schema claim. This is a logical architecture diagram; retain verified physical table contracts in the database documentation instead of inventing an ERD. |

Figure statements follow [architecture](../ARCHITECTURE.md),
[physical contracts](../DATABASE.md) and [gateway contracts](../API.md).
Solid paths indicate current implemented boundaries; dashed paths indicate
conditional operational steps. Labels carry that distinction independently of
color. Candidate publication means storage of review evidence, not operational
forecast activation.

## Table 3.5 — original evaluation criteria and current evidence

Retain the original evaluation criteria on PDF pp. 116–118. Add the following
implementation/evidence columns or place this table immediately after the original
as an implementation reconciliation. These rows do not replace original metrics
with easier targets. MAPE and WAPE are different measures; meeting one does not
establish the other. Qualitative original targets remain qualitative until an
evaluation protocol defines a measurable acceptance rule.

| Original component / criteria | Current evidence and scope | Remaining evidence before claiming the original criterion |
| --- | --- | --- |
| Prophet baseline: MAE, RMSE, MAPE; MAPE <15% | [Original-source research connection](../../outputs/original_research_connection_20261027/README.md) exposes frozen saved comparisons and errors. It does not activate a future forecast. | Evaluate the specified model, target, period and scope against the original MAPE target; do not substitute a PHP or unit comparison with a different population. |
| Disease-adjusted forecast: MAE, RMSE, MAPE; improve baseline MAPE | Current comparisons remain research. Source availability alone does not demonstrate a disease effect. See [model gates](../PREDICTIVE_OPERATIONS.md). | Accepted geographic/date joins, origin-safe disease features and matched held-out improvement over the same baseline. |
| Weather-adjusted forecast: MAE, RMSE, MAPE; improve baseline MAPE | External references and retrospective comparisons do not establish deployed weather adjustment. See [model gates](../PREDICTIVE_OPERATIONS.md). | Accepted weather semantics and joins, origin-safe features, matched held-out errors and improvement. Preserve the original probability-based RSI meaning. |
| XGBoost demand urgency: MAE, RMSE, MAPE; MAPE <20% | [Unit robustness evidence](../../outputs/forecast_robustness_20261029/README.md) is a conditional BUPIRIGHT 4 mL HOSPITAL ampoule baseline comparison, not a validated urgency model. | Define the urgency target and unit, execute the specified model evaluation and meet the stated criterion. |
| XGBoost product performance: accuracy, precision, recall, F1; maximize | [Executed ABC evaluation](../../outputs/original_abc_evaluation_20261027/README.md) retains persistence after unsuccessful challengers, under its exact-label held-out protocol. | Broader accepted product identities, leakage-safe validation and applicable per-class performance; no claim that XGBoost succeeded. |
| Area/industry encoding: completeness; 100%, no unmatched entries | [Regional findings](../../outputs/so1_regional_completion_20261029/FINDINGS.md) retain nine confirmed delivery labels and conserve unallocated records. | Resolve remaining labels from source evidence. A valid unallocated bucket does not establish 100% mapped territories. |
| 80/20 threshold validation: original 3,631-SKU population and 80/95/100 thresholds | [Original-source ABC evaluation](../../outputs/original_abc_evaluation_20261027/README.md) uses its documented assessed population. Original fixed SKU counts remain historical/proposed scope. | Reconcile identities and populations before comparing counts; distinguish exact labels, accepted aliases and physical SKU identities. |
| Rule-based outbreak detection: precision, recall; maximize | Observed sales diagnostics and external availability do not validate outbreak alerts. See [operational gates](../PREDICTIVE_OPERATIONS.md). | Accepted outbreak ground truth, time/area alignment, alert threshold protocol, and held-out precision/recall. |
| EOQ: cost deviation and wastage; minimize cost, wastage ≤5% | [Planning baseline](../../outputs/so4_baseline_review_20261029/README.md) measures a bounded entered-input scenario, not observed procurement savings or expiry reduction. | Verified stock, costs, supplier terms, lead time and expiry; measured outcomes for the specified policy. Scenario feasibility does not prove ≤5% wastage. |
| MCDA / linear programming: ranking consistency, optimization gap; high consistency/minimal gap | [Planning baseline](../../outputs/so4_baseline_review_20261029/README.md) evaluates the implemented greedy scenario. It does not establish a global optimum. | Specify ranking stability tests and a valid optimization reference/bound before claiming a gap or optimality. |
| Collaborative filtering: coverage, relevance accuracy; maximize | [Area review](../../outputs/so2_area_completion_20261029/FINDINGS.md) presents observed concentration and scoped area evidence, not validated unstocked-product recommendations. | Define held-out recommendation outcomes, eligible catalog/area scope, coverage denominator and relevance metric; then execute evaluation. |

## Monitoring and interface consistency

The [prospective protocol](../../outputs/unit_prospective_protocol_20261029/README.md)
and [Gold adapter](../../outputs/unit_gold_adapter_20261029/README.md) are prepared
and locally tested. Future issue windows are unissued; actual future observations,
live issue execution, error limits and release approval remain pending. Replace
the automatic monthly retuning claim on PDF p. 118 with this bounded status.

Prototype figures from the original manuscript must be labelled proposed unless
replaced with current captured UI evidence. Keep “net sales” distinct from net
income and supported gross profit. Forecast screenshots must retain research
scope, channel, units and errors; planning screenshots must retain scenario labels.
Do not reuse prototype screenshots as evidence of deployed operational forecasting.
A complete prototype-by-prototype caption and bibliography audit remains open.

The [operator review](../../outputs/client_acceptance_20261029/operator/README.md)
is engineering evidence. The [client record](../../outputs/client_acceptance_20261029/review-record.json)
remains unexecuted; neither these figures nor documentation checks satisfy client
acceptance or increase SO1–SO5 completion.
