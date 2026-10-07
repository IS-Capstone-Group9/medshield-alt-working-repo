# Dashboard Design Logic

> **Current boundary:** The dashboard presents 2017-2025 sales evidence from Databricks Gold, separately labeled external observations, baseline forecast validation, and planning scenarios. See [Current State](../CURRENT_STATE.md).

## Design goals

- Answer a business question on each page.
- Use one source and denominator for related cards, charts, and tables.
- Keep observed, mapped, estimated, proxy, forecast, and scenario evidence visibly distinct.
- Keep candidate status and data freshness visible.
- Respond to period/product/area/buyer filters without stale chart state.
- Show explicit loading, empty, blocked, infeasible, and unavailable states.

## Page responsibilities

| Page/module | Question | Evidence |
|---|---|---|
| Overview | What is the current historical evidence and source status? | Databricks summaries and status |
| Sales diagnostics | What patterns and data-quality limits exist? | Gold facts, monthly/yearly views, heatmap |
| Area prioritization | Which mapped territories deserve commercial review? | Fact-derived geography/buyer mappings and 60/40 commercial score |
| Product prioritization | Which products dominate eligible historical value? | Gold products/facts and deterministic Pareto/ABC |
| Forecast validation | How do transparent baselines perform? | Gold history and time-aware backtests |
| External regression | Are approved disease/weather joins available? | Blocked until mapping gates pass |
| Weather validation | What official/proxy observations exist? | PAGASA and NASA POWER Gold views |
| Prescriptive planning | What happens under entered constraints? | Databricks shortlist plus user assumptions |

## Interaction rules

- All Time uses observed 2017-2025 sales; the display grain may become yearly for performance.
- Period changes recompute every dependent number from the same scoped dataset.
- Buyer-sector and geography labels expose their derived mapping basis.
- A source failure clears/hides analytical content and shows the unavailable panel.
- The dashboard never trains a model or calls NASA directly.

## Performance rules

- Cache identical bounded Databricks queries for the configured short TTL.
- Limit concurrent warehouse statements.
- Prefer pre-aggregated Gold views for overview charts and query the fact only for necessary drill-down.
- Paginate transaction evidence.
- Avoid rendering or transferring all fact rows for All Time views.
