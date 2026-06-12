# Architectural Decisions

## 001. Use a TypeScript API Gateway

Context:
- The dashboard needs a stable HTTP layer for auth, orchestration, and fallback behavior.
- The analytics workloads are already modeled as Python services.

Decision:
- Keep the backend gateway in TypeScript under `backend/`.
- Keep analytics and product services in Python under `services/`.

Consequences:
- The frontend talks to one API layer with consistent JSON contracts.
- Analytics logic stays isolated in Python where it belongs.
- The stack is easier to explain in the capstone because each layer has a single responsibility.

## 002. Use a Warehouse Plus DSS Model-Output Layer

Context:
- `supabase/schema.md` showed older flat `analytics_*` tables alongside the connected warehouse tables.
- The capstone paper requires more than dashboard aggregates: ABC/Pareto, K-Means, Prophet with external regressors, XGBoost urgency scoring, EOQ/ROP/safety stock, MCDA, linear programming, collaborative filtering, and rule-based alerts.
- `Sales Report.xlsx` is transaction-grain data for 2021-2025, while DOH and PAGASA/OpenWeather signals are external supporting inputs.

Decision:
- Keep the connected warehouse tables from `001_init.sql`.
- Drop obsolete `analytics_*` prototype tables in `004_dss_schema.sql`.
- Add source/model dimensions, transaction staging, normalized transaction facts, external signal facts, model output facts, ETL lineage tables, and `vw_dss_*` API views.

Consequences:
- The dashboard can still read existing `vw_dashboard_*` views.
- The DSS can expose paper-aligned model outputs through stable API endpoints.
- External signals are traceable by source, period, and ETL run.
- The data pipeline has a clear path from raw workbook/API extracts to warehouse facts, model outputs, and frontend decisions.
