# Analytics

## Published dashboard evidence

MedShield serves analytics only from Databricks Gold. The live contract currently supports:

| View | Databricks evidence | Method |
|---|---|---|
| Annual and monthly sales | Gold yearly/monthly candidate views | Descriptive totals and trends |
| Area performance | Gold area-year candidate view | Revenue and gross-profit ranking |
| Product performance | Gold product-year candidate view | Revenue ranking and derived ABC/Pareto classes |
| Transaction ledger | Gold sales fact | Filtered, paginated sales evidence and quality lineage |
| Product quantity heatmap | Gold sales fact | Observed delivered source units; missing months remain missing |
| Sales-only forecast validation | Gold sales fact | Seasonal-naive and last-observation baselines |
| Planning shortlist | Gold sales fact | Top positive-revenue products in the latest 12 observed months |
| PAGASA validation | Gold external-signals candidate view | Monthly source observations and mapping status |

The browser never loads a local sales snapshot. If a Databricks contract fails, the UI displays an unavailable state.

## Unpublished analytics

The following outputs remain unavailable until approved Databricks inputs or model views exist:

- Government/Private buyer-sector splits
- DOH/PAGASA-to-sales regression
- Official champion forecasts
- Inventory-aware EOQ, reorder points, or safety stock
- MCDA vulnerability rankings
- Product-region recommendation models
- Automated procurement or clinical recommendations

Unknown fields remain null or empty. The application does not infer ownership from hospital names, treat geography as ownership, convert missing weather fields to zero, or fabricate model scores.

## Metric definitions

- **Net sales revenue:** the Databricks Gold candidate net-contract measure.
- **Gross profit:** the Databricks Gold candidate gross-margin amount before operating expenses.
- **Gross margin %:** aggregate gross profit divided by aggregate net sales.
- **Delivered quantity:** source units recorded on accepted transactions; quantities across different products are not interchangeable.
- **Observed month:** a month with an accepted source record. Missing observations are not zero demand.

## Model and planning labels

Forecast baselines are transparent comparison methods and remain drafts. External regression returns a blocked response while territory mappings are pending. Planning allocations use Databricks for historical product ranking and require the user to enter demand, stock, reserve, pack, cost, supplier, and budget assumptions. Results are review scenarios, never purchase orders.

## Publication checklist

Before exposing another chart or recommendation:

1. Publish the required source and model output in Databricks Gold.
2. Define the grain, eligibility flags, date window, metric units, and null behavior.
3. Add an authenticated gateway query with bounded parameters and row limits.
4. Render provenance, checksum, scope, and limitations in the UI.
5. Add a fail-closed test proving a Databricks failure cannot expose local or mock data.
