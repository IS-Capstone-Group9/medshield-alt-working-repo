# Sales drill-down and diagnostic investigation

Implemented 5 October 2026. Accountable role: Orchestrator, with Backend, Frontend, Security and independent Code Review support. This implementation follows the evidence distinctions in [DIAGNOSTIC_ANALYTICS.md](DIAGNOSTIC_ANALYTICS.md).

## Workflow

Select an observed point in the sales, growth, monthly movement, overview sales/profit or calendar chart. Product bars and product table controls retain the canonical reporting group and selected category. Area/buyer charts open recorded contributions with their product, category, region and buyer filters; estimated geography bars have no transaction drill-down. Geographic table controls use the approved territory mapping. The STL residual control opens its own recorded month independently of the dashboard date filter.

The **Sales Diagnostics → Change investigation** tab shows selected dates against the same dates one year earlier. February 29 clamps to February 28 in the prior year. Custom partial boundaries remain exact. Last-N-month windows keep their monthly boundaries even when displayed yearly. The company-sales shortcut deliberately uses dashboard dates only; chart/table selections supply their own dimensions.

The signed month, product, raw-area and buyer-sector partitions use every group, before chart ranking or table pagination. Each reconciles to the same matched eligible net-sales difference. Negative offsets stay negative; contribution percentages can exceed 100% and are unavailable when the net difference is zero. Missing company months stay unavailable and are excluded from both sides. A group absent inside an observed matched company month contributes an accounting zero. Multi-year comparisons are two explicitly overlapping selected windows where applicable, not a sum of annual growth rates.

Inspect a group to narrow the investigation, or use **Back one level**. Current/prior transaction controls carry exact dates and dimensions into **View Sales Data**, including paging and summary requests. They reset fuzzy search, quality and year filters. Clear the investigation filters to resume normal browsing, or return to the investigation. The full ledger shows record ID, workbook, source layout, actual row number, reporting group, transaction provenance and file hash. A layout identifier is not claimed to be a worksheet name.

Raw transaction totals include retained records outside the matched financial cohort, so they need not equal diagnostic totals. The UI discloses this distinction and financial eligibility. A release change between chart, investigation and ledger blocks the evidence view and requires refresh. Failed loads clear stale values and offer retry; old responses cannot replace a newer scope.

## Root-cause meaning and export

Verified arithmetic locates the recorded change. Contract/buyer changes, price/mix, stock/supplier constraints and disease/weather effects remain **unverified / needs evidence**. The view lists the independent documents or joins needed to investigate each. It does not infer a stockout, disease effect, comparable medicine quantity, or price/volume mechanism from sales alone.

The JSON export includes every contribution group, exact current/prior dates, financial eligibility, gaps, release identity, limitations, and unverified investigation notes/evidence references/review owner. Notes persist while changing table dimensions/pages but are not stored on the server and reset when the investigation scope changes.

## API and operational dependencies

Authenticated `GET /api/sales/diagnostics` requires `start_date` and `end_date` (`YYYY-MM-DD`, 2017 onward). Optional scalar filters: `product_id` (`RAW:`/`SKU:` canonical group), `area` (normalized source reporting area), `sector` (`All`, `Government`, `Private`, `Internal`, `Unknown`), approved `region`/`territory`, and `category` (`All`, `Medical`, `Non-Medical`, `Unclassified`). Invalid inputs return 400. Warehouse failures remain visible; there is no local analytical fallback.

The same optional filters are supported by `/api/sales/transactions` and `/api/sales/summary`; date endpoints must be supplied together. SQL binds external values and pins the fact and mapping identity to the selected release. Complete grouped query results are required; truncation/warehouse failures cannot become top-N contribution totals.

Production requires configured Supabase authentication and never accepts local demo sessions. Audit persistence requires migration [016_durable_audit_chain.sql](../supabase/migrations/016_durable_audit_chain.sql) for the remote atomic chain. Until applied, truthful local fallback is discoverable. Local audit files serialize within one gateway process; configure `MEDSHIELD_AUDIT_LOG_PATH` separately per process on durable storage. Exhausted persistence returns 503. See [SECURITY.md](SECURITY.md).

Legacy ingestion accepts later source years for review. Historical snapshots use dated transactions on or before today's Philippine date; planning uses the latest closed Philippine month. Legacy normalization filters series-only future periods, but rejects undated aggregate snapshots containing excluded periods because their totals, area/product and seasonality values cannot be safely reconstructed. Rebuild those from dated historical source rows. The active dashboard continues to use Databricks.

## Acceptance evidence

The focused diagnostic browser suite exercises actual chart runtime, panel, API serialization and ledger controls against deterministic boundary fixtures. Backend tests independently check eligibility, signed reconciliation, missing-versus-absent data, leap days, bound SQL parameters, release pinning and failure states. Fixtures are test inputs and are never installed as runtime fallback data.

See [remediation evidence](../outputs/remediation-drilldown-20261005/README.md) for executed checks. Live Databricks SQL and PostgreSQL/PostgREST migration execution are separate operational checks; their unavailability must not be counted as a pass.
