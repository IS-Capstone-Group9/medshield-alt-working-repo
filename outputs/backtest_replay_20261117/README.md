# Backtest replay: what MedShield would have said vs what happened — 17 November 2026

Offline, retrospective **demonstration** (`run.py`; rerun with any month: `python -X utf8 outputs/backtest_replay_20261117/run.py 2024-08`).
It uses only data known at the time, but the methods were chosen with later data in view, so this illustrates
behaviour. It is not new accuracy evidence. Company eligible net, PHP.

| | August 2024 | September 2025 | July 2026 |
|---|---|---|---|
| **Risk calendar** | High: ILI, dengue, leptospirosis, chikungunya; rainy; 9 typhoons in this month (2021–24) | High: ILI, SARI, dengue, leptospirosis; 14 typhoons | High: dengue, typhoid, chikungunya; wettest month |
| **Forecast before the month (mean_6)** | ₱2.60M | ₱6.11M | ₱12.18M |
| **Day-20 estimate** | ₱2.05M | ₱17.92M | ₱29.50M |
| **Actual** | **₱2.74M** | **₱16.18M** | **₱24.69M** |
| Forecast error | −4.9% | −62.2% | −50.7% |
| Day-20 error | −24.9% | **+10.7%** | **+19.5%** |
| Stock policy: families covered / value covered | 97.4% / 87.7% (190 families) | 85.2% / 66.7% (88) | 91.1% / 92.9% (112) |
| Government large-order range vs actual | ₱0–2.91M vs ₱0 (inside) | ₱0–3.05M vs ₱3.43M (**just above**) | ₱0–6.13M vs ₱6.19M (**just above**) |

## What it shows

- **Routine months (August 2024):** the simple forecast was close (−4.9%). The day-20 estimate was worse here because
  late-month deliveries were heavier than usual. Stock levels covered 97% of families.
- **Tender months (September 2025, July 2026):** large orders made the month 2–2.6× the forecast. **The day-20 estimate
  caught most of it (+11% / +20% instead of −62% / −51%).** This is the case the mid-month estimate is for.
- **Stock policy** covered 85–97% of families. Value covered fell to 67% in September 2025, when large orders hit
  erratic families: stock cannot cover those orders, readiness has to.
- **Government readiness range:** two of three months landed just above the 90th percentile. The range is a floor for
  readiness, not a cap. It passed its coverage rule overall (78–79%).
- **The risk calendar flagged all three as high-risk months.** As tested elsewhere, high risk did not mean higher sales.

## Use in the defense

Run the script for any month a panel member names and show the table. It demonstrates every layer in one place:
calendar, forecast, mid-month correction, stock policy and readiness.
