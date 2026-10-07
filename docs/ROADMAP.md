# Roadmap

Last reviewed: 2026-09-25

| Order | Milestone | Exit evidence | Status |
|---:|---|---|---|
| 1 | Gold data acceptance | Reconciliation, hashes, mapping exceptions, 2025 allocation totals, named reviewer decisions | In progress; candidate pipeline passes technically |
| 2 | Stable dashboard publication | Approved Databricks views, unchanged API contract, fail-closed verification | Candidate views live; approval open |
| 3 | Descriptive analytics freeze | Reproducible KPIs, period completeness, Pareto/ABC, territory and buyer mapping limitations | Implemented in parts; final evidence refresh required |
| 4 | Predictive baseline evaluation | Seasonal-naive/last-observation benchmarks, rolling validation, MAE/RMSE/WAPE/bias | Baseline API available; model approval open |
| 5 | External-regressor evaluation | Approved territory-month joins and proof of improvement over sales-only baseline | Blocked by mapping/publication gates |
| 6 | Prescriptive scenarios | Visible inputs, feasible/infeasible handling, human review, no purchase execution | Scenario solver available; operational inputs absent |
| 7 | Capstone acceptance | Complete E2E evidence, Chapters 4-5, limitations, reviewer sign-off | Pending final data/model acceptance |
| 8 | Deployment | Selected host, secrets, monitoring, rollback, and cost owner | Optional; AWS is not required for analytics completion |

The next milestone is data acceptance, not another platform migration.
