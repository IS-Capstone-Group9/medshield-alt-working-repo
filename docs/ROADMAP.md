# Roadmap

Last reviewed: 2026-10-07 (Asia/Manila). Accountable tracking role: Data Analyst.

This register separates implemented capability, recorded validation and approval.
Checked items describe their stated scope only; they do not approve a candidate
release. This refresh inspected repository source and saved receipts; it did not
rerun application tests, query the warehouse, publish data or activate models.

| Order | Milestone | Exit evidence | Status |
|---:|---|---|---|
| 1 | Gold data acceptance | Reconciliation, hashes, mapping exceptions, 2025 allocation totals, named reviewer decisions | Fact19 technical receipts pass; business/source-allocation acceptance remains open |
| 2 | Stable dashboard publication | Approved Databricks views, unchanged API contract, fail-closed verification | Candidate contract; exact fact19 authenticated browser/API/export acceptance remains open |
| 3 | Descriptive analytics freeze | Reproducible KPIs, period completeness, Pareto/ABC, territory and buyer mapping limitations | Historical finance and 72-month STL verified in saved fact19 receipts; approvals remain open |
| 4 | Predictive baseline evaluation | Seasonal-naive/last-observation benchmarks, rolling validation, MAE/RMSE/WAPE/bias | 15 configurations evaluated on frozen fact16 input; none promoted; SKU-unit forecasts unfinished |
| 5 | External-regressor evaluation | Approved territory-month joins and proof of improvement over sales-only baseline | Blocked by mapping/publication gates |
| 6 | Prescriptive scenarios | Visible inputs, feasible/infeasible handling, human review, no purchase execution | Greedy entered scenarios validated; operational inventory/supplier inputs absent |
| 7 | Capstone acceptance | Complete E2E evidence, Chapters 4-5, limitations, reviewer sign-off | Pending final data/model acceptance |
| 8 | Deployment | Selected host, secrets, monitoring, rollback, and cost owner | Optional; AWS is not required for analytics completion |

## Descriptive — what happened

- [x] Implement annual/monthly sales, product/area rankings, ledger, filters,
  quantity evidence, matched-observed-month YoY and positive-sales ABC/Pareto.
- [x] Reconcile historical finance and coverage against fact19 in saved direct
  gateway/warehouse evidence: 37,728 records, 98/108 observed months, net sales
  ₱626,946,741.81. Missing months remain unknown.
- [x] Validate matching 72-month STL for January 2020–December 2025. This is
  descriptive decomposition, independent of selected dashboard dates.
- [x] Retain signed adjustments and source provenance; weighted margin uses the
  matched margin-eligible revenue denominator, not total sales.
- [ ] Finance/business owner: accept version-bound definitions, totals,
  completeness policy and adjusted-source/2025 allocation evidence.
- [ ] Product and account owners: approve category, identity, source units and
  buyer/geographic mappings separately; disclose unresolved coverage.
- [ ] QA/operator: verify authenticated API, filters, charts and downloads against
  the same fact19/dataset/policy/master/STL identity.
- [ ] Data Analyst: freeze accepted input and regenerate final Chapter 4 tables
  with provenance, coverage and limitations.

Evidence: [analytics status](ANALYTICS.md), [business review](../outputs/business_analytics_review_20261007/REVIEW.md),
[fact19 direct receipt](../outputs/descriptive_validation/2026-10-07T06-58-17-441Z/evidence.json),
[technical publication audit](../outputs/publication_readiness/2026-10-07T06-01-15-273Z/README.md).
The publication audit predates the populated local master and cannot certify those new bytes.

## Diagnostic — what accounts for change, and why

- [x] Define 40 diagnostic questions, methods, evidence owners and limitations.
- [x] Produce scoped contribution, concentration, adjustment, provenance,
  eligible-margin and STL evidence in the version17 analytical package.
- [x] Implement Change investigation, matched current/prior scopes, signed
  product/area/buyer/month contributions, ledger lineage and evidence export.
- [x] Record 12 passing drill-down browser tests and 65 passing broader isolated
  browser checks on 5 October; fixtures establish local behavior only.
- [ ] Data Analyst: finish DQ13 area/product/buyer composition and DQ19
  discount/cost/formula investigation; refresh version17 extracts for accepted input.
- [ ] Finance/product owners: resolve DQ18 verified price/quantity/mix and DQ27
  business-event duplication evidence; unique source IDs alone do not settle either.
- [ ] External reviewers: approve territory-month joins before DQ30–DQ34
  disease/weather association work.
- [ ] Sales, inventory, delivery and procurement owners: supply contract,
  availability, delays, lead-time, expiry and account evidence for DQ35–DQ40.
- [ ] QA/operator: execute live authenticated diagnostic SQL, reconciliation and
  dashboard-to-ledger flows against fact19. The 5 October warehouse limitation
  is historical; later descriptive SQL success does not verify diagnostic SQL.
- [ ] Operator/security QA: apply and verify audit migration016 in PostgreSQL
  before relying on its remote durability/concurrency behavior in deployment.

