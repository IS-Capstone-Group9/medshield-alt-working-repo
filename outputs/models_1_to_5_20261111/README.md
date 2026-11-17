# Models 1–5 test, 11 November 2026

Accountable Data Analyst; single agent. Offline and read-only; no source, model, runtime or approval changed. Original
itemized sales (contracts excluded, `e87cae21…ff10`, ₱638,015,351.53), window 2020-01 to 2026-09. **Retrospective**:
every month had already been inspected. Design and pass rules are fixed in the `run.py` docstring (registration SHA-256
`597d78f10ca3…`, full hash in `results.json`). "Base" is sales excluding documents of ₱500,000 or more (D3).

| # | Model | Result | Registered rule |
|---|---|---|---|
| M1 | 80% ranges on base mean_6 (recent-24 empirical errors) | Coverage 68.9% / 68.3% / 71.4% at leads 1/3/6; width 116–167% of forecast | **Not met** (needs 75–85% mean) |
| M2 | Safety stock at 95% (forecast + 95th-percentile error) | Achieved 82.2% of months; buffer ≈ 100% of forecast | **Not met** (needs 90–98%) |
| M3 | ABC–XYZ at product-key grain | A-X items kept 52% of their value next year on average (89%, 34%, 55%, 30%); A-Z items 7–146% | Met narrowly; unstable by year |
| M4 | TSB vs mean_6, 366 intermittent products, lead 1 | TSB WAPE 183.7%, bias +77%; mean_6 133.7%, bias +19% | **Not met**; TSB much worse |
| M5 | OLS / WLS reconciliation, company + 9 area nodes | Identical to unreconciled (49.7% total, 65.1% areas) | **Not met**: no change |

## Readings

- **M1, M2:** the errors are larger than recent history suggests, so ranges and buffers built from them are too narrow.
  This matches PD3, which needed volatility scaling to reach coverage. A buffer around 100% of forecast reaching only
  82% of months shows that PHP-level safety stock for the whole company is not usable. It needs unit-level, product-family data.
- **M3:** only 7–9 products are A-X in any year, and in 2023 almost every A item was Z (298 of 302). Product-label churn
  dominates, so the classes have to be built on stable product families before they guide stock policy.
- **M4:** TSB keeps forecasting discontinued labels, which drives its +77% bias. Product-level intermittent forecasting
  depends on a product-family mapping first.
- **M5:** mean_6 is linear, so area forecasts already add up exactly to the company forecast and reconciliation has
  nothing to fix. It is only useful once nodes use different, non-linear methods. Correct, but no gain.

## Conclusion

None of the five improves accuracy on this data. Two shared blockers explain most failures: no stable product-family
mapping (M3, M4) and no unit-level or order-timing data (M1, M2). mean_6 stays the selected reference. Nothing is activated.
