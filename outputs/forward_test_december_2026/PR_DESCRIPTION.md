## Summary

Merges `medshield/update_05` into `main`: 26 commits covering the Databricks warehouse and intake work, dashboard
simplification, and the 11 November analytics and model-assessment work.

### Dashboard and gateway
- Overview: dashed, chart-only estimates for months with missing records (never in totals, tables or exports).
- Forecast: routine vs large-order sales split (`/api/sales/sales-streams`, reconciled to the cent) and large-order frequency by channel.
- Territory: rainfall severity (RSI, NASA proxy) by area (`/api/sales/territory-signals`); DII withheld until the DOH territory mapping is approved.
- Products: family ABC–XYZ, candidate (`/api/sales/family-abc-xyz`, decision 015), read from a hash-pinned mapping table.
- Optional warehouse source for sales facts; refuses a stale release (decisions 013–014).
- Every new route returns an explicit 503 with no substitute values if its source is missing or inconsistent.

### Analysis (offline, retrospective, pre-registered)
- D3 large-order split: routine sales about 37–38% lead-1 WAPE vs 49.7% total, but the split total fails the win rule.
- Models 1–5 (ranges, safety stock, ABC–XYZ, TSB, reconciliation): none improves accuracy at label level.
- Product-family mapping v1.1: ABC–XYZ stability 52% → 82%, above a random-grouping null (60%); AI-assisted spot check 48/48 after v1.1. Not expert-validated.
- Large-order frequency: weak guide to timing, amounts unpredictable.

### Not included
No model activation, forecast approval, stock rule or procurement basis. mean_6 stays the selected reference.

## Test plan
- [x] Gateway suite 641/641
- [x] Frontend type check, lint, script-binding check
- [x] New panels rendered with live gateway data at 1440 and 390 px
- [ ] Open Overview, Forecast, Territory and Products on the signed-in dashboard
- [ ] CI green on this PR

## Open items
- Catalog-owner confirmation of the family mapping and generic names for the top 100 families
- DOH territory mapping approval (for DII)
- Forward test: December 2026 issue (runbook in `outputs/forward_test_december_2026/README.md`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