Evidence: [question status register](../outputs/diagnostic_data_20261003/QUESTION_STATUS.md),
[diagnostic contract](DIAGNOSTIC_ANALYTICS.md), [drill-down checks](../outputs/remediation-drilldown-20261005/README.md).
Contribution arithmetic identifies where a difference occurs; underlying causes
stay unverified until supporting records are reviewed.

## Predictive — what may happen

- [x] Implement transparent last-value, seasonal-naive and 3/6-month mean benchmarks.
- [x] Run four benchmarks, two ETS and nine Prophet configurations using
  time-ordered development evaluation and a 2025 retrospective audit.
- [x] Persist candidate evaluation evidence with exact readback; do not move the
  model-release pointer. The frozen experiment uses fact16, not a fresh fact19 run.
- [x] Report errors and suppress unsupported intervals. Last-value development
  WAPE is 83.20%; 2025 retrospective-audit WAPE is 37.76%. No challenger passes
  promotion criteria and no model is activated.
- [ ] Product/source owners: establish a documentary-verifiable medical pilot
  with approved sellable SKU, package, historical source unit and quantity history.
- [ ] Data Analyst: independently evaluate classification on a representative
  reviewed set, including unresolved/nonmedical cases and false identity merges.
- [ ] Data Analyst: evaluate SKU-unit forecasts at actual supported leads against
  naive/seasonal-naive baselines, with error, bias, sample counts and provenance.
- [ ] Source owner: supply newer accepted history or defensible recency/lead
  evidence. Archived original-source quantity candidates end December2023;
  company-revenue history ends December2025. Neither supplies 2026 actuals.
- [ ] Model reviewer/operator: accept target-specific accuracy and interval
  support, bind the release identity, and verify published API/UI outputs.
- [ ] External reviewers/Data Analyst: approve joins, origin-known availability
  and repeatable improvement before adding DOH/PAGASA/NASA proxy features.

Evidence: [actual evaluation](../outputs/predictive_validation/2026-09-27T14-30-12-921Z/REVIEW.md),
[predictive operations](PREDICTIVE_OPERATIONS.md), [pilot plan](AI_PRODUCT_CLASSIFICATION_IMPLEMENTATION_PLAN.md).
Company-PHP forecasting errors do not establish medical SKU quantity accuracy.

## Prescriptive — what action to consider

- [x] Implement historical shortlist plus explicit entered planning assumptions;
  only closed Manila months qualify and All is the default buyer scope.
- [x] Validate missing/invalid numbers, duplicate products, exact cents, integer
  packs, budget/reserve constraints and infeasible handling.
- [x] Return unfinished bounded allocation as `not_solved`, with no completed
  allocation rows. Preserve human review and scenario disclosures.
- [x] Record 13 passing focused tests and 1,000 deterministic scenarios on
  7 October. These are fixture/synthetic checks, not live stock observations.
- [ ] Inventory owner: publish timestamped stock, on-order, commitments and expiry.
- [ ] Procurement/finance owners: publish supplier lead times, order packs/MOQ,
  costs, service-level targets and approved stock/expiry policies.
- [ ] Data Analyst/backend owner: connect accepted unit forecasts to those inputs
  and evaluate pack-rounded stock-aware draft orders and binding constraints.
- [ ] QA/business reviewer: validate live scenario flows, sensitivity, historical
  decision outcomes and reviewer acceptance before operational use.

Evidence: [planning QA](../outputs/business_analytics_review_20261007/planning_final_qa.md),
[external/planning assessment](../outputs/business_analytics_review_20261007/EXTERNAL_PLANNING_FINDINGS.md).
Current allocation is greedy: it does not establish optimal procurement, observed
stock gaps, approved EOQ/ROP/safety stock or purchase authorization.

## Next delivery sequence

| Order | Owner | Concrete exit evidence |
|---:|---|---|
| 1 | QA/operator + finance | Same-release fact19 authenticated API/UI/export checks; recorded reporting acceptance |
| 2 | Product/source owners + Data Analyst | Reviewed pilot SKU/category/unit/history; representative classification evaluation set |
| 3 | Database Engineer/operator | Complete retained recovery bundle and isolated restoration rehearsal before catalog execution |
| 4 | Data Analyst/model reviewer | Accepted SKU-unit baseline comparison at supported leads; version-bound model decision |
| 5 | Inventory/procurement owners | Operational input publication and evaluated stock-aware draft orders |
| 6 | External reviewers/Data Analyst | Approved, origin-safe external joins and measured incremental predictive value |

Catalog draft preparation against predecessor19 is now implemented: the descriptor
captures 144 columns, 140 immutable fields and 29 dependency versions. The local
master has 4,561 pending rows and zero category/identity/unit/forecast approvals.
The package explicitly remains `ready_for_execution=false`; dependency retention
and restoration rehearsal are unverified. See [current deployment runbook](CATALOG_DEPLOYMENT.md).
Draft publication cannot itself grant product approvals.

Update a checkbox only when its stated evidence exists. Bind new receipts to their
actual release; preserve earlier reports rather than rewriting their outcomes.
